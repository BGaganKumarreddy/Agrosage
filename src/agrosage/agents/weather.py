"""Weather Agent: Observes meteorological conditions and provides grounded interpretations."""

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
    _now,
    _resolved_id,
    _record_finding,
    _model_statements,
    _is_ungrounded_disease_diagnosis,
    _is_ruling_out_disease_pressure,
    _UNGROUNDED_AGRONOMIC_CROP_PATTERN,
)
from .contracts import (
    AgentExecutionInput,
    AgentStatus,
    ProviderPayload,
    WeatherProvider,
    WorkflowMode,
)
from .providers import UnavailableWeatherProvider
from .llm import SpecialistInterpretation, WorkflowInference
from .intake_intelligence import is_market_only_turn


class WeatherAgent(_DomainAgent):
    def __init__(
        self,
        provider: WeatherProvider | None = None,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(AgentId.WEATHER, inference, mode)
        self._provider = provider or UnavailableWeatherProvider()

    async def perform(self, case: AgentExecutionInput) -> _AgentWork:
        if is_market_only_turn(case.request.query):
            note = "Weather lookup is skipped for a market-price-only request."
            return _AgentWork(AgentStatus.SKIPPED, ProviderPayload(False, None, None, None, note), note)
        location_id = _resolved_id(case.context.location)
        if not location_id:
            note = "Weather lookup requires a registered location; none was supplied."
            return _AgentWork(
                AgentStatus.SKIPPED,
                ProviderPayload(False, None, None, None, note),
                note,
            )
        observation = await self._provider.get_observation(case.request.request_id, location_id)
        if observation is None:
            note = "No weather provider observation is available; no live weather value is asserted."
            return _AgentWork(
                AgentStatus.UNAVAILABLE,
                ProviderPayload(False, None, location_id, None, note),
                note,
            )
        if observation.request_id != case.request.request_id or observation.location_id != location_id:
            raise ValueError("weather provider returned data for a different request or location")
        values = []
        if observation.temperature_c is not None:
            values.append(f"temperature {observation.temperature_c:g} °C")
        if observation.rainfall_mm is not None:
            values.append(f"rainfall {observation.rainfall_mm:g} mm")
        if observation.relative_humidity_pct is not None:
            values.append(f"humidity {observation.relative_humidity_pct:g}%")
        if observation.wind_speed_kmh is not None:
            values.append(f"wind speed {observation.wind_speed_kmh:g} km/h")
        if observation.weather_condition:
            values.append(f"conditions {observation.weather_condition}")
        if observation.forecast_summary:
            values.append(f"forecast: {observation.forecast_summary}")
        excerpt = f"{', '.join(values)}; observed at {observation.observed_at.isoformat()}."
        note = (
            "Fixture weather value, not a real observation: "
            if observation.mode is EvidenceMode.FIXTURE
            else ""
        ) + excerpt
        unit_items = ["temperature: °C", "rainfall: mm"]
        if observation.relative_humidity_pct is not None:
            unit_items.append("humidity: %")
        if observation.wind_speed_kmh is not None:
            unit_items.append("wind: km/h")
        units_str = "; ".join(unit_items)
        evidence = EvidenceRecord(
            evidence_id=f"weather:{uuid.uuid4().hex}",
            request_id=case.request.request_id,
            source=observation.source,
            excerpt=note,
            content_reference=observation.source.reference,
            retrieved_at=observation.retrieved_at,
            geographic_applicability=(location_id,),
            provenance=f"Weather provider record observed at {observation.observed_at.isoformat()}",
            mode=observation.mode,
            status=EvidenceStatus.AVAILABLE,
            units=units_str,
            quality_notes=(
                ("Deterministic test fixture; not a live observation.",)
                if observation.mode is EvidenceMode.FIXTURE
                else ()
            ),
        )
        case.board.writer_for(AgentId.WEATHER).publish_evidence(evidence)
        finding = _record_finding(
            case,
            AgentId.WEATHER,
            "weather_observation",
            note,
            (evidence.evidence_id,),
            uncertainty=(
                "Fixture values are synthetic and must not guide field decisions."
                if observation.mode is EvidenceMode.FIXTURE
                else None
            ),
        )
        interpretation = None
        inference_status = None
        if (
            self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and observation.mode is not EvidenceMode.FIXTURE
        ):
            prov_id = getattr(self._inference, "provider_id", None) or self._mode.value
            mod_id = getattr(self._inference, "model_id", None)

            def _weather_validator(interp: SpecialistInterpretation) -> None:
                texts_to_check = [interp.summary] + [s.text for s in interp.statements]
                for text in texts_to_check:
                    if _is_ungrounded_disease_diagnosis(text):
                        outcome = "unsupported_disease_diagnosis"
                    elif _UNGROUNDED_AGRONOMIC_CROP_PATTERN.search(text):
                        outcome = "unsupported_agronomic_interpretation"
                    elif _is_ruling_out_disease_pressure(text):
                        outcome = "unsupported_disease_exclusion"
                    else:
                        outcome = None

                    if outcome is not None:
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
                            agent_name=AgentId.WEATHER.value.casefold(),
                            parsing_outcome=outcome,
                            validation_category="weather_grounding_validation_failure",
                            provider_error_message=f"Weather grounding failure: {outcome}",
                        )
                        raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE, diag)

            interpretation, inference_status = await self.interpret(
                case,
                (evidence.evidence_id,),
                "weather measurement interpretation reporting ONLY observed meteorological measurements and forecast facts. "
                "Weather measurements alone do not establish agronomic conclusions or crop stage suitability (such as flowering conditions). "
                "Never diagnose, confirm, or rule out disease or disease pressure (never claim 'no immediate weather-driven increase in fungal disease pressure' or rule out disease). "
                "Without crop-specific advisory evidence, report only factual temperature, humidity, rainfall, wind, and forecast conditions. "
                "A single weather snapshot cannot diagnose disease; field inspection and qualified local agricultural advice remain necessary.",
                validator=_weather_validator,
            )
        generated_findings = self.publish_interpretation(case, interpretation)
        interpretation_mode = (
            self._mode.value
            if interpretation is not None
            else "deterministic_fallback"
            if inference_status is not None
            else "not_run_fixture"
            if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and observation.mode is EvidenceMode.FIXTURE
            else "deterministic"
        )
        status = (
            AgentStatus.PARTIAL
            if observation.mode is EvidenceMode.FIXTURE
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
                observation.mode,
                location_id,
                observation.observed_at,
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
