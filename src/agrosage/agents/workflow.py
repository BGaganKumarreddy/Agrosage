"""Agent workflow orchestration: defines AgroSageWorkflow and re-exports agent classes."""

from __future__ import annotations

import asyncio
from datetime import date
from typing import Any, Callable

from agent_framework import WorkflowBuilder

from ..domain import (
    AdvisoryBoard,
    AgentId,
    ContextFact,
    ContextResolutionRequest,
    ContextResolver,
    EvidenceRecord,
    FactState,
    MissingInformation,
    MissingInformationReason,
    ResolutionStatus,
    WorkflowMetadata,
)
from ..inference import (
    InferenceDiagnostic,
    InferenceDiagnosticCode,
    InferenceStage,
)
from .llm import WorkflowInference
from .base import (
    KnowledgeSearch,
    _AgentWork,
    _CEREBRAS_COORDINATOR_MINIMUM_RESERVATION_TOKENS,
    _CEREBRAS_COORDINATOR_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_INTAKE_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_SCHEME_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_SPECIALIST_OUTPUT_LIMIT_TOKENS,
    _CONTRADICTORY_MARKET_EVIDENCE_PATTERN,
    _COORDINATOR_CONTEXT_SAFETY_MARGIN_TOKENS,
    _COORDINATOR_MINIMUM_RESERVATION_TOKENS,
    _COORDINATOR_OUTPUT_RESERVATION_TOKENS,
    _COORDINATOR_PREFERRED_INPUT_TOKENS,
    _COORDINATOR_PROMPT,
    _DomainAgent,
    _GEMINI_COORDINATOR_OUTPUT_LIMIT_TOKENS,
    _GEMINI_INTAKE_OUTPUT_LIMIT_TOKENS,
    _GEMINI_SPECIALIST_OUTPUT_LIMIT_TOKENS,
    _INTAKE_OUTPUT_LIMIT_TOKENS,
    _INTAKE_PROMPT,
    _RULING_OUT_DISEASE_PRESSURE_PATTERN,
    _SPECIALIST_OUTPUT_LIMIT_TOKENS,
    _SPECIALIST_PROMPT,
    _UNGROUNDED_AGRONOMIC_CROP_PATTERN,
    _UNGROUNDED_MARKET_TREND_PATTERN,
    _UNGROUNDED_SCHEME_ELIGIBILITY_PATTERN,
    _UNSUPPORTED_AGRONOMIC_RECOMMENDATION_PATTERN,
    _is_ruling_out_disease_pressure,
    _is_ungrounded_disease_diagnosis,
    _location_scopes,
    _merge_overlapping_excerpt,
    _normalize,
    _now,
    _rank_and_deduplicate_evidence,
    _resolved_id,
)
from .contracts import (
    AdvisoryResponse,
    AdvisoryStatus,
    AgentExecution,
    AgentExecutionInput,
    AgentResult,
    AgentStatus,
    FarmerRequest,
    IntakePayload,
    MarketProvider,
    WeatherProvider,
    WorkflowMode,
)
from .coordinator import (
    CoordinatorAgent,
    _CoordinatorContextPack,
    _build_coordinator_context,
    _conflict_prompt_summaries,
    _conflict_supported_evidence_ids,
    _coordinator_agent_prompt_result,
    _coordinator_citation_catalog,
    _coordinator_remaining_tpm,
    _coordinator_retrieved_evidence,
    _coordinator_supported_evidence_ids,
    _format_evidence,
    _specialist_cited_evidence_ids,
)
from .crop import CropAgent
from .intake import (
    IntakeAgent,
    _apply_ambiguities,
    _intents_and_observations,
    _select_query_values,
)
from .intake_intelligence import evaluate_intake_decision
from .market import MarketAgent
from .risk_alert import RiskAlertAgent
from .scheme import (
    SchemeAgent,
    _deduplicate_and_merge_scheme_hits,
)
from .weather import WeatherAgent

DEFAULT_WORKFLOW_DEADLINE_SECONDS = 240.0


