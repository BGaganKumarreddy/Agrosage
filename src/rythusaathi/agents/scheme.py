"""Scheme Agent: Retrieves official government schemes and provides grounded eligibility summaries."""

from __future__ import annotations

import hashlib
import re
from typing import Sequence

from ..domain import (
    AgentId,
    EvidenceRecord,
    RegistryLevel,
)
from ..domain.seed import LOCATION_REGISTRY
from ..inference import (
    InferenceDiagnostic,
    InferenceDiagnosticCode,
    InferenceStage,
    ProviderFailure,
    ProviderFailureKind,
)
from ..knowledge import (
    DocumentChunk,
    RetrievedChunk,
    RetrievalFilter,
    to_evidence_record,
)
from .base import (
    _DomainAgent,
    _AgentWork,
    _resolved_id,
    _location_scopes,
    _record_finding,
    _model_statements,
    _merge_overlapping_excerpt,
    _UNGROUNDED_SCHEME_ELIGIBILITY_PATTERN,
    KnowledgeSearch,
)
from .contracts import (
    AgentExecutionInput,
    AgentStatus,
    RetrievalPayload,
    WorkflowMode,
)
from .llm import SpecialistInterpretation, WorkflowInference


def _deduplicate_and_merge_scheme_hits(
    hits: Sequence[RetrievedChunk],
    request_id: str,
) -> list[EvidenceRecord]:
    """Deduplicate and merge overlapping scheme excerpts per parent document.

    Preserves distinct non-overlapping sections (eligibility, benefits, procedure,
    limitations), eliminates suffix/prefix overlap redundancy without arbitrary truncation,
    and retains source references and provenance intact.
    """
    if not hits:
        return []

    by_doc: dict[str, list[RetrievedChunk]] = {}
    for hit in sorted(hits, key=lambda h: (-h.similarity, h.chunk.chunk_id)):
        doc_id = hit.chunk.parent_document_id or hit.chunk.chunk_id
        by_doc.setdefault(doc_id, []).append(hit)

    merged_records: list[EvidenceRecord] = []
    for doc_id, doc_hits in by_doc.items():
        clusters: list[dict[str, object]] = []
        for hit in doc_hits:
            hit_text = hit.chunk.text.strip()
            if not hit_text:
                continue
            clusters.append({
                "primary_hit": hit,
                "text": hit_text,
                "similarity": hit.similarity,
                "chunk_ids": [hit.chunk.chunk_id],
            })

        # Iteratively merge overlapping clusters until fixpoint
        merged_any = True
        while merged_any and len(clusters) > 1:
            merged_any = False
            i = 0
            while i < len(clusters):
                j = i + 1
                while j < len(clusters):
                    merged = _merge_overlapping_excerpt(
                        str(clusters[i]["text"]), str(clusters[j]["text"])
                    )
                    if merged is not None:
                        clusters[i]["text"] = merged
                        clusters[i]["similarity"] = max(
                            float(clusters[i]["similarity"]),
                            float(clusters[j]["similarity"]),
                        )
                        clusters[i]["chunk_ids"].extend(clusters[j]["chunk_ids"])
                        clusters.pop(j)
                        merged_any = True
                    else:
                        j += 1
                i += 1

        for cluster in clusters:
            primary_hit: RetrievedChunk = cluster["primary_hit"]
            chunk = primary_hit.chunk
            cluster_text = re.sub(r"\s+", " ", str(cluster["text"])).strip()
            merged_chunk = DocumentChunk(
                chunk_id=chunk.chunk_id,
                parent_document_id=chunk.parent_document_id,
                source=chunk.source,
                text=cluster_text,
                content_hash=hashlib.sha256(cluster_text.encode("utf-8")).hexdigest(),
                crop_id=chunk.crop_id,
                variety_id=chunk.variety_id,
                growth_stage=chunk.growth_stage,
                topic=chunk.topic,
                geographic_applicability=chunk.geographic_applicability,
                page=chunk.page,
                section=chunk.section,
            )
            merged_retrieved = RetrievedChunk(
                chunk=merged_chunk,
                similarity=float(cluster["similarity"]),
                retrieved_at=primary_hit.retrieved_at,
            )
            evidence = to_evidence_record(merged_retrieved, request_id=request_id)
            merged_records.append(evidence)

    return sorted(merged_records, key=lambda e: (-(e.relevance or 0.0), e.evidence_id))


