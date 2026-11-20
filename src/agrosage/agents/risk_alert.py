"""Risk Alert Agent: Evaluates evidence-grounded weather, crop disease, and insect pest risks."""

from __future__ import annotations

import uuid

from ..domain import (
    AgentId,
    EvidenceRecord,
    EvidenceStatus,
    FactState,
    RiskAlertItem,
    RiskEvidenceSufficiency,
    RiskSeverity,
    evaluate_disease_risks,
    evaluate_pest_risks,
    evaluate_weather_risks,
)
from .llm import WorkflowInference
from ..knowledge import RetrievedChunk, RetrievalFilter, to_evidence_record
from .base import (
    _DomainAgent,
    _AgentWork,
    _resolved_id,
    _location_scopes,
    _record_finding,
    KnowledgeSearch,
)
from .contracts import (
    AgentExecutionInput,
    AgentStatus,
    RiskAlertPayload,
    WeatherObservation,
    WeatherProvider,
    WorkflowMode,
)
from .intake_intelligence import is_market_only_turn


class RiskAlertAgent(_DomainAgent):
    """Seventh agent: evaluate evidence-grounded weather, crop disease, and insect pest risks."""

    def __init__(
        self,
        knowledge: KnowledgeSearch,
        weather_provider: WeatherProvider | None = None,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(AgentId.RISK_ALERT, inference, mode)
        self._knowledge = knowledge
        self._weather_provider = weather_provider

    async def perform(self, case: AgentExecutionInput) -> _AgentWork:
        if is_market_only_turn(case.request.query):
            detail = "Risk screening is skipped for a market-price-only request."
            return _AgentWork(
                AgentStatus.SKIPPED,
                RiskAlertPayload(0, (), detail, (), background_vulnerabilities=()),
                detail,
            )
        crop_id = _resolved_id(case.context.crop)
        location_id = _resolved_id(case.context.location)
        stage = (
            case.context.growth_stage.value
            if case.context.growth_stage.state is FactState.SUPPLIED
            else None
        )

        evidence_ids: list[str] = []
        finding_ids: list[str] = []
        all_alerts: list[RiskAlertItem] = []
        weather_ev_record: EvidenceRecord | None = None
        weather_obs: WeatherObservation | None = None
        w_alerts: list[RiskAlertItem] = []

        # 1. Weather Risks
        if self._weather_provider is not None and location_id is not None:
            try:
                weather_obs = await self._weather_provider.get_observation(
                    case.request.request_id, location_id
                )
                weather_ev_id = f"risk_alert:weather:{uuid.uuid4().hex}"
                units_str = "temperature: °C; rainfall: mm; humidity: %"
                weather_ev_record = EvidenceRecord(
                    evidence_id=weather_ev_id,
                    request_id=case.request.request_id,
                    source=weather_obs.source,
                    excerpt=(
                        f"Observed weather at {weather_obs.observed_at.isoformat()}: "
                        f"temp {weather_obs.temperature_c} °C, rain {weather_obs.rainfall_mm} mm, "
                        f"humidity {weather_obs.relative_humidity_pct}%, "
                        f"forecast: {weather_obs.forecast_summary or 'none'}."
                    ),
                    content_reference=weather_obs.source.reference,
                    retrieved_at=weather_obs.retrieved_at,
                    geographic_applicability=(location_id,),
                    provenance=f"Weather observation via {weather_obs.source.title}",
                    mode=weather_obs.mode,
                    status=EvidenceStatus.AVAILABLE,
                    units=units_str,
                )
                case.board.writer_for(AgentId.RISK_ALERT).publish_evidence(weather_ev_record)
                evidence_ids.append(weather_ev_id)
                w_alerts = evaluate_weather_risks(
                    request_id=case.request.request_id,
                    weather_obs=weather_obs,
                    location_id=location_id,
                    evidence_id=weather_ev_id,
                )
                all_alerts.extend(w_alerts)
            except Exception:
                weather_obs = None

        crop_name = case.context.crop.value.display_name if case.context.crop.value else ""
        scopes = _location_scopes(location_id) if location_id else ()

        query_text = case.request.query.casefold()
        risk_related_query = any(
            term in query_text
            for term in (
                "risk",
                "alert",
                "threat",
                "danger",
                "warning",
                "pest",
                "insect",
                "borer",
                "bollworm",
                "armyworm",
                "bug",
                "caterpillar",
                "disease",
                "blight",
                "blast",
                "rot",
                "rust",
                "spot",
                "virus",
                "dwarf",
                "infection",
                "infestation",
                "damage",
                "attack",
            )
        )

        # 2. Disease Risks
        disease_records: list[EvidenceRecord] = []
        d_alerts: list[RiskAlertItem] = []
        if crop_id:
            if risk_related_query:
                disease_hits: dict[str, RetrievedChunk] = {}
                d_queries = [
                    f"{crop_name} disease blast dwarfing blight {case.request.query}".strip(),
                    f"{crop_name} blast disease dwarfing".strip(),
                ]
                for q in d_queries:
                    for hit in self._knowledge.search(
                        q,
                        top_k=4,
                        filters=RetrievalFilter(crop_id=crop_id),
                    ):
                        if hit.chunk.geographic_applicability:
                            if scopes:
                                if not any(
                                    scope in hit.chunk.geographic_applicability for scope in scopes
                                ):
                                    continue
                            elif "location:country:in" not in hit.chunk.geographic_applicability:
                                continue
                        disease_hits.setdefault(hit.chunk.chunk_id, hit)

                existing_ev_ids = {e.evidence_id for e in case.board.evidence}
                for hit in disease_hits.values():
                    ev = to_evidence_record(hit, request_id=case.request.request_id)
                    if ev.evidence_id not in existing_ev_ids:
                        case.board.writer_for(AgentId.RISK_ALERT).publish_evidence(ev)
                        existing_ev_ids.add(ev.evidence_id)
                    disease_records.append(ev)
                    if ev.evidence_id not in evidence_ids:
                        evidence_ids.append(ev.evidence_id)
            else:
                disease_records = [
                    e
                    for e in case.board.evidence
                    if e.crop_applicability and crop_id in e.crop_applicability
                ]
                for ev in disease_records:
                    if ev.evidence_id not in evidence_ids:
                        evidence_ids.append(ev.evidence_id)

            d_alerts = evaluate_disease_risks(
                request_id=case.request.request_id,
                crop_id=crop_id,
                location_id=location_id,
                growth_stage=stage,
                evidence_records=disease_records,
                weather_obs=weather_obs,
                active_only=False,
                farmer_query=case.request.query,
            )

        # 3. Pest Risks
        pest_records: list[EvidenceRecord] = []
        p_alerts: list[RiskAlertItem] = []
        if crop_id:
            if risk_related_query:
                pest_hits: dict[str, RetrievedChunk] = {}
                p_queries = [
                    f"{crop_name} pest bollworm armyworm stem borer ipm {case.request.query}".strip(),
                    f"{crop_name} pink bollworm fall armyworm stem borer pest".strip(),
                ]
                for q in p_queries:
                    for hit in self._knowledge.search(
                        q,
                        top_k=4,
                        filters=RetrievalFilter(crop_id=crop_id),
                    ):
                        if hit.chunk.geographic_applicability:
                            if scopes:
                                if not any(
                                    scope in hit.chunk.geographic_applicability for scope in scopes
                                ):
                                    continue
                            elif "location:country:in" not in hit.chunk.geographic_applicability:
                                continue
                        pest_hits.setdefault(hit.chunk.chunk_id, hit)

                existing_ev_ids = {e.evidence_id for e in case.board.evidence}
                for hit in pest_hits.values():
                    ev = to_evidence_record(hit, request_id=case.request.request_id)
                    if ev.evidence_id not in existing_ev_ids:
                        case.board.writer_for(AgentId.RISK_ALERT).publish_evidence(ev)
                        existing_ev_ids.add(ev.evidence_id)
                    pest_records.append(ev)
                    if ev.evidence_id not in evidence_ids:
                        evidence_ids.append(ev.evidence_id)
            else:
                pest_records = [
                    e
                    for e in case.board.evidence
                    if e.crop_applicability and crop_id in e.crop_applicability
                ]
                for ev in pest_records:
                    if ev.evidence_id not in evidence_ids:
                        evidence_ids.append(ev.evidence_id)

            p_alerts = evaluate_pest_risks(
                request_id=case.request.request_id,
                crop_id=crop_id,
                location_id=location_id,
                growth_stage=stage,
                evidence_records=pest_records,
                active_only=False,
                farmer_query=case.request.query,
            )

        # Separate active alerts from background vulnerabilities
        all_evals = w_alerts + d_alerts + p_alerts
        active_alerts = [a for a in all_evals if getattr(a, "is_active", True)]
        background_items = [a for a in all_evals if not getattr(a, "is_active", True)]

        # Publish validated active alerts to blackboard
        for alert in active_alerts:
            case.board.writer_for(AgentId.RISK_ALERT).publish_risk_alert(alert)
            fid = _record_finding(
                case,
                AgentId.RISK_ALERT,
                f"risk_alert:{alert.category.value}",
                f"[{alert.severity.value.upper()}] {alert.title}: {alert.explanation} Recommended action: {alert.safe_action}",
                alert.evidence_ids,
                uncertainty=(
                    "Evidence-backed risk alert; verify local field conditions before taking action."
                    if alert.sufficiency is RiskEvidenceSufficiency.SUFFICIENT
                    else alert.explanation
                ),
            )
            finding_ids.append(fid)

        # Record background vulnerabilities as informational findings
        for bg in background_items:
            fid = _record_finding(
                case,
                AgentId.RISK_ALERT,
                "risk_alert:background",
                f"[BACKGROUND] {bg.title}: {bg.explanation} Recommended practice: {bg.safe_action}",
                bg.evidence_ids,
                uncertainty="General background crop vulnerability; no elevated active risk indicators detected.",
            )
            finding_ids.append(fid)

        # Deterministic risk alert assessment
        if active_alerts:
            summary = (
                f"Assessed {len(active_alerts)} active evidence-backed risk alert(s): "
                + "; ".join(f"[{a.severity.value.upper()}] {a.title}" for a in active_alerts)
                + "."
            )
        elif not crop_id:
            summary = "Crop is required for evidence-backed disease and pest risk assessment."
        elif not location_id and not (active_alerts or background_items):
            summary = "Location is required for agrometeorological risk assessment; crop disease and pest screening performed without location."
        elif not evidence_ids:
            summary = "No qualifying weather, disease, or pest evidence was available; zero speculative risks asserted."
        elif background_items:
            summary = "No active weather, disease, or pest risk thresholds exceeded; general crop susceptibilities retained as background context."
        else:
            summary = "No active weather, disease, or pest risk thresholds exceeded based on available evidence."

        status = AgentStatus.COMPLETED
        if not evidence_ids and not crop_id:
            status = AgentStatus.SKIPPED
        elif not evidence_ids and not location_id:
            status = AgentStatus.SKIPPED if not crop_id else AgentStatus.UNAVAILABLE
        elif not evidence_ids:
            status = AgentStatus.UNAVAILABLE

        return _AgentWork(
            status,
            RiskAlertPayload(
                alert_count=len(active_alerts),
                alerts=tuple(active_alerts),
                summary=summary,
                evidence_ids=tuple(evidence_ids),
                interpretation_mode="deterministic",
                inference_status=None,
                generated_statements=(),
                provider_id=None,
                model_id=None,
                background_vulnerabilities=tuple(background_items),
            ),
            summary,
            tuple(evidence_ids),
            tuple(finding_ids),
        )
