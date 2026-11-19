"""Market Agent: Retrieves mandi market quotes and produces grounded price interpretations."""

from __future__ import annotations

import uuid

from ..domain import (
    AgentId,
    EvidenceMode,
    EvidenceRecord,
    EvidenceStatus,
)
from ..inference import (
    InferenceDiagnostic,
    InferenceDiagnosticCode,
    InferenceStage,
    ProviderFailure,
    ProviderFailureKind,
)
from .base import (
    _DomainAgent,
    _AgentWork,
    _resolved_id,
    _record_finding,
    _model_statements,
    _UNGROUNDED_MARKET_TREND_PATTERN,
    _CONTRADICTORY_MARKET_EVIDENCE_PATTERN,
)
from .contracts import (
    AgentExecutionInput,
    AgentStatus,
    MarketProvider,
    ProviderPayload,
    WorkflowMode,
)
from .providers import UnavailableMarketProvider
from .llm import SpecialistInterpretation, WorkflowInference


class MarketAgent(_DomainAgent):
    def __init__(
        self,
        provider: MarketProvider | None = None,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(AgentId.MARKET, inference, mode)
        self._provider = provider or UnavailableMarketProvider()

    async def perform(self, case: AgentExecutionInput) -> _AgentWork:
        crop_id = _resolved_id(case.context.crop)
        location_id = _resolved_id(case.context.location)
        if not crop_id or not location_id:
            note = "Market lookup requires registered crop and location values; one or both are missing."
            return _AgentWork(
                AgentStatus.SKIPPED,
                ProviderPayload(False, None, location_id, None, note),
                note,
            )

        query_lower = case.request.query.lower()
        market_requested = any(
            k in query_lower
            for k in (
                "market",
                "price",
                "mandi",
                "rate",
                "modal",
                "arrival",
                "bhav",
                "msp",
                "sell",
                "selling",
                "cost",
                "bazaar",
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
        if is_pest_or_symptom_inquiry and not market_requested:
            note = "Market price lookup is skipped as no market or price inquiry was requested."
            return _AgentWork(
                AgentStatus.SKIPPED,
                ProviderPayload(False, None, location_id, None, note),
                note,
            )
        quote = await self._provider.get_quote(case.request.request_id, crop_id, location_id)
        if quote is None:
            note = "No market provider quote is available; no crop price or trend is asserted."
            return _AgentWork(
                AgentStatus.UNAVAILABLE,
                ProviderPayload(False, None, location_id, None, note),
                note,
            )
        if (
            quote.request_id != case.request.request_id
            or quote.crop_id != crop_id
            or quote.location_id != location_id
        ):
            raise ValueError("market provider returned data for a different request, crop or location")
        parts = [f"{quote.market_name}: modal price {quote.price:g} {quote.unit}"]
        if quote.min_price is not None and quote.max_price is not None:
            parts.append(f"range {quote.min_price:g}-{quote.max_price:g} {quote.unit}")
        if quote.commodity:
            parts.append(f"commodity: {quote.commodity}")
        if quote.variety and quote.variety.lower() != "other":
            parts.append(f"variety: {quote.variety}")
        if quote.grade and quote.grade.lower() != "faq":
            parts.append(f"grade: {quote.grade}")
        if quote.arrival_date:
            parts.append(f"arrival date: {quote.arrival_date}")
        excerpt = f"{'; '.join(parts)}; observed at {quote.observed_at.isoformat()}."
        note = (
            "Fixture quote, not a real market price: "
            if quote.mode is EvidenceMode.FIXTURE
            else ""
        ) + excerpt
        evidence = EvidenceRecord(
            evidence_id=f"market:{uuid.uuid4().hex}",
            request_id=case.request.request_id,
            source=quote.source,
            excerpt=note,
            content_reference=quote.source.reference,
            retrieved_at=quote.retrieved_at,
            geographic_applicability=(location_id,),
            crop_applicability=(crop_id,),
            provenance=f"Market provider record observed at {quote.observed_at.isoformat()}",
            mode=quote.mode,
            status=EvidenceStatus.AVAILABLE,
            units=quote.unit,
            quality_notes=(
                ("Deterministic test fixture; not a live market price.",)
                if quote.mode is EvidenceMode.FIXTURE
                else ()
            ),
        )
        case.board.writer_for(AgentId.MARKET).publish_evidence(evidence)
        finding = _record_finding(
            case,
            AgentId.MARKET,
            "market_quote",
            note,
            (evidence.evidence_id,),
            uncertainty=(
                "Fixture values are synthetic and must not guide sale decisions."
                if quote.mode is EvidenceMode.FIXTURE
                else None
            ),
        )
        interpretation = None
        inference_status = None
        if (
            self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and quote.mode is not EvidenceMode.FIXTURE
        ):
            prov_id = getattr(self._inference, "provider_id", None) or self._mode.value
            mod_id = getattr(self._inference, "model_id", None)

            def _market_validator(interp: SpecialistInterpretation) -> None:
                texts_to_check = [interp.summary] + [s.text for s in interp.statements]
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
                            agent_name=AgentId.MARKET.value.casefold(),
                            parsing_outcome="unsupported_market_trend_assertion",
                            validation_category="market_grounding_validation_failure",
                            provider_error_message="A single modal price observation does not establish a trend. Remove trend assertions.",
                        )
                        raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)
                    if _CONTRADICTORY_MARKET_EVIDENCE_PATTERN.search(text):
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
                            agent_name=AgentId.MARKET.value.casefold(),
                            parsing_outcome="contradictory_evidence_assertion",
                            validation_category="market_grounding_validation_failure",
                            provider_error_message="Contradictory evidence assertion rejected.",
                        )
                        raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)

            interpretation, inference_status = await self.interpret(
                case,
                (evidence.evidence_id,),
                "market quote interpretation using the supplied commodity, market, price, unit and arrival date. "
                "Valid market evidence is supplied: do NOT claim that no market price, quote, or evidence was provided or is available. "
                "Accurately report the observed modal price, range, commodity, variety, and arrival date from the evidence. "
                "A single day's price observation does not prove strong market demand or a multi-day price trend, "
                "and does not justify a sell or hold recommendation. "
                "Distinguish observed price facts from multi-day trends. "
                "Explicitly state uncertainty that single-day evidence is insufficient for a sell/hold recommendation. "
                "Do not invent historical prices, assert confirmed demand trends, or advise selling or holding. "
                "Generate exactly 1 to 3 statements. Every statement must be of kind 'interpretation' or 'evidence' and must cite the supplied market evidence ID. "
                "Do not output extra fields, do not exceed 3 statements, and keep uncertainty under 180 characters.",
                validator=_market_validator,
            )
        generated_findings = self.publish_interpretation(case, interpretation)
        interpretation_mode = (
            self._mode.value
            if interpretation is not None
            else "deterministic_fallback"
            if inference_status is not None
            else "not_run_fixture"
            if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and quote.mode is EvidenceMode.FIXTURE
            else "deterministic"
        )
        status = (
            AgentStatus.PARTIAL
            if quote.mode is EvidenceMode.FIXTURE
            or (inference_status and inference_status != "completed")
            else AgentStatus.COMPLETED
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
        return _AgentWork(
            status,
            ProviderPayload(
                True,
                quote.mode,
                location_id,
                quote.observed_at,
                note,
                interpretation.summary if interpretation else None,
                interpretation_mode,
                inference_status,
                _model_statements(interpretation.statements) if interpretation else (),
                prov_id,
                mod_id,
            ),
            note,
            (evidence.evidence_id,),
            (finding, *generated_findings),
        )