class SchemeAgent(_DomainAgent):
    def __init__(
        self,
        knowledge: KnowledgeSearch,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(AgentId.SCHEME, inference, mode)
        self._knowledge = knowledge

    async def perform(self, case: AgentExecutionInput) -> _AgentWork:
        location_id = _resolved_id(case.context.location)
        query_lower = case.request.query.lower()
        scheme_requested = any(
            k in query_lower
            for k in (
                "scheme",
                "pm-kisan",
                "pmfby",
                "yojana",
                "benefit",
                "subsidy",
                "financial assistance",
                "bharosa",
                "eligib",
                "support",
                "insurance",
                "application",
            )
        )
        is_pest_or_symptom_inquiry = any(
            k in query_lower
            for k in (
                "symptom",
                "symptoms",
                "ipm",
                "pink bollworm",
                "bollworm",
                "control measure",
                "control measures",
            )
        )
        if is_pest_or_symptom_inquiry and not scheme_requested:
            note = "No government scheme inquiry was requested; scheme lookup is skipped."
            return _AgentWork(
                AgentStatus.SKIPPED,
                RetrievalPayload(0, (), (), (), note),
                note,
            )
        if not scheme_requested and not location_id:
            note = "No government scheme inquiry was requested; scheme lookup is skipped."
            return _AgentWork(
                AgentStatus.SKIPPED,
                RetrievalPayload(0, (), (), (), note),
                note,
            )

        hits: dict[str, RetrievedChunk] = {}

        if not location_id:
            # When location is not specified, retrieve nationwide central schemes (PM-KISAN, PMFBY)
            for hit in self._knowledge.search(
                case.request.query,
                top_k=4,
                filters=RetrievalFilter(
                    geography="location:country:in",
                    topic="government_scheme",
                    jurisdiction_level="central",
                ),
            ):
                hits.setdefault(hit.chunk.chunk_id, hit)
        else:
            # National records apply under the hierarchy-aware SQLite filter. State
            # records are searched only at the exact state ancestor in the registry.
            for jurisdiction in ("central", "state"):
                geographies = (
                    ("location:country:in",)
                    if jurisdiction == "central"
                    else tuple(
                        item
                        for item in _location_scopes(location_id)
                        if next(
                            (
                                record.level
                                for record in LOCATION_REGISTRY.records
                                if record.location_id == item
                            ),
                            None,
                        )
                        is RegistryLevel.STATE
                    )
                )
                for geography in geographies:
                    for hit in self._knowledge.search(
                        case.request.query,
                        top_k=4,
                        filters=RetrievalFilter(
                            geography=geography,
                            topic="government_scheme",
                            jurisdiction_level=jurisdiction,
                        ),
                    ):
                        hits.setdefault(hit.chunk.chunk_id, hit)

        evidence_records = _deduplicate_and_merge_scheme_hits(
            list(hits.values()), request_id=case.request.request_id
        )
        evidence_ids: list[str] = []
        finding_ids: list[str] = []
        for evidence in evidence_records:
            case.board.writer_for(AgentId.SCHEME).publish_evidence(evidence)
            evidence_ids.append(evidence.evidence_id)
            finding_ids.append(
                _record_finding(
                    case,
                    AgentId.SCHEME,
                    f"scheme_source:{evidence.evidence_id}",
                    f"Official-scope source excerpt: {evidence.excerpt or evidence.source.title}",
                    (evidence.evidence_id,),
                    uncertainty="This document excerpt is not a determination of individual eligibility or current enrollment.",
                )
            )
        titles = tuple(dict.fromkeys(e.source.title for e in evidence_records))
        if not location_id:
            note = (
                f"Retrieved {len(evidence_ids)} nationwide central scheme excerpt(s). "
                "State-specific schemes require providing a registered state or district location. "
                "Individual eligibility is not determined by this workflow."
                if evidence_ids
                else "Scheme retrieval needs a registered location to check state jurisdiction; no central schemes matched the query."
            )
        else:
            note = (
                f"Retrieved {len(evidence_ids)} central/state jurisdiction-filtered scheme excerpt(s). "
                "Individual eligibility is not determined by this workflow."
                if evidence_ids
                else "No scheme evidence matched the registered location and jurisdiction filters."
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

        def _scheme_validator(interp: SpecialistInterpretation) -> None:
            texts_to_check = [interp.summary] + [s.text for s in interp.statements]
            for text in texts_to_check:
                if _UNGROUNDED_SCHEME_ELIGIBILITY_PATTERN.search(text):
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
                        agent_name=AgentId.SCHEME.value.casefold(),
                        parsing_outcome="unsupported_scheme_eligibility_claim",
                        validation_category="scheme_grounding_validation_failure",
                        provider_error_message="Generic scheme criteria cannot guarantee personal eligibility.",
                    )
                    raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)

        interpretation, inference_status = await self.interpret(
            case,
            evidence_ids,
            "official government scheme summary reporting published scheme rules, objectives, benefits, and official application portals from the evidence. "
            "Never guarantee, confirm, or assert personal eligibility or individual enrollment for the farmer; "
            "explicitly state that individual eligibility must be verified with the issuing authority. "
            "CRITICAL CITATION RULES: "
            "Statements of kind 'evidence' or 'interpretation' MUST cite 1 or more supplied scheme evidence IDs. "
            "Statements of kind 'limitation' or 'question' MUST have empty evidence_ids: []. Never attach citations to limitations or questions. "
            "Generate 1 to 3 statements. Keep uncertainty under 180 characters.",
            validator=_scheme_validator,
        )
        finding_ids.extend(self.publish_interpretation(case, interpretation))
        interpretation_mode = (
            self._mode.value
            if interpretation is not None
            else "deterministic_fallback"
            if inference_status is not None
            else "not_run_no_evidence"
            if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and not evidence_ids
            else "deterministic"
        )
        status = AgentStatus.COMPLETED if evidence_ids else AgentStatus.UNAVAILABLE
        if (inference_status is not None and inference_status != "completed") and evidence_ids:
            status = AgentStatus.PARTIAL
        filters = (
            ("geography", location_id or "location:country:in"),
            ("jurisdiction_level", "central" if not location_id else "central+state"),
            ("topic", "government_scheme"),
        )
        return _AgentWork(
            status,
            RetrievalPayload(
                len(evidence_ids),
                tuple(evidence_ids),
                titles,
                filters,
                note,
                interpretation.summary if interpretation else None,
                interpretation_mode,
                inference_status,
                _model_statements(interpretation.statements) if interpretation else (),
                prov_id,
                mod_id,
            ),
            note,
            tuple(evidence_ids),
            tuple(finding_ids),
        )