def _format_workflow_progress_event(event: Any) -> str | None:
    event_type = getattr(event, "type", None)
    eid = getattr(event, "executor_id", None)
    if not eid or eid not in {
        AgentId.INTAKE.value,
        AgentId.WEATHER.value,
        AgentId.CROP.value,
        AgentId.MARKET.value,
        AgentId.SCHEME.value,
        AgentId.RISK_ALERT.value,
        AgentId.COORDINATOR.value,
    }:
        return None

    if event_type == "executor_invoked":
        return f"{eid} started"

    if event_type == "executor_failed":
        return f"{eid} failed"

    if event_type == "executor_completed":
        data = getattr(event, "data", None)
        first_item = data[0] if isinstance(data, list) and data else data
        res = getattr(first_item, "result", first_item)
        if eid == AgentId.INTAKE.value:
            intake_res = getattr(first_item, "intake_result", None) or res
            status = getattr(intake_res, "status", None)
            payload = getattr(intake_res, "payload", None)
            mode = getattr(payload, "interpretation_mode", None)
            if status is AgentStatus.FAILED:
                return "Intake failed"
            if mode == "deterministic_fallback":
                return "Intake completed (fallback)"
            return "Intake completed"
        if eid in {AgentId.WEATHER.value, AgentId.MARKET.value}:
            status = getattr(res, "status", None)
            payload = getattr(res, "payload", None)
            mode = getattr(payload, "interpretation_mode", None)
            if status is AgentStatus.UNAVAILABLE:
                return f"{eid} unavailable"
            if status is AgentStatus.SKIPPED:
                return f"{eid} skipped"
            if status is AgentStatus.FAILED:
                return f"{eid} failed"
            if mode == "deterministic_fallback" or status is AgentStatus.COMPLETED_WITH_FALLBACK:
                return f"{eid} completed (fallback)"
            return f"{eid} completed"
        if eid in {AgentId.CROP.value, AgentId.SCHEME.value, AgentId.RISK_ALERT.value}:
            status = getattr(res, "status", None)
            payload = getattr(res, "payload", None)
            mode = getattr(payload, "interpretation_mode", None)
            if eid == AgentId.CROP.value and status is AgentStatus.UNAVAILABLE:
                return f"{eid} unavailable"
            if status is AgentStatus.FAILED:
                return f"{eid} failed (fallback)"
            if mode == "deterministic_fallback" or status is AgentStatus.COMPLETED_WITH_FALLBACK:
                return f"{eid} completed (fallback)"
            return f"{eid} completed"
        if eid == AgentId.COORDINATOR.value:
            status = getattr(first_item, "status", None)
            if status is AdvisoryStatus.FAILED:
                return "Coordinator failed"
            results = getattr(first_item, "agent_results", ())
            coord_res = results[-1] if results else None
            coord_payload = getattr(coord_res, "payload", None)
            coord_mode = getattr(coord_payload, "interpretation_mode", None)
            coord_status = getattr(coord_res, "status", None)
            if coord_mode == "deterministic_fallback" or coord_status is AgentStatus.COMPLETED_WITH_FALLBACK:
                return "Coordinator completed (fallback)"
            return "Coordinator completed"

    return None


