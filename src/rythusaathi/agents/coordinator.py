"""Coordinator Agent: Synthesizes validated specialist findings into a grounded advisory."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import re
from typing import Sequence
import uuid

from agent_framework import Executor, handler, WorkflowContext

from ..domain import (
    AgentFinding,
    AgentId,
    AgriculturalRecommendation,
    BoardState,
    EvidenceMode,
    EvidenceRecord,
    EvidenceSourceType,
    FactState,
    RecommendationCategory,
    RecommendationSupport,
    ResolutionStatus,
    RiskSeverity,
)
from ..inference import (
    InferenceDiagnostic,
    InferenceDiagnosticCode,
    InferenceStage,
    ProviderFailure,
    ProviderFailureKind,
)
from ..inference.providers.groq import estimate_input_tokens
from .base import (
    _now,
    _record_finding,
    _model_statements,
    _inference_status,
    _rank_and_deduplicate_evidence,
    _merge_overlapping_excerpt,
    _COORDINATOR_PROMPT,
    _COORDINATOR_OUTPUT_RESERVATION_TOKENS,
    _GEMINI_COORDINATOR_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_COORDINATOR_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_COORDINATOR_MINIMUM_RESERVATION_TOKENS,
    _COORDINATOR_CONTEXT_SAFETY_MARGIN_TOKENS,
    _COORDINATOR_PREFERRED_INPUT_TOKENS,
    _UNGROUNDED_MARKET_TREND_PATTERN,
    _UNSUPPORTED_AGRONOMIC_RECOMMENDATION_PATTERN,
)
from .contracts import (
    AdvisoryResponse,
    AdvisoryStatus,
    AgentExecution,
    AgentResult,
    AgentStatus,
    CoordinatorPayload,
    GeneratedStatement,
    IntakePayload,
    ProviderPayload,
    RetrievalPayload,
    RiskAlertPayload,
    WorkflowMode,
)
from .llm import (
    CoordinatorDraft,
    GroundedStatement,
    WorkflowInference,
    call_structured,
    make_json_request,
    validate_evidence_ids,
)


def _format_evidence(evidence: EvidenceRecord) -> str:
    excerpt = (evidence.excerpt or "").replace("\n", " ").strip()
    if len(excerpt) > 620:
        excerpt = excerpt[:617].rstrip() + "..."
    reference = evidence.source.reference.value
    label = f"[{evidence.evidence_id}] {evidence.source.title} — {reference}"
    return f"- {label}\n  {excerpt}"


def _coordinator_agent_prompt_result(item: AgentResult) -> dict[str, object]:
    """Send either generated claims or a fallback summary, never both copies."""
    generated = tuple(getattr(item.payload, "generated_statements", ()))
    if generated:
        return {
            "generated_statements": [
                {
                    "text": statement.text,
                    "kind": statement.kind,
                    "evidence_ids": list(statement.evidence_ids),
                }
                for statement in generated
            ],
        }
    if isinstance(item.payload, RetrievalPayload):
        summary = item.payload.note
    elif isinstance(item.payload, ProviderPayload):
        if item.evidence_ids:
            summary = f"Observation published to board under [{', '.join(item.evidence_ids)}]."
        else:
            summary = item.payload.summary
    elif isinstance(item.payload, RiskAlertPayload):
        if item.payload.alerts:
            summary = "; ".join(
                f"[{a.severity.value.upper()}] {a.title}: {a.explanation}"
                for a in item.payload.alerts
            )
        else:
            summary = "No active risks."
    else:
        summary = item.error.message if item.error else "No additional result."
    return {"summary": summary}


def _coordinator_citation_catalog(
    items: Sequence[EvidenceRecord],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    """Build compact provenance-preserving catalogs for Coordinator citations.

    The paired ``retrieved_evidence`` prompt field carries the full eligible
    excerpts.  These catalogs preserve stable source provenance and scope
    without duplicating those excerpts.
    """
    sources: dict[str, dict[str, object]] = {}
    evidence_catalog: list[dict[str, object]] = []
    for item in _rank_and_deduplicate_evidence(items):
        source = item.source
        prov = (
            source.source_identity[:20]
            if len(source.source_identity) > 20
            else source.source_identity
        )
        title = source.title[:30] if len(source.title) > 30 else source.title
        sources.setdefault(
            source.source_id,
            {
                "source_id": source.source_id,
                "source_title": title,
                "source_reference": source.reference.value,
                "source_provenance": prov,
            },
        )
        page_or_sec = item.page_or_section
        if page_or_sec:
            page_or_sec = page_or_sec.split("; official")[0].strip()
            if len(page_or_sec) > 15:
                page_or_sec = page_or_sec[:15].strip()
        evidence_catalog.append({
            "evidence_id": item.evidence_id,
            "source_id": source.source_id,
            "content_reference": (
                item.content_reference.value if item.content_reference is not None else None
            ),
            "page_or_section": page_or_sec,
            "mode": item.mode.value,
            "quality_notes": [
                note
                for note in (item.quality_notes or ())
                if note.startswith("Source reliability")
            ][:1],
            "geographic_applicability": list(item.geographic_applicability or ()),
            "crop_applicability": list(item.crop_applicability or ()),
        })
    return list(sources.values()), evidence_catalog


def _coordinator_retrieved_evidence(items: Sequence[EvidenceRecord]) -> list[dict[str, object]]:
    """Pack exact source passages once, sharing source metadata via the catalog."""
    grouped: dict[str, list[dict[str, object]]] = {}
    for item in _rank_and_deduplicate_evidence(items):
        source_id = item.source.source_id
        content_reference = (
            item.content_reference.value if item.content_reference is not None else None
        )
        passages = grouped.setdefault(source_id, [])
        raw_excerpt = item.excerpt or ""
        excerpt = re.sub(r"\s+", " ", raw_excerpt).strip()
        for passage in passages:
            if passage["content_reference"] != content_reference:
                continue
            merged = _merge_overlapping_excerpt(str(passage["excerpt"]), excerpt)
            if merged is not None:
                passage["excerpt"] = merged
                if item.evidence_id not in passage["evidence_ids"]:
                    passage["evidence_ids"].append(item.evidence_id)
                break
        else:
            passages.append({
                "content_reference": content_reference,
                "evidence_ids": [item.evidence_id],
                "excerpt": excerpt,
            })
    return [
        {
            "source_id": source_id,
            "passages": [
                {
                    "evidence_ids": passage["evidence_ids"],
                    "excerpt": passage["excerpt"],
                }
                for passage in passages
            ],
        }
        for source_id, passages in grouped.items()
    ]


def _coordinator_remaining_tpm(inference: WorkflowInference | None) -> int | None:
    """Read only the latest sanitized local budget counter, when available."""
    records = getattr(inference, "usage_records", ())
    try:
        iterator = reversed(tuple(records))
    except TypeError:
        return None
    for usage in iterator:
        remaining = getattr(usage, "budget_remaining_tokens", None)
        if isinstance(remaining, int) and not isinstance(remaining, bool) and remaining >= 0:
            return remaining
    return None


def _specialist_cited_evidence_ids(results: Sequence[AgentResult]) -> set[str]:
    """IDs that cannot be removed because a validated specialist cited them."""
    return {
        evidence_id
        for result in results
        for statement in tuple(getattr(result.payload, "generated_statements", ()))
        if statement.kind in {"evidence", "interpretation"}
        for evidence_id in statement.evidence_ids
    }


def _conflict_supported_evidence_ids(
    findings: Sequence[AgentFinding], conflicts: Sequence[object]
) -> set[str]:
    """Keep evidence behind unresolved conflicts when compacting a prompt."""
    conflicted_finding_ids = {
        finding_id
        for conflict in conflicts
        for finding_id in getattr(conflict, "finding_ids", ())
    }
    return {
        evidence_id
        for finding in findings
        if finding.finding_id in conflicted_finding_ids
        for evidence_id in finding.evidence_ids
    }


@dataclass(frozen=True, slots=True)
class _CoordinatorContextPack:
    payload: dict[str, object]
    estimated_input_tokens: int
    remaining_tpm_tokens: int | None
    available_input_tokens: int | None
    input_limit_tokens: int
    selected_evidence_ids: tuple[str, ...] = ()
    excluded_evidence: tuple[tuple[str, str], ...] = ()
    mandatory_evidence_ids: tuple[str, ...] = ()

    @property
    def fits_budget(self) -> bool:
        return (
            bool(self.selected_evidence_ids)
            and self.estimated_input_tokens <= self.input_limit_tokens
        )


def _build_coordinator_context(
    *,
    farmer_question: str,
    crop: str,
    location: str,
    growth_stage: str,
    intake_payload: IntakePayload | None,
    branch_results: Sequence[AgentResult],
    eligible_evidence: Sequence[EvidenceRecord],
    missing_fields: Sequence[str],
    conflicts: Sequence[object],
    remaining_tpm_tokens: int | None,
    findings: Sequence[AgentFinding] = (),
    coordinator_output_reservation: int = _COORDINATOR_OUTPUT_RESERVATION_TOKENS,
    missing_questions: Sequence[str] = (),
    coordinator_preferred_input_tokens: int = _COORDINATOR_PREFERRED_INPUT_TOKENS,
) -> _CoordinatorContextPack:
    """Build and measure the whole Coordinator request using relevance selection."""
    ranked_evidence = _rank_and_deduplicate_evidence(eligible_evidence)

    available = (
        max(
            0,
            remaining_tpm_tokens
            - coordinator_output_reservation
            - _COORDINATOR_CONTEXT_SAFETY_MARGIN_TOKENS,
        )
        if remaining_tpm_tokens is not None
        else None
    )
    input_limit = min(
        coordinator_preferred_input_tokens,
        available if available is not None else coordinator_preferred_input_tokens,
    )

    specialist_cited = _specialist_cited_evidence_ids(branch_results)
    conflict_cited = _conflict_supported_evidence_ids(findings, conflicts)
    mandatory_ids = specialist_cited | conflict_cited

    mandatory_records = [item for item in ranked_evidence if item.evidence_id in mandatory_ids]
    optional_records = [item for item in ranked_evidence if item.evidence_id not in mandatory_ids]

    def _pack_for(items: Sequence[EvidenceRecord]) -> tuple[dict[str, object], int]:
        source_catalog, evidence_catalog = _coordinator_citation_catalog(items)
        payload: dict[str, object] = {
            "farmer_question": farmer_question,
            "confirmed_context": {
                "crop": crop,
                "location": location,
                "growth_stage": growth_stage,
            },
            "intake_observations": (
                list(intake_payload.observations)
                if isinstance(intake_payload, IntakePayload)
                else []
            ),
            "farmer_described_problem_phrase": (
                intake_payload.farming_problem
                if isinstance(intake_payload, IntakePayload)
                else None
            ),
            "agent_results": [
                {
                    "agent_id": item.agent_id.value,
                    "status": item.status.value,
                    **_coordinator_agent_prompt_result(item),
                }
                for item in branch_results
            ],
            "retrieved_evidence": _coordinator_retrieved_evidence(items),
            "source_catalog": source_catalog,
            "evidence_catalog": evidence_catalog,
            "missing_information": list(missing_fields),
            "missing_context_questions": list(missing_questions),
            "conflicts": _conflict_prompt_summaries(conflicts),
        }
        request = make_json_request(
            _COORDINATOR_PROMPT,
            payload,
            CoordinatorDraft,
            agent_name=AgentId.COORDINATOR.value.casefold(),
            max_output_tokens=coordinator_output_reservation,
        )
        return payload, estimate_input_tokens(request.messages)

    if mandatory_records:
        mandatory_payload, mandatory_tokens = _pack_for(mandatory_records)
        if mandatory_tokens > input_limit:
            all_payload, all_tokens = _pack_for(ranked_evidence)
            return _CoordinatorContextPack(
                payload=all_payload,
                estimated_input_tokens=all_tokens,
                remaining_tpm_tokens=remaining_tpm_tokens,
                available_input_tokens=available,
                input_limit_tokens=input_limit,
                selected_evidence_ids=tuple(item.evidence_id for item in ranked_evidence),
                excluded_evidence=(),
                mandatory_evidence_ids=tuple(item.evidence_id for item in mandatory_records),
            )
        selected = list(mandatory_records)
        current_payload = mandatory_payload
        current_tokens = mandatory_tokens
    else:
        all_payload, all_tokens = _pack_for(ranked_evidence)
        if all_tokens <= input_limit:
            return _CoordinatorContextPack(
                payload=all_payload,
                estimated_input_tokens=all_tokens,
                remaining_tpm_tokens=remaining_tpm_tokens,
                available_input_tokens=available,
                input_limit_tokens=input_limit,
                selected_evidence_ids=tuple(item.evidence_id for item in ranked_evidence),
                excluded_evidence=(),
                mandatory_evidence_ids=(),
            )
        if optional_records:
            first_payload, first_tokens = _pack_for([optional_records[0]])
            if first_tokens > input_limit:
                return _CoordinatorContextPack(
                    payload=all_payload,
                    estimated_input_tokens=all_tokens,
                    remaining_tpm_tokens=remaining_tpm_tokens,
                    available_input_tokens=available,
                    input_limit_tokens=input_limit,
                    selected_evidence_ids=tuple(item.evidence_id for item in ranked_evidence),
                    excluded_evidence=(),
                    mandatory_evidence_ids=(),
                )
        selected = []
        current_payload, current_tokens = _pack_for([])

    excluded: list[tuple[str, str]] = []
    for candidate in optional_records:
        candidate_selected = selected + [candidate]
        candidate_payload, candidate_tokens = _pack_for(candidate_selected)
        if candidate_tokens <= input_limit:
            selected = candidate_selected
            current_payload = candidate_payload
            current_tokens = candidate_tokens
        else:
            excluded.append((candidate.evidence_id, "exceeds_coordinator_context_budget"))

    return _CoordinatorContextPack(
        payload=current_payload,
        estimated_input_tokens=current_tokens,
        remaining_tpm_tokens=remaining_tpm_tokens,
        available_input_tokens=available,
        input_limit_tokens=input_limit,
        selected_evidence_ids=tuple(item.evidence_id for item in selected),
        excluded_evidence=tuple(excluded),
        mandatory_evidence_ids=tuple(item.evidence_id for item in mandatory_records),
    )


def _coordinator_supported_evidence_ids(results: Sequence[AgentResult]) -> set[str]:
    """Evidence IDs the Coordinator may cite in its synthesis."""
    ids: set[str] = set()
    for result in results:
        if result.agent_id is AgentId.RISK_ALERT:
            continue
        statements = tuple(getattr(result.payload, "generated_statements", ()))
        cited = _specialist_cited_evidence_ids((result,))
        if cited:
            ids.update(cited)
        elif not statements and result.evidence_ids:
            ids.update(result.evidence_ids)
    return ids


def _conflict_prompt_summaries(conflicts: Sequence[object]) -> list[str]:
    """Preserve conflict awareness without resending generated claims verbatim."""
    return [
        f"Conflicting {getattr(item, 'topic', 'agent')} findings are retained; do not select a cause."
        for item in conflicts
    ]


class CoordinatorAgent(Executor):
    def __init__(
        self,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
        coordinator_reservation: list[float | int] | None = None,
    ):
        super().__init__(id=AgentId.COORDINATOR.value)
        self._inference = inference
        self._mode = mode
        self._coordinator_reservation = coordinator_reservation

    @handler(input=list[AgentExecution], output=AdvisoryResponse)
    async def handle(
        self,
        executions: list[AgentExecution],
        workflow: WorkflowContext[list[AgentExecution], AdvisoryResponse],
    ) -> None:
        response = await self.build_response(executions)
        await workflow.yield_output(response)

    async def build_response(self, executions: list[AgentExecution]) -> AdvisoryResponse:
        coordinator_started = _now()
        if self._coordinator_reservation is not None:
            if callable(getattr(self._inference, "release_reservation", None)):
                self._inference.release_reservation(self._coordinator_reservation)
            self._coordinator_reservation = None
        if not executions:
            raise ValueError("coordinator requires branch agent results")
        case = executions[0].case
        branch_precedence = (
            AgentId.WEATHER,
            AgentId.CROP,
            AgentId.MARKET,
            AgentId.SCHEME,
            AgentId.RISK_ALERT,
        )
        ordered = sorted(
            executions,
            key=lambda item: (
                branch_precedence.index(item.result.agent_id)
                if item.result.agent_id in branch_precedence
                else 99
            ),
        )
        branch_results = tuple(item.result for item in ordered)
        conflicts = case.board.conflicts()
        conflict_text = tuple(
            f"Conflicting {item.topic} findings were retained without selecting a winner: "
            + " / ".join(item.claims)
            for item in conflicts
        )
        evidence = case.board.evidence
        missing = tuple(
            item
            for item in case.context.missing_information
            if item.field_name in {"crop", "location", "growth_stage", "crop_variety"}
        )
        missing_fields = tuple(dict.fromkeys(item.field_name for item in missing))

        failures = [
            result
            for result in branch_results
            if result.status
            in {
                AgentStatus.FAILED,
                AgentStatus.UNAVAILABLE,
                AgentStatus.SKIPPED,
                AgentStatus.CANCELLED,
            }
        ]
        unresolved_coverage = case.resolution.coverage.status is ResolutionStatus.UNSUPPORTED
        if any(item.field_name in {"crop", "location"} for item in missing):
            status = AdvisoryStatus.NEEDS_CLARIFICATION
        elif any(result.status is AgentStatus.CANCELLED for result in branch_results):
            status = AdvisoryStatus.CANCELLED
        elif branch_results and all(r.status is AgentStatus.FAILED for r in branch_results):
            status = AdvisoryStatus.FAILED
        elif (
            failures
            or unresolved_coverage
            or conflicts
            or case.intake_result.status is AgentStatus.PARTIAL
            or any(item.status is AgentStatus.PARTIAL for item in branch_results)
        ):
            status = AdvisoryStatus.PARTIAL
        else:
            status = AdvisoryStatus.COMPLETED

        lines = [f"Understanding: {case.request.query}"]
        lines.append(f"Execution mode: {self._mode.value}.")
        crop_value = (
            case.context.crop.value.display_name
            if case.context.crop.state is FactState.SUPPLIED
            else "not confirmed"
        )
        location_value = (
            case.context.location.value.display_name
            if case.context.location.state is FactState.SUPPLIED
            else "not confirmed"
        )
        stage_value = (
            case.context.growth_stage.value
            if case.context.growth_stage.state is FactState.SUPPLIED
            else "unknown"
        )
        lines.append(
            f"Context: crop {crop_value}; location {location_value}; growth stage {stage_value}."
        )
        intake_payload = case.intake_result.payload
        if isinstance(intake_payload, IntakePayload) and intake_payload.observations:
            lines.append(
                "Reported observations (not diagnoses): "
                + ", ".join(intake_payload.observations)
                + "."
            )
        if isinstance(intake_payload, IntakePayload) and intake_payload.farming_problem:
            lines.append("Farmer-described problem phrase: " + intake_payload.farming_problem + ".")

        crop_result = next(
            (item for item in branch_results if item.agent_id is AgentId.CROP), None
        )
        crop_evidence_ids = set(crop_result.evidence_ids if crop_result else ())
        if crop_evidence_ids:
            lines.append("\nAgricultural source material:")
            for item in evidence:
                if item.evidence_id in crop_evidence_ids:
                    lines.append(_format_evidence(item))
            has_location = case.context.location.state is FactState.SUPPLIED
            clarify_suffix = (
                " Local agronomic recommendations can be refined if you provide your location."
                if not has_location
                else ""
            )
            lines.append(
                f"These excerpts provide context only. Reported symptoms are not enough to establish a cause.{clarify_suffix}"
            )
        elif crop_result:
            crop_note = (
                crop_result.payload.note
                if isinstance(crop_result.payload, RetrievalPayload)
                else crop_result.status.value
            )
            lines.append(f"\nAgricultural knowledge: {crop_note.rstrip('.')}.")

        for agent_id, heading in ((AgentId.WEATHER, "Weather"), (AgentId.MARKET, "Market")):
            result = next((item for item in branch_results if item.agent_id is agent_id), None)
            if not result:
                continue
            lines.append(f"\n{heading}:")
            if result.error is not None:
                lines.append(result.error.message)
                continue
            if result.evidence_ids:
                for item in evidence:
                    if item.evidence_id in result.evidence_ids:
                        lines.append(_format_evidence(item))
                is_fixture = any(
                    item.mode is EvidenceMode.FIXTURE
                    for item in evidence
                    if item.evidence_id in result.evidence_ids
                ) or (getattr(result.payload, "mode", None) is EvidenceMode.FIXTURE)
                if is_fixture:
                    lines.append(
                        "The provider returned fixture data; it is synthetic and must not guide a decision."
                    )
                elif result.status is AgentStatus.PARTIAL:
                    lines.append(
                        "Live provider data was retrieved; specialist interpretation was unavailable."
                    )
            else:
                lines.append(
                    result.payload.summary
                    if isinstance(result.payload, ProviderPayload)
                    else f"Data status: {result.status.value}."
                )

        scheme_result = next(
            (item for item in branch_results if item.agent_id is AgentId.SCHEME), None
        )
        if scheme_result:
            lines.append("\nGovernment schemes:")
            if scheme_result.evidence_ids:
                for item in evidence:
                    if item.evidence_id in scheme_result.evidence_ids:
                        lines.append(_format_evidence(item))
                lines.append(
                    "Eligibility criteria in source excerpts do not establish personal eligibility. "
                    "Confirm current rules and application steps with the issuing authority."
                )
            elif isinstance(scheme_result.payload, RetrievalPayload):
                lines.append(scheme_result.payload.note)

        risk_result = next(
            (item for item in branch_results if item.agent_id is AgentId.RISK_ALERT), None
        )
        if risk_result:
            lines.append("\nRisk alerts:")
            if isinstance(risk_result.payload, RiskAlertPayload):
                active_alerts = [
                    a for a in risk_result.payload.alerts if getattr(a, "is_active", True)
                ]
                if active_alerts:
                    for alert in active_alerts:
                        lines.append(
                            f"- [{alert.severity.value.upper()}] {alert.title}: {alert.explanation} Recommended action: {alert.safe_action}"
                        )
                else:
                    lines.append(f"- {risk_result.payload.summary}")
                    bg_items = getattr(risk_result.payload, "background_vulnerabilities", ())
                    if bg_items:
                        bg_summary = ", ".join(
                            v.title.replace("Background ", "")
                            .replace(" Vulnerability", "")
                            .replace(" Susceptibility", "")
                            for v in bg_items
                        )
                        lines.append(
                            f"- Background agricultural context: Advisory sources document general crop vulnerability to {bg_summary}; routine field scouting recommended if weather or symptoms change."
                        )
            elif risk_result.error:
                lines.append(f"- Risk evaluation error: {risk_result.error.message}")
            else:
                lines.append(f"- Risk status: {risk_result.status.value}.")

        if missing:
            lines.append("\nPlease clarify:")
            for item in missing:
                lines.append(f"- {item.question}")
        if unresolved_coverage:
            lines.append(
                "\nCoverage limitation: the Phase 2 crop/location coverage registry has no validated pair for this selection. "
                "The cited RAG excerpts were still filtered by their own registered crop, geography and stage metadata."
            )
        if conflict_text:
            lines.append("\nUnresolved findings:")
            lines.extend(f"- {item}" for item in conflict_text)
        lines.append("\nSuggested next steps:")
        if missing:
            lines.extend(f"- {item.question}" for item in missing)
        if crop_evidence_ids:
            lines.append(
                "- Share the crop stage and which leaves are affected; confirm any treatment with a local KVK or agriculture officer before changing inputs."
            )
        if (
            risk_result
            and isinstance(risk_result.payload, RiskAlertPayload)
            and risk_result.payload.alerts
        ):
            for alert in risk_result.payload.alerts:
                if (
                    getattr(alert, "is_active", True)
                    and alert.severity in {RiskSeverity.HIGH, RiskSeverity.CRITICAL}
                ):
                    lines.append(f"- [{alert.severity.value.upper()} RISK] {alert.safe_action}")
        if scheme_result and scheme_result.evidence_ids:
            lines.append(
                "- Check current scheme rules and application steps with the issuing authority; this response does not determine personal eligibility."
            )
        if not missing and not crop_evidence_ids and not (scheme_result and scheme_result.evidence_ids):
            lines.append(
                "- Provide crop and location details so the workflow can search applicable source material."
            )
        if status in {
            AdvisoryStatus.PARTIAL,
            AdvisoryStatus.NEEDS_CLARIFICATION,
            AdvisoryStatus.CANCELLED,
        }:
            lines.append(
                "\nThis is a partial advisory. No unavailable external data was filled in with assumptions."
            )

        response_text = "\n".join(lines)
        coordinator_inference_status: str | None = None
        coordinator_interpretation_mode = "deterministic"
        coordinator_statements: tuple[GeneratedStatement, ...] = ()
        if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}:
            provider_title = (
                "Gemini"
                if self._mode is WorkflowMode.GEMINI
                else ("Cerebras" if self._mode is WorkflowMode.CEREBRAS else "Groq")
            )
            supported_evidence_ids = _coordinator_supported_evidence_ids(branch_results)
            eligible_evidence = tuple(
                item
                for item in evidence
                if item.evidence_id in supported_evidence_ids
                and item.mode is not EvidenceMode.FIXTURE
            )
            synthesis_evidence_ids = {item.evidence_id for item in eligible_evidence}
            if synthesis_evidence_ids:
                intake_payload = case.intake_result.payload
                coord_output_limit = (
                    _GEMINI_COORDINATOR_OUTPUT_LIMIT_TOKENS
                    if self._mode is WorkflowMode.GEMINI
                    else (
                        _CEREBRAS_COORDINATOR_OUTPUT_LIMIT_TOKENS
                        if self._mode is WorkflowMode.CEREBRAS
                        else _COORDINATOR_OUTPUT_RESERVATION_TOKENS
                    )
                )
                remaining_tpm = getattr(self._inference, "remaining_budget_tokens", None)
                if (
                    not isinstance(remaining_tpm, int)
                    or isinstance(remaining_tpm, bool)
                    or remaining_tpm < 0
                ):
                    remaining_tpm = _coordinator_remaining_tpm(self._inference)
                available = (
                    max(
                        0,
                        remaining_tpm
                        - coord_output_limit
                        - _COORDINATOR_CONTEXT_SAFETY_MARGIN_TOKENS,
                    )
                    if remaining_tpm is not None
                    else None
                )
                preferred_input = (
                    min(3_500, max(_COORDINATOR_PREFERRED_INPUT_TOKENS, available))
                    if available is not None
                    else (
                        _CEREBRAS_COORDINATOR_MINIMUM_RESERVATION_TOKENS
                        if self._mode is WorkflowMode.CEREBRAS
                        else _COORDINATOR_PREFERRED_INPUT_TOKENS
                    )
                )
                context_pack = _build_coordinator_context(
                    farmer_question=case.request.query,
                    crop=crop_value,
                    location=location_value,
                    growth_stage=stage_value,
                    intake_payload=(
                        intake_payload if isinstance(intake_payload, IntakePayload) else None
                    ),
                    branch_results=branch_results,
                    eligible_evidence=eligible_evidence,
                    missing_fields=missing_fields,
                    conflicts=conflicts,
                    remaining_tpm_tokens=remaining_tpm,
                    findings=case.board.findings,
                    coordinator_output_reservation=coord_output_limit,
                    missing_questions=tuple(item.question for item in missing),
                    coordinator_preferred_input_tokens=preferred_input,
                )
                if not context_pack.fits_budget:
                    coordinator_interpretation_mode = "deterministic_fallback"
                    coordinator_inference_status = "not_run_context_budget_exceeded"
                    status = AdvisoryStatus.PARTIAL
                    lines.append(
                        f"\n{provider_title} synthesis was not run because all eligible supporting evidence requires "
                        f"{context_pack.estimated_input_tokens} input tokens, above the safe Coordinator "
                        f"context budget of {context_pack.input_limit_tokens}. The deterministic evidence "
                        "summary is shown; no evidence was silently omitted."
                    )
                else:
                    prov_id = getattr(self._inference, "provider_id", None) or self._mode.value
                    mod_id = getattr(self._inference, "model_id", None)
                    coord_agent_name = AgentId.COORDINATOR.value.casefold()

                    def _validate_coordinator_draft(
                        draft_to_check: CoordinatorDraft,
                    ) -> tuple[list[str], list[GroundedStatement]]:
                        validate_evidence_ids(
                            draft_to_check.statements,
                            set(context_pack.selected_evidence_ids),
                            provider=prov_id,
                            model_id=mod_id,
                            agent_name=coord_agent_name,
                        )
                        fixture_ids = {
                            item.evidence_id
                            for item in evidence
                            if item.mode is EvidenceMode.FIXTURE
                        }
                        if any(
                            set(statement.evidence_ids) & fixture_ids
                            for statement in draft_to_check.statements
                            if statement.kind in {"evidence", "interpretation"}
                        ):
                            diag = InferenceDiagnostic(
                                code=(
                                    InferenceDiagnosticCode.CEREBRAS_MALFORMED_RESPONSE
                                    if self._mode is WorkflowMode.CEREBRAS
                                    else (
                                        InferenceDiagnosticCode.GEMINI_MALFORMED_RESPONSE
                                        if self._mode is WorkflowMode.GEMINI
                                        else InferenceDiagnosticCode.GROQ_MALFORMED_RESPONSE
                                    )
                                ),
                                stage=InferenceStage.RESPONSE_VALIDATION,
                                provider=prov_id,
                                model_id=mod_id,
                                agent_name=coord_agent_name,
                                parsing_outcome="fixture_citation_rejected",
                                validation_category="evidence_citation_validation_failure",
                                provider_error_message="Fixture citations are rejected.",
                            )
                            raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)

                        # Grounding check: ensure single-day market evidence is not promoted
                        # to ungrounded trend or sell/hold conclusions.
                        market_evidence = [
                            e
                            for e in eligible_evidence
                            if e.evidence_id.startswith("market:")
                            or "market" in e.source.title.lower()
                        ]
                        if market_evidence:
                            market_dates = {
                                e.retrieved_at.date() for e in market_evidence if e.retrieved_at
                            }
                            if len(market_dates) <= 1:
                                texts_to_check = [s.text for s in draft_to_check.statements] + [
                                    s.uncertainty
                                    for s in draft_to_check.statements
                                    if s.uncertainty
                                ]
                                for text in texts_to_check:
                                    if _UNGROUNDED_MARKET_TREND_PATTERN.search(text):
                                        diag = InferenceDiagnostic(
                                            code=(
                                                InferenceDiagnosticCode.CEREBRAS_MALFORMED_RESPONSE
                                                if self._mode is WorkflowMode.CEREBRAS
                                                else (
                                                    InferenceDiagnosticCode.GEMINI_MALFORMED_RESPONSE
                                                    if self._mode is WorkflowMode.GEMINI
                                                    else InferenceDiagnosticCode.GROQ_MALFORMED_RESPONSE
                                                )
                                            ),
                                            stage=InferenceStage.RESPONSE_VALIDATION,
                                            provider=prov_id,
                                            model_id=mod_id,
                                            agent_name=coord_agent_name,
                                            parsing_outcome="unsupported_market_trend_assertion",
                                            validation_category="market_grounding_validation_failure",
                                            provider_error_message="Single-day market quote does not establish a trend.",
                                        )
                                        raise ProviderFailure(
                                            ProviderFailureKind.MALFORMED_RESPONSE, diag
                                        )

                        # Grounding check: ensure agronomic recommendations are not inferred without crop evidence
                        crop_evidence = [
                            e
                            for e in eligible_evidence
                            if e.evidence_id.startswith("crop:")
                            or getattr(e.source, "source_type", None)
                            == EvidenceSourceType.CURATED_AGRICULTURAL_KNOWLEDGE
                            or (
                                "crop" in getattr(e.source, "title", "").lower()
                                and "market" not in getattr(e.source, "title", "").lower()
                            )
                        ]
                        if not crop_evidence:
                            texts_to_check = [s.text for s in draft_to_check.statements] + [
                                s.uncertainty
                                for s in draft_to_check.statements
                                if s.uncertainty
                            ]
                            for text in texts_to_check:
                                if _UNSUPPORTED_AGRONOMIC_RECOMMENDATION_PATTERN.search(text):
                                    diag = InferenceDiagnostic(
                                        code=(
                                            InferenceDiagnosticCode.CEREBRAS_MALFORMED_RESPONSE
                                            if self._mode is WorkflowMode.CEREBRAS
                                            else (
                                                InferenceDiagnosticCode.GEMINI_MALFORMED_RESPONSE
                                                if self._mode is WorkflowMode.GEMINI
                                                else InferenceDiagnosticCode.GROQ_MALFORMED_RESPONSE
                                            )
                                        ),
                                        stage=InferenceStage.RESPONSE_VALIDATION,
                                        provider=prov_id,
                                        model_id=mod_id,
                                        agent_name=coord_agent_name,
                                        parsing_outcome="unsupported_agronomic_recommendation",
                                        validation_category="crop_grounding_validation_failure",
                                        provider_error_message="Agronomic recommendations require crop evidence.",
                                    )
                                    raise ProviderFailure(
                                        ProviderFailureKind.MALFORMED_RESPONSE, diag
                                    )

                        allowed_questions = {item.question for item in missing}
                        approved_follow_ups = [
                            q for q in draft_to_check.follow_up_questions if q in allowed_questions
                        ]
                        valid_statements = [
                            s
                            for s in draft_to_check.statements
                            if not (s.kind == "question" and s.text not in allowed_questions)
                        ]
                        if not valid_statements:
                            diag = InferenceDiagnostic(
                                code=(
                                    InferenceDiagnosticCode.CEREBRAS_MALFORMED_RESPONSE
                                    if self._mode is WorkflowMode.CEREBRAS
                                    else (
                                        InferenceDiagnosticCode.GEMINI_MALFORMED_RESPONSE
                                        if self._mode is WorkflowMode.GEMINI
                                        else InferenceDiagnosticCode.GROQ_MALFORMED_RESPONSE
                                    )
                                ),
                                stage=InferenceStage.RESPONSE_VALIDATION,
                                provider=prov_id,
                                model_id=mod_id,
                                agent_name=coord_agent_name,
                                parsing_outcome="follow_up_question_validation_failed",
                                validation_category="follow_up_question_validation_failure",
                                provider_error_message="No valid statements in coordinator output.",
                            )
                            raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)

                        return approved_follow_ups, valid_statements

                    try:
                        raw = await call_structured(
                            self._inference,
                            make_json_request(
                                _COORDINATOR_PROMPT,
                                context_pack.payload,
                                CoordinatorDraft,
                                agent_name=coord_agent_name,
                                max_output_tokens=coord_output_limit,
                            ),
                            expected_user_id=case.request.user_id,
                            expected_tenant_id=case.request.tenant_id,
                            response_model=CoordinatorDraft,
                        )
                        draft = CoordinatorDraft.model_validate(raw)
                        approved_follow_ups, valid_statements = _validate_coordinator_draft(draft)
                        coordinator_statements = _model_statements(valid_statements)
                        coordinator_interpretation_mode = self._mode.value
                        coordinator_inference_status = "completed"
                        lines.append(
                            f"\n{provider_title}-generated synthesis (interpretation, not a source statement):"
                        )
                        for statement in coordinator_statements:
                            citation_text = " ".join(
                                f"[{evidence_id}]" for evidence_id in statement.evidence_ids
                            )
                            suffix = f" {citation_text}" if citation_text else ""
                            lines.append(f"- {statement.text}{suffix}")
                            if statement.uncertainty:
                                lines.append(f"  Uncertainty: {statement.uncertainty}")
                        for question in approved_follow_ups:
                            lines.append(f"- Clarification: {question}")
                    except Exception as first_exc:
                        repaired = False
                        if self._mode is WorkflowMode.CEREBRAS:
                            err_detail = str(first_exc)
                            if (
                                isinstance(first_exc, ProviderFailure)
                                and first_exc.diagnostic
                                and first_exc.diagnostic.provider_error_message
                            ):
                                err_detail = first_exc.diagnostic.provider_error_message
                            repair_prompt = (
                                f"{_COORDINATOR_PROMPT}\n"
                                f"IMPORTANT REPAIR REQUIREMENT: Your previous response was rejected ({err_detail}).\n"
                                f"CRITICAL REPAIR RULES:\n"
                                f"1. Statements of kind 'evidence' or 'interpretation' MUST cite 1 or more permitted evidence IDs from: {list(context_pack.selected_evidence_ids)}.\n"
                                f"2. Statements of kind 'limitation' or 'question' MUST have empty evidence_ids: []. NEVER leave an evidence statement without citations.\n"
                                f"3. Never cite fixtures or unlisted IDs.\n"
                                f"4. If market evidence is a single modal price, do NOT assert price trends or advise selling or holding.\n"
                                f"5. Return ONLY a valid JSON object matching the CoordinatorDraft schema."
                            )
                            try:
                                repaired_raw = await call_structured(
                                    self._inference,
                                    make_json_request(
                                        repair_prompt,
                                        context_pack.payload,
                                        CoordinatorDraft,
                                        agent_name=coord_agent_name,
                                        max_output_tokens=coord_output_limit,
                                    ),
                                    expected_user_id=case.request.user_id,
                                    expected_tenant_id=case.request.tenant_id,
                                    response_model=CoordinatorDraft,
                                )
                                repaired_draft = CoordinatorDraft.model_validate(repaired_raw)
                                approved_follow_ups, valid_statements = (
                                    _validate_coordinator_draft(repaired_draft)
                                )
                                coordinator_statements = _model_statements(valid_statements)
                                coordinator_interpretation_mode = self._mode.value
                                coordinator_inference_status = "completed"
                                lines.append(
                                    f"\n{provider_title}-generated synthesis (interpretation, not a source statement):"
                                )
                                for statement in coordinator_statements:
                                    citation_text = " ".join(
                                        f"[{evidence_id}]" for evidence_id in statement.evidence_ids
                                    )
                                    suffix = f" {citation_text}" if citation_text else ""
                                    lines.append(f"- {statement.text}{suffix}")
                                    if statement.uncertainty:
                                        lines.append(f"  Uncertainty: {statement.uncertainty}")
                                for question in approved_follow_ups:
                                    lines.append(f"- Clarification: {question}")
                                repaired = True
                            except Exception as repair_exc:
                                diag = getattr(repair_exc, "diagnostic", None) or getattr(
                                    first_exc, "diagnostic", None
                                )
                                if diag:
                                    object.__setattr__(diag, "retries_attempted", 1)
                                    if hasattr(self._inference, "_record_diagnostic"):
                                        self._inference._record_diagnostic(diag)
                                first_exc = repair_exc

                        if not repaired:
                            if isinstance(first_exc, ProviderFailure) and first_exc.diagnostic:
                                if hasattr(self._inference, "_record_diagnostic"):
                                    self._inference._record_diagnostic(first_exc.diagnostic)
                            coordinator_interpretation_mode = "deterministic_fallback"
                            coordinator_inference_status = _inference_status(first_exc)
                            status = (
                                AdvisoryStatus.COMPLETED_WITH_WARNINGS
                                if status is AdvisoryStatus.COMPLETED
                                else status
                            )
                            lines.append(
                                f"\n{provider_title} synthesis unavailable or invalid; the deterministic evidence summary is shown. "
                                f"Inference status: {coordinator_inference_status}."
                            )
                            det_statements: list[GeneratedStatement] = []
                            if crop_result and crop_result.evidence_ids:
                                c_note = (
                                    crop_result.payload.note
                                    if isinstance(crop_result.payload, RetrievalPayload)
                                    else "Curated agricultural guidance."
                                )
                                det_statements.append(
                                    GeneratedStatement(
                                        text=f"Agricultural guidance: {c_note.rstrip('.')}. Field inspection and KVK extension consultation are recommended.",
                                        kind="interpretation",
                                        evidence_ids=crop_result.evidence_ids[:3],
                                        uncertainty="Guidance is contextual; reported symptoms do not confirm a disease diagnosis.",
                                    )
                                )
                            weather_res = next(
                                (
                                    item
                                    for item in branch_results
                                    if item.agent_id is AgentId.WEATHER
                                ),
                                None,
                            )
                            if (
                                weather_res
                                and weather_res.evidence_ids
                                and getattr(weather_res.payload, "mode", None)
                                is not EvidenceMode.FIXTURE
                            ):
                                w_note = (
                                    weather_res.payload.summary
                                    if isinstance(weather_res.payload, ProviderPayload)
                                    else "Weather observations."
                                )
                                det_statements.append(
                                    GeneratedStatement(
                                        text=f"Weather observations: {w_note.rstrip('.')}.",
                                        kind="interpretation",
                                        evidence_ids=weather_res.evidence_ids[:2],
                                        uncertainty="Weather measurements alone do not establish crop disease presence or absence.",
                                    )
                                )
                            mkt_res = next(
                                (
                                    item
                                    for item in branch_results
                                    if item.agent_id is AgentId.MARKET
                                ),
                                None,
                            )
                            if (
                                mkt_res
                                and mkt_res.evidence_ids
                                and getattr(mkt_res.payload, "mode", None)
                                is not EvidenceMode.FIXTURE
                            ):
                                m_note = (
                                    mkt_res.payload.summary
                                    if isinstance(mkt_res.payload, ProviderPayload)
                                    else "Market quotation."
                                )
                                det_statements.append(
                                    GeneratedStatement(
                                        text=f"Market quotation: {m_note.rstrip('.')}. Price trends cannot be determined from a single point-in-time observation.",
                                        kind="interpretation",
                                        evidence_ids=mkt_res.evidence_ids[:2],
                                        uncertainty="A single modal price does not establish a trend or justify sell or hold advice.",
                                    )
                                )
                            sch_res = next(
                                (
                                    item
                                    for item in branch_results
                                    if item.agent_id is AgentId.SCHEME
                                ),
                                None,
                            )
                            if sch_res and sch_res.evidence_ids:
                                s_note = (
                                    sch_res.payload.note
                                    if isinstance(sch_res.payload, RetrievalPayload)
                                    else "Government schemes."
                                )
                                det_statements.append(
                                    GeneratedStatement(
                                        text=f"Government schemes: {s_note.rstrip('.')}. Confirm current rules with issuing authorities.",
                                        kind="interpretation",
                                        evidence_ids=sch_res.evidence_ids[:2],
                                        uncertainty="Published scheme criteria do not establish personal eligibility.",
                                    )
                                )
                            det_statements.append(
                                GeneratedStatement(
                                    text="Advisory summary: Deterministic synthesis composed from verified specialist findings. Confirm critical field actions with local extension officers.",
                                    kind="limitation",
                                    evidence_ids=(),
                                    uncertainty=None,
                                )
                            )
                            if self._mode is WorkflowMode.CEREBRAS:
                                coordinator_statements = tuple(det_statements)
                            else:
                                coordinator_statements = ()
            else:
                coordinator_interpretation_mode = (
                    "deterministic_fallback" if evidence else "deterministic_no_evidence"
                )
                coordinator_inference_status = (
                    "not_run_no_eligible_evidence" if evidence else "not_run_no_evidence"
                )
                lines.append(
                    f"\n{provider_title} synthesis was not run because no eligible retrieved evidence was available; "
                    "the deterministic evidence summary is shown. No unsupported answer was generated."
                    if evidence
                    else "\nNo evidence was available for LLM synthesis; no unsupported answer was generated."
                )
            response_text = "\n".join(lines)
        writer = case.board.writer_for(AgentId.COORDINATOR)
        relevant_evidence = tuple(
            dict.fromkeys(item for result in branch_results for item in result.evidence_ids)
        )
        if missing_fields:
            questions = tuple(item.question for item in missing)
            action = "Please provide the requested details: " + "; ".join(questions)
            recommendation = AgriculturalRecommendation(
                recommendation_id=f"recommendation:{uuid.uuid4().hex}",
                request_id=case.request.request_id,
                category=RecommendationCategory.FOLLOW_UP,
                proposed_action=action,
                reasoning_summary="The workflow retains unconfirmed context as unknown and needs these details for a more scoped response.",
                support=RecommendationSupport.NEEDS_INFORMATION,
                confidence=0.5,
                missing_information=missing_fields,
            )
            writer.publish_recommendation(recommendation)
        elif relevant_evidence:
            recommendation = AgriculturalRecommendation(
                recommendation_id=f"recommendation:{uuid.uuid4().hex}",
                request_id=case.request.request_id,
                category=RecommendationCategory.FOLLOW_UP,
                proposed_action="Review the cited source material and confirm field-specific action with a local KVK or agriculture officer.",
                evidence_ids=relevant_evidence,
                reasoning_summary="The workflow returns source excerpts and does not independently diagnose or determine scheme eligibility.",
                support=RecommendationSupport.HYPOTHESIS,
                confidence=0.5,
                uncertainty="Retrieved excerpts may not capture all local conditions, current notifications or individual eligibility facts.",
                recommended_follow_up=(
                    "Confirm the source's current revision and local applicability before taking action.",
                ),
            )
            writer.publish_recommendation(recommendation)

        coordinator_model_findings = tuple(
            _record_finding(
                case,
                AgentId.COORDINATOR,
                "llm_interpretation:coordinator",
                statement.text,
                statement.evidence_ids,
                uncertainty=statement.uncertainty
                or "LLM-generated interpretation; verify against the cited source.",
            )
            for statement in coordinator_statements
        )
        coordinator_finding = _record_finding(
            case,
            AgentId.COORDINATOR,
            "final_advisory",
            f"{status.value}: composed response from {len(branch_results)} specialized agent result(s).",
            relevant_evidence,
            uncertainty=(
                "Conflicts and unavailable provider data are reported rather than resolved by assumption."
                if conflicts or failures
                else None
            ),
            missing=missing_fields,
        )
        prov_id = getattr(self._inference, "provider_id", None) or (
            self._mode.value
            if (
                self._inference is not None
                and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            )
            else None
        )
        mod_id = getattr(self._inference, "model_id", None) if (
            self._inference is not None
            and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
        ) else None
        coordinator_agent_status = (
            AgentStatus.CANCELLED
            if status is AdvisoryStatus.CANCELLED
            else (
                AgentStatus.PARTIAL
                if (
                    coordinator_inference_status
                    in {
                        "malformed_response",
                        "timeout",
                        "not_run_context_budget_exceeded",
                        "not_run_no_eligible_evidence",
                        "not_run_no_evidence",
                    }
                    or (
                        self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
                        and coordinator_interpretation_mode == "deterministic_fallback"
                    )
                )
                else AgentStatus.COMPLETED
            )
        )
        coordinator_result = AgentResult(
            agent_id=AgentId.COORDINATOR,
            status=coordinator_agent_status,
            started_at=coordinator_started,
            completed_at=_now(),
            payload=CoordinatorPayload(
                status,
                response_text,
                conflict_text,
                missing_fields,
                coordinator_interpretation_mode,
                coordinator_inference_status,
                coordinator_statements,
                prov_id,
                mod_id,
            ),
            evidence_ids=relevant_evidence,
            finding_ids=(*coordinator_model_findings, coordinator_finding),
            provider_id=prov_id,
            model_id=mod_id,
        )
        case.board.writer_for(AgentId.COORDINATOR).complete()
        response = AdvisoryResponse(
            request_id=case.request.request_id,
            status=status,
            response_text=response_text,
            context=case.context,
            missing_information=tuple(item.question for item in missing),
            agent_results=(case.intake_result, *branch_results, coordinator_result),
            evidence=case.board.evidence,
            findings=case.board.findings,
            recommendations=case.board.recommendations,
            conflicts=conflict_text,
            board_state=BoardState.COMPLETED,
            execution_mode=self._mode,
            provider_id=(
                self._mode.value
                if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
                else None
            ),
            model_id=(
                getattr(self._inference, "model_id", None)
                if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
                else None
            ),
        )
        return response