class AgroSageWorkflow:
    """Per-request Microsoft Agent Framework graph over the accepted Phase 2/3 services."""

    def __init__(
        self,
        *,
        resolver: ContextResolver,
        knowledge: KnowledgeSearch,
        weather_provider: WeatherProvider | None = None,
        market_provider: MarketProvider | None = None,
        coordinator_reserved_budget: int = _COORDINATOR_MINIMUM_RESERVATION_TOKENS,
    ):
        self._resolver = resolver
        self._knowledge = knowledge
        self._weather_provider = weather_provider
        self._market_provider = market_provider
        self._coordinator_reserved_budget = coordinator_reserved_budget
        self.agent_ids = (
            AgentId.INTAKE,
            AgentId.WEATHER,
            AgentId.CROP,
            AgentId.MARKET,
            AgentId.SCHEME,
            AgentId.RISK_ALERT,
            AgentId.COORDINATOR,
        )

    def _create_deterministic_case(self, request: FarmerRequest) -> AgentExecutionInput:
        crop, location, variety, stage, ambiguous = _select_query_values(request, None)
        resolution_request = ContextResolutionRequest(
            request_id=request.request_id,
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            crop_query=crop,
            location_query=location,
            variety_query=variety,
            growth_stage_query=stage,
            farmer_report=ContextFact[tuple[str, ...]].supplied((request.query,)),
            workflow=WorkflowMetadata(trace_id=request.request_id, stage="phase4_intake"),
            as_of=request.as_of or date.today(),
        )
        resolution = _apply_ambiguities(self._resolver.resolve(resolution_request), ambiguous)
        if (
            resolution.crop.status is ResolutionStatus.MATCHED
            and stage is None
            and "growth_stage" not in ambiguous
            and not any(
                item.field_name == "growth_stage"
                for item in resolution.context.missing_information
            )
        ):
            missing = resolution.context.missing_information + (
                MissingInformation(
                    field_name="growth_stage",
                    question="What growth stage is the crop currently in?",
                    reason=MissingInformationReason.NOT_PROVIDED,
                ),
            )
            context = resolution.context.model_copy(update={"missing_information": missing})
            resolution = resolution.model_copy(update={"context": context})
        board = AdvisoryBoard(resolution.context)
        intents, observations = _intents_and_observations(request.query)
        missing_fields = tuple(item.field_name for item in resolution.context.missing_information)
        resolved_crop = (
            resolution.context.crop.value.display_name
            if resolution.context.crop.state is FactState.SUPPLIED
            else "unknown"
        )
        resolved_location = (
            resolution.context.location.value.display_name
            if resolution.context.location.state is FactState.SUPPLIED
            else "unknown"
        )
        growth = (
            resolution.context.growth_stage.value
            if resolution.context.growth_stage.state is FactState.SUPPLIED
            else "unknown"
        )
        summary = (
            f"Request received. Registered crop: {resolved_crop}; location: {resolved_location}; "
            f"growth stage: {growth}. Reported observations: {', '.join(observations) or 'none extracted'}."
        )
        finding_id = board.writer_for(AgentId.INTAKE).publish_finding(
            topic="intake_context",
            claim=summary,
            missing_information=missing_fields,
            uncertainty="Intent and symptom extraction use deterministic phrase rules; no cause or missing fact is inferred.",
        ).finding_id
        status_finding_id = board.writer_for(AgentId.INTAKE).publish_finding(
            topic="execution:intake",
            claim="completed: registry resolution finished using deterministic interpretation.",
            missing_information=missing_fields,
        ).finding_id
        intake_decision = evaluate_intake_decision(
            query=request.query,
            context=resolution.context,
            mode=WorkflowMode.DETERMINISTIC,
        )
        payload = IntakePayload(
            resolution.context,
            resolution,
            intents,
            observations,
            tuple(ambiguous),
            "deterministic",
            "completed",
            None,
            None,
            None,
            intake_decision,
        )
        started_at = _now()
        result = AgentResult(
            agent_id=AgentId.INTAKE,
            status=AgentStatus.COMPLETED,
            started_at=started_at,
            completed_at=_now(),
            payload=payload,
            finding_ids=(finding_id, status_finding_id),
        )
        return AgentExecutionInput(request, resolution, board, result, None)

    async def run(
        self,
        request: FarmerRequest,
        *,
        cancellation_event: asyncio.Event | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
        inference: WorkflowInference | None = None,
        on_progress: Callable[[str], None] | None = None,
        deadline_seconds: float | None = DEFAULT_WORKFLOW_DEADLINE_SECONDS,
    ) -> AdvisoryResponse:
        if not isinstance(mode, WorkflowMode):
            try:
                mode = WorkflowMode(mode)
            except (TypeError, ValueError):
                raise ValueError(
                    "workflow mode must be deterministic, groq, gemini, or cerebras"
                ) from None
        if mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS} and inference is None:
            provider_title = (
                "Gemini"
                if mode is WorkflowMode.GEMINI
                else ("Cerebras" if mode is WorkflowMode.CEREBRAS else "Groq")
            )
            raise ValueError(
                f"{provider_title} mode requires authenticated workflow inference access"
            )

        active_inference = (
            inference
            if mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            else None
        )
        coord_reservation = None
        if active_inference is not None and callable(
            getattr(active_inference, "reserve_budget", None)
        ):
            res_budget = (
                _CEREBRAS_COORDINATOR_MINIMUM_RESERVATION_TOKENS
                if mode is WorkflowMode.CEREBRAS
                else self._coordinator_reserved_budget
            )
            coord_reservation = active_inference.reserve_budget(res_budget)
        intake = IntakeAgent(self._resolver, cancellation_event, active_inference, mode)
        weather = WeatherAgent(self._weather_provider, active_inference, mode)
        crop = CropAgent(self._knowledge, active_inference, mode)
        market = MarketAgent(self._market_provider, active_inference, mode)
        scheme = SchemeAgent(self._knowledge, active_inference, mode)
        risk_alert = RiskAlertAgent(
            self._knowledge, self._weather_provider, active_inference, mode
        )
        coordinator = CoordinatorAgent(
            active_inference, mode, coordinator_reservation=coord_reservation
        )
        branches = (weather, crop, market, scheme, risk_alert)
        builder = WorkflowBuilder(start_executor=intake)
        builder.add_fan_out_edges(intake, branches)
        builder.add_fan_in_edges(branches, coordinator)
        workflow = builder.build()
        stream = workflow.run(request, stream=True, include_status_events=True)

        captured_case: AgentExecutionInput | None = None
        completed_branches: dict[AgentId, AgentResult] = {}
        final_output: AdvisoryResponse | None = None
        timeout_occurred = False

        async def _consume_stream() -> None:
            nonlocal captured_case, final_output
            async for event in stream:
                msg = _format_workflow_progress_event(event)
                if msg and on_progress:
                    on_progress(msg)
                event_type = getattr(event, "type", None)
                if event_type == "executor_completed":
                    eid = getattr(event, "executor_id", None)
                    data = getattr(event, "data", None)
                    first_item = data[0] if isinstance(data, list) and data else data
                    if eid == AgentId.INTAKE.value and isinstance(first_item, AgentExecutionInput):
                        captured_case = first_item
                    elif eid in {
                        AgentId.WEATHER.value,
                        AgentId.CROP.value,
                        AgentId.MARKET.value,
                        AgentId.SCHEME.value,
                        AgentId.RISK_ALERT.value,
                    }:
                        res = getattr(first_item, "result", first_item)
                        if isinstance(res, AgentResult):
                            completed_branches[res.agent_id] = res
                    elif eid == AgentId.COORDINATOR.value and isinstance(first_item, AdvisoryResponse):
                        final_output = first_item
                elif event_type == "output":
                    if isinstance(getattr(event, "data", None), AdvisoryResponse):
                        final_output = event.data

        try:
            if deadline_seconds is not None and deadline_seconds > 0:
                try:
                    async with asyncio.timeout(deadline_seconds):
                        await _consume_stream()
                except TimeoutError:
                    timeout_occurred = True
            else:
                await _consume_stream()

            if timeout_occurred:
                diag = InferenceDiagnostic(
                    code=InferenceDiagnosticCode.WORKFLOW_TIMEOUT,
                    stage=InferenceStage.WORKFLOW_EXECUTION,
                    provider=(
                        "gemini"
                        if mode is WorkflowMode.GEMINI
                        else (
                            "cerebras"
                            if mode is WorkflowMode.CEREBRAS
                            else ("groq" if mode is WorkflowMode.GROQ else "workflow")
                        )
                    ),
                    model_id=getattr(inference, "model_id", None),
                    agent_name=None,
                )
                if inference is not None and hasattr(inference, "_record_diagnostic"):
                    inference._record_diagnostic(diag)

                if captured_case is None:
                    captured_case = self._create_deterministic_case(request)

                now = _now()
                branch_order = (
                    AgentId.WEATHER,
                    AgentId.CROP,
                    AgentId.MARKET,
                    AgentId.SCHEME,
                    AgentId.RISK_ALERT,
                )
                branch_executions: list[AgentExecution] = []
                for agent_id in branch_order:
                    if agent_id in completed_branches:
                        branch_executions.append(
                            AgentExecution(captured_case, completed_branches[agent_id])
                        )
                    else:
                        cancelled_res = AgentResult(
                            agent_id=agent_id,
                            status=AgentStatus.CANCELLED,
                            started_at=now,
                            completed_at=now,
                            payload=None,
                        )
                        branch_executions.append(AgentExecution(captured_case, cancelled_res))

                deterministic_coordinator = CoordinatorAgent(None, WorkflowMode.DETERMINISTIC)
                fallback_response = await deterministic_coordinator.build_response(
                    branch_executions
                )
                return fallback_response

            if final_output is not None:
                return final_output

            run_result = await stream.get_final_response()
            outputs = run_result.get_outputs()
            if len(outputs) != 1 or not isinstance(outputs[0], AdvisoryResponse):
                raise RuntimeError("workflow completed without a typed advisory response")
            return outputs[0]
        finally:
            if coordinator._coordinator_reservation is not None:
                if active_inference is not None and callable(
                    getattr(active_inference, "release_reservation", None)
                ):
                    active_inference.release_reservation(coordinator._coordinator_reservation)
                coordinator._coordinator_reservation = None


def default_coverage_resolver() -> ContextResolver:
    """Build the default resolver with seeded validated coverage pairs."""
    from ..domain.seed import CROP_REGISTRY, LOCATION_REGISTRY, SEEDED_COVERAGE_REGISTRY

    return ContextResolver(CROP_REGISTRY, LOCATION_REGISTRY, SEEDED_COVERAGE_REGISTRY)


def empty_coverage_resolver() -> ContextResolver:
    """Build a fail-closed resolver when the repository has no seeded coverage pairs."""
    from ..domain import CoverageRegistry, RegistryMetadata
    from ..domain.seed import CROP_REGISTRY, LOCATION_REGISTRY

    metadata = RegistryMetadata(
        registry_id="agrosage:phase4-empty-coverage",
        version="phase4-v1",
        effective_from=date(2026, 1, 1),
        source_reference="local:phase4-coverage-unconfigured",
        scope_note="No validated crop/location pair is registered; source-level RAG filters remain authoritative.",
    )
    return ContextResolver(CROP_REGISTRY, LOCATION_REGISTRY, CoverageRegistry(metadata))


# Compatibility alias for legacy tests and references
RythuSaathiWorkflow = AgroSageWorkflow


__all__ = [
    "IntakeAgent",
    "WeatherAgent",
    "CropAgent",
    "MarketAgent",
    "SchemeAgent",
    "RiskAlertAgent",
    "CoordinatorAgent",
    "AgroSageWorkflow",
    "RythuSaathiWorkflow",
    "default_coverage_resolver",
    "empty_coverage_resolver",
    "DEFAULT_WORKFLOW_DEADLINE_SECONDS",
    "_format_evidence",
    "_format_workflow_progress_event",
    "_deduplicate_and_merge_scheme_hits",
    "_CoordinatorContextPack",
    "_build_coordinator_context",
    "_coordinator_agent_prompt_result",
    "_coordinator_citation_catalog",
    "_coordinator_retrieved_evidence",
    "_coordinator_remaining_tpm",
    "_specialist_cited_evidence_ids",
    "_conflict_supported_evidence_ids",
    "_coordinator_supported_evidence_ids",
    "_conflict_prompt_summaries",
    "_rank_and_deduplicate_evidence",
    "_merge_overlapping_excerpt",
    "_AgentWork",
    "_is_ungrounded_disease_diagnosis",
    "_is_ruling_out_disease_pressure",
    "_location_scopes",
    "_resolved_id",
    "_now",
    "_normalize",
    "_select_query_values",
    "_apply_ambiguities",
    "_intents_and_observations",
    "_INTAKE_PROMPT",
    "_COORDINATOR_PROMPT",
    "_SPECIALIST_PROMPT",
    "_INTAKE_OUTPUT_LIMIT_TOKENS",
    "_SPECIALIST_OUTPUT_LIMIT_TOKENS",
    "_COORDINATOR_OUTPUT_RESERVATION_TOKENS",
    "_GEMINI_INTAKE_OUTPUT_LIMIT_TOKENS",
    "_GEMINI_SPECIALIST_OUTPUT_LIMIT_TOKENS",
    "_GEMINI_COORDINATOR_OUTPUT_LIMIT_TOKENS",
    "_CEREBRAS_INTAKE_OUTPUT_LIMIT_TOKENS",
    "_CEREBRAS_SPECIALIST_OUTPUT_LIMIT_TOKENS",
    "_CEREBRAS_SCHEME_OUTPUT_LIMIT_TOKENS",
    "_CEREBRAS_COORDINATOR_OUTPUT_LIMIT_TOKENS",
    "_CEREBRAS_COORDINATOR_MINIMUM_RESERVATION_TOKENS",
    "_COORDINATOR_CONTEXT_SAFETY_MARGIN_TOKENS",
    "_COORDINATOR_PREFERRED_INPUT_TOKENS",
    "_COORDINATOR_MINIMUM_RESERVATION_TOKENS",
    "_UNGROUNDED_AGRONOMIC_CROP_PATTERN",
    "_UNGROUNDED_MARKET_TREND_PATTERN",
    "_RULING_OUT_DISEASE_PRESSURE_PATTERN",
    "_CONTRADICTORY_MARKET_EVIDENCE_PATTERN",
    "_UNGROUNDED_SCHEME_ELIGIBILITY_PATTERN",
    "_UNSUPPORTED_AGRONOMIC_RECOMMENDATION_PATTERN",
]
