"""Intake Agent: Extracts farmer intent, observations, and context mentions."""

from __future__ import annotations

import asyncio
from datetime import date
import re
from typing import Any, Sequence
import unicodedata

from agent_framework import Executor, handler, WorkflowContext

from ..domain import (
    AgentId,
    AdvisoryBoard,
    ContextFact,
    ContextResolutionRequest,
    ContextResolutionResult,
    ContextResolver,
    FactState,
    MissingInformation,
    MissingInformationReason,
    RegistryLevel,
    Resolution,
    ResolutionStatus,
    WorkflowMetadata,
)
from ..domain.seed import CROP_REGISTRY, LOCATION_REGISTRY
from ..inference import (
    ProviderFailure,
    ProviderFailureKind,
)
from .llm import WorkflowInference
from .base import (
    _now,
    _normalize,
    _inference_status,
    _quoted_in_query,
    _mention_supported_by_quote,
    _INTAKE_PROMPT,
    _INTAKE_OUTPUT_LIMIT_TOKENS,
    _GEMINI_INTAKE_OUTPUT_LIMIT_TOKENS,
    _CEREBRAS_INTAKE_OUTPUT_LIMIT_TOKENS,
)
from .contracts import (
    AgentExecutionInput,
    AgentResult,
    AgentStatus,
    FarmerIntent,
    FarmerRequest,
    IntakeDecision,
    IntakePayload,
    WorkflowMode,
)
from .intake_intelligence import evaluate_intake_decision
from .llm import (
    IntakeInterpretation,
    call_structured,
    make_json_request,
)


def _has_phrase(text: str, phrase: str) -> bool:
    normalized, candidate = _normalize(text), _normalize(phrase)
    if not candidate:
        return False
    if any(not char.isascii() for char in candidate):
        return candidate in normalized
    return re.search(rf"(?<![\w]){re.escape(candidate)}(?![\w])", normalized) is not None


def _has_positive_phrase(text: str, phrase: str) -> bool:
    normalized, candidate = _normalize(text), _normalize(phrase)
    if any(not char.isascii() for char in candidate):
        return _has_phrase(text, phrase)
    pattern = re.compile(rf"(?<![\w]){re.escape(candidate)}(?![\w])")
    for match in pattern.finditer(normalized):
        prefix = normalized[max(0, match.start() - 28) : match.start()]
        if re.search(r"\b(?:no|not|without|never)\s+(?:\w+\s+){0,2}$", prefix):
            continue
        return True
    return False


def _mention_candidates(text: str, candidates: Sequence[tuple[str, str]]) -> dict[str, set[str]]:
    matched: dict[str, set[str]] = {}
    for identifier, label in candidates:
        if _has_phrase(text, label):
            matched.setdefault(identifier, set()).add(label)
    return matched


def _crop_candidates(text: str) -> dict[str, set[str]]:
    candidates = []
    for crop in CROP_REGISTRY.records:
        for name in crop.common_names + crop.regional_names:
            candidates.append((crop.crop_id, name.value))
    matched: dict[str, set[str]] = {}
    for identifier, label in candidates:
        if _has_positive_phrase(text, label):
            matched.setdefault(identifier, set()).add(label)
    return matched


def _location_candidates(text: str) -> dict[str, set[str]]:
    candidates = []
    for location in LOCATION_REGISTRY.records:
        candidates.append((location.location_id, location.name))
        candidates.extend((location.location_id, alias.value) for alias in location.aliases)
    return _mention_candidates(text, candidates)


def _most_specific_locations(candidate_ids: set[str]) -> set[str]:
    if len(candidate_ids) < 2:
        return candidate_ids
    levels = {record.location_id: record.level for record in LOCATION_REGISTRY.records}
    deepest = max(
        (levels[item] for item in candidate_ids if item in levels),
        key=lambda level: list(RegistryLevel).index(level),
    )
    most_specific = {item for item in candidate_ids if levels.get(item) is deepest}
    if len(most_specific) == 1:
        selected = next(iter(most_specific))
        ancestors = {item.location_id for item in LOCATION_REGISTRY.ancestors(selected)}
        if candidate_ids <= ancestors:
            return {selected}
    return most_specific


def _select_query_values(
    request: FarmerRequest, extraction: IntakeInterpretation | None = None
) -> tuple[str | None, str | None, str | None, str | None, dict[str, tuple[str, ...]]]:
    text = request.query
    ambiguous: dict[str, tuple[str, ...]] = {}
    day = request.as_of or date.today()
    crop_query = request.crop_query
    if crop_query:
        if crop_query.startswith("crop:"):
            if not CROP_REGISTRY.get(crop_query, day):
                crop_query = crop_query.removeprefix("crop:").strip()

    if crop_query is None:
        crops = _crop_candidates(text)
        if len(crops) == 1:
            crop_id = next(iter(crops))
            crop = CROP_REGISTRY.get(crop_id)
            crop_query = crop.common_names[0].value if crop else None
        elif len(crops) > 1:
            ambiguous["crop"] = tuple(sorted(crops))
    else:
        resolved_crop = CROP_REGISTRY.resolve(crop_query, on_date=day)
        if resolved_crop.status is ResolutionStatus.NOT_FOUND:
            crops = _crop_candidates(text)
            if len(crops) == 1:
                crop_id = next(iter(crops))
                crop = CROP_REGISTRY.get(crop_id)
                crop_query = crop.common_names[0].value if crop else crop_query
            elif len(crops) > 1:
                ambiguous["crop"] = tuple(sorted(crops))

    location_query = request.location_query
    if location_query:
        if location_query.startswith("loc:"):
            location_query = location_query.removeprefix("loc:").strip()
        elif location_query.startswith("location:"):
            if not LOCATION_REGISTRY.get(location_query, day):
                location_query = location_query.removeprefix("location:").strip()

    if location_query is None:
        locations = _most_specific_locations(set(_location_candidates(text)))
        if len(locations) == 1:
            location_id = next(iter(locations))
            location = LOCATION_REGISTRY.get(location_id)
            location_query = location.name if location else None
        elif len(locations) > 1:
            ambiguous["location"] = tuple(sorted(locations))
    else:
        resolved_loc = LOCATION_REGISTRY.resolve(location_query, on_date=day)
        if resolved_loc.status is ResolutionStatus.NOT_FOUND:
            locations = _most_specific_locations(set(_location_candidates(text)))
            if len(locations) == 1:
                location_id = next(iter(locations))
                location = LOCATION_REGISTRY.get(location_id)
                location_query = location.name if location else location_query
            elif len(locations) > 1:
                ambiguous["location"] = tuple(sorted(locations))

    variety_query = request.variety_query
    growth_stage_query = request.growth_stage_query
    crop_resolution = CROP_REGISTRY.resolve(crop_query, on_date=day)
    if crop_resolution.status is ResolutionStatus.MATCHED:
        crop = CROP_REGISTRY.get(crop_resolution.canonical_id or "", day)
        if crop:
            if variety_query is None:
                varieties = _mention_candidates(
                    text,
                    [
                        (variant.variety_id, name.value)
                        for variant in crop.varieties
                        for name in variant.names
                    ],
                )
                if len(varieties) == 1:
                    variety_id = next(iter(varieties))
                    variety_query = next(
                        v.names[0].value for v in crop.varieties if v.variety_id == variety_id
                    )
                elif len(varieties) > 1:
                    ambiguous["crop_variety"] = tuple(sorted(varieties))
            if growth_stage_query is None:
                stages = _mention_candidates(
                    text,
                    [
                        (stage.stage_id, name.value)
                        for stage in crop.growth_stages
                        for name in stage.names
                    ],
                )
                if len(stages) == 1:
                    growth_stage_query = next(
                        name.value
                        for stage in crop.growth_stages
                        if stage.stage_id in stages
                        for name in stage.names
                        if _has_phrase(text, name.value)
                    )
                elif len(stages) > 1:
                    ambiguous["growth_stage"] = tuple(sorted(stages))
    else:
        if growth_stage_query is None:
            all_stage_candidates = [
                (stage.stage_id, name.value)
                for c in CROP_REGISTRY.records
                for stage in c.growth_stages
                for name in stage.names
            ]
            stages = _mention_candidates(text, all_stage_candidates)
            if len(stages) == 1:
                growth_stage_query = next(
                    name.value
                    for c in CROP_REGISTRY.records
                    for stage in c.growth_stages
                    if stage.stage_id in stages
                    for name in stage.names
                    if _has_phrase(text, name.value)
                )
            elif len(stages) > 1:
                ambiguous["growth_stage"] = tuple(sorted(stages))

    if extraction is not None:
        day = request.as_of or date.today()
        if request.crop_query is None:
            crop_ids = set(ambiguous.get("crop", ()))
            unregistered_crop_mentioned = False
            if crop_query:
                resolved = CROP_REGISTRY.resolve(crop_query, on_date=day)
                if resolved.status is ResolutionStatus.MATCHED and resolved.canonical_id:
                    crop_ids.add(resolved.canonical_id)
            for mention in extraction.crops:
                if not _mention_supported_by_quote(mention.value, mention.quote, text):
                    continue
                resolved = CROP_REGISTRY.resolve(mention.value, on_date=day)
                if resolved.status is ResolutionStatus.MATCHED and resolved.canonical_id:
                    crop_ids.add(resolved.canonical_id)
                elif resolved.status is ResolutionStatus.AMBIGUOUS:
                    crop_ids.update(resolved.candidate_ids)
                else:
                    unregistered_crop_mentioned = True
            if unregistered_crop_mentioned and len(crop_ids) <= 1:
                ambiguous.pop("crop", None)
                crop_query = None
            elif len(crop_ids) > 1:
                ambiguous["crop"] = tuple(sorted(crop_ids))
                crop_query = None
            elif len(crop_ids) == 1:
                crop = CROP_REGISTRY.get(next(iter(crop_ids)), day)
                crop_query = crop.common_names[0].value if crop else crop_query

        if request.location_query is None:
            location_ids = set(ambiguous.get("location", ()))
            unregistered_location_mentioned = False
            if location_query:
                resolved = LOCATION_REGISTRY.resolve(location_query, on_date=day)
                if resolved.status is ResolutionStatus.MATCHED and resolved.canonical_id:
                    location_ids.add(resolved.canonical_id)
            for mention in extraction.locations:
                if not _mention_supported_by_quote(mention.value, mention.quote, text):
                    continue
                resolved = LOCATION_REGISTRY.resolve(mention.value, on_date=day)
                if resolved.status is ResolutionStatus.MATCHED and resolved.canonical_id:
                    location_ids.add(resolved.canonical_id)
                elif resolved.status is ResolutionStatus.AMBIGUOUS:
                    location_ids.update(resolved.candidate_ids)
                else:
                    unregistered_location_mentioned = True
            location_ids = _most_specific_locations(location_ids)
            if unregistered_location_mentioned and len(location_ids) <= 1:
                ambiguous.pop("location", None)
                location_query = None
            elif len(location_ids) > 1:
                ambiguous["location"] = tuple(sorted(location_ids))
                location_query = None
            elif len(location_ids) == 1:
                location = LOCATION_REGISTRY.get(next(iter(location_ids)), day)
                location_query = location.name if location else location_query

        crop_resolution = CROP_REGISTRY.resolve(crop_query, on_date=day)
        if crop_resolution.status is ResolutionStatus.MATCHED and crop_resolution.canonical_id:
            crop = CROP_REGISTRY.get(crop_resolution.canonical_id, day)
            if crop and request.variety_query is None and variety_query is None:
                variety_ids = set(ambiguous.get("crop_variety", ()))
                for mention in extraction.varieties:
                    if _mention_supported_by_quote(mention.value, mention.quote, text):
                        resolved = CROP_REGISTRY.resolve_variety(crop.crop_id, mention.value)
                        if resolved.status is ResolutionStatus.MATCHED and resolved.canonical_id:
                            variety_ids.add(resolved.canonical_id)
                        elif resolved.status is ResolutionStatus.AMBIGUOUS:
                            variety_ids.update(resolved.candidate_ids)
                if len(variety_ids) > 1:
                    ambiguous["crop_variety"] = tuple(sorted(variety_ids))
                elif len(variety_ids) == 1:
                    variant = next(
                        (
                            item
                            for item in crop.varieties
                            if item.variety_id == next(iter(variety_ids))
                        ),
                        None,
                    )
                    variety_query = variant.names[0].value if variant else None

            if crop and request.growth_stage_query is None and growth_stage_query is None:
                stage_ids = set(ambiguous.get("growth_stage", ()))
                for mention in extraction.growth_stages:
                    if not _mention_supported_by_quote(mention.value, mention.quote, text):
                        continue
                    matched = [
                        stage
                        for stage in crop.growth_stages
                        if any(
                            _normalize(name.value) == _normalize(mention.value)
                            for name in stage.names
                        )
                    ]
                    stage_ids.update(stage.stage_id for stage in matched)
                if len(stage_ids) > 1:
                    ambiguous["growth_stage"] = tuple(sorted(stage_ids))
                elif len(stage_ids) == 1:
                    stage = next(
                        (
                            item
                            for item in crop.growth_stages
                            if item.stage_id == next(iter(stage_ids))
                        ),
                        None,
                    )
                    growth_stage_query = stage.names[0].value if stage else None

    return crop_query, location_query, variety_query, growth_stage_query, ambiguous


def _intents_and_observations(query: str) -> tuple[tuple[FarmerIntent, ...], tuple[str, ...]]:
    normalized = _normalize(query)
    intents: list[FarmerIntent] = []
    if any(term in normalized for term in ("scheme", "yojana", "benefit", "bharosa", "eligib")):
        intents.append(FarmerIntent.SCHEME)
    if any(term in normalized for term in ("market", "price", "mandi", "sell", "selling")):
        intents.append(FarmerIntent.MARKET)
    if any(
        term in normalized for term in ("weather", "rain", "rainfall", "temperature", "forecast")
    ):
        intents.append(FarmerIntent.WEATHER)
    if any(
        term in normalized
        for term in (
            "crop",
            "plant",
            "leaves",
            "leaf",
            "field",
            "what should i do",
            "cultivat",
            "irrigat",
            "fertiliz",
            "soil",
            "pest",
            "disease",
        )
    ):
        intents.append(FarmerIntent.CROP_ADVICE)
    if any(term in normalized for term in ("pest", "disease", "infection", "spots", "rot")):
        intents.append(FarmerIntent.DISEASE_OR_PEST)
    if not intents:
        intents.append(FarmerIntent.GENERAL)

    observations: list[str] = []
    signals = (
        (
            ("brown leaf spots", "brown leaf spot", "brown spots on leaves", "brown spots"),
            "brown leaf spots",
        ),
        (
            ("leaf spots", "spots on leaves", "spots on the leaves", "leaf spot"),
            "spots on leaves",
        ),
        (
            ("turning yellow", "yellow leaves", "yellowing", "yellow leaves", "yellowing leaves"),
            "yellowing leaves",
        ),
        (("wilting", "wilted"), "wilting"),
        (("holes in leaves", "holes in the leaves"), "holes in leaves"),
        (("stunted growth", "stunted plants"), "stunted growth"),
    )
    for phrases, label in signals:
        if any(_has_positive_phrase(query, phrase) for phrase in phrases):
            if label == "spots on leaves" and "brown leaf spots" in observations:
                continue
            if label not in observations:
                observations.append(label)
    return tuple(intents), tuple(observations)


def _apply_ambiguities(
    result: ContextResolutionResult, ambiguous: dict[str, tuple[str, ...]]
) -> ContextResolutionResult:
    if not ambiguous:
        return result
    context = result.context
    location, crop = result.location, result.crop
    variety, stage = result.variety, result.growth_stage
    replacements = {
        "crop": ("crop", ResolutionStatus.AMBIGUOUS, "Please select one crop."),
        "location": ("location", ResolutionStatus.AMBIGUOUS, "Please select one location."),
        "crop_variety": ("variety", ResolutionStatus.AMBIGUOUS, "Please select one variety."),
        "growth_stage": (
            "growth_stage",
            ResolutionStatus.AMBIGUOUS,
            "Please select one growth stage.",
        ),
    }
    missing = [item for item in context.missing_information if item.field_name not in ambiguous]
    for field_name, candidates in ambiguous.items():
        target, _status, question = replacements[field_name]
        missing.append(
            MissingInformation(
                field_name=field_name,
                question=question,
                reason=MissingInformationReason.AMBIGUOUS,
            )
        )
        unavailable = ContextFact.unavailable("The request names more than one registered choice.")
        if target == "crop":
            crop = Resolution(
                status=ResolutionStatus.AMBIGUOUS, candidate_ids=candidates, message=question
            )
            context = context.model_copy(update={"crop": unavailable})
        elif target == "location":
            location = Resolution(
                status=ResolutionStatus.AMBIGUOUS, candidate_ids=candidates, message=question
            )
            context = context.model_copy(update={"location": unavailable})
        elif target == "variety":
            variety = Resolution(
                status=ResolutionStatus.AMBIGUOUS, candidate_ids=candidates, message=question
            )
            context = context.model_copy(update={"crop_variety": unavailable})
        else:
            stage = Resolution(
                status=ResolutionStatus.AMBIGUOUS, candidate_ids=candidates, message=question
            )
            context = context.model_copy(update={"growth_stage": unavailable})
    coverage = result.coverage
    if "crop" in ambiguous or "location" in ambiguous:
        coverage = Resolution(
            status=ResolutionStatus.MISSING,
            message="crop and location must be resolved before coverage",
        )
    context = context.model_copy(update={"missing_information": tuple(missing)})
    return result.model_copy(
        update={
            "context": context,
            "crop": crop,
            "location": location,
            "variety": variety,
            "growth_stage": stage,
            "coverage": coverage,
        }
    )


class IntakeAgent(Executor):
    """Resolve only named registry values and preserve every omitted field as unknown."""

    def __init__(
        self,
        resolver: ContextResolver,
        cancellation_event: asyncio.Event | None = None,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(id=AgentId.INTAKE.value)
        self._resolver = resolver
        self._cancellation_event = cancellation_event
        self._inference = inference
        self._mode = mode

    @classmethod
    def evaluate_conversational_decision(
        cls,
        *,
        query: str,
        context: Any,
        farm_profile: Any | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ) -> IntakeDecision:
        """Evaluate conversational intake sufficiency and prioritize clarification questions."""
        return evaluate_intake_decision(
            query=query,
            context=context,
            farm_profile=farm_profile,
            mode=mode,
        )

    @handler(input=FarmerRequest, output=AgentExecutionInput)
    async def handle(
        self,
        request: FarmerRequest,
        workflow: WorkflowContext[FarmerRequest, AgentExecutionInput],
    ) -> None:
        started_at = _now()
        extraction: IntakeInterpretation | None = None
        inference_status: str | None = None
        if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}:
            try:
                raw = await call_structured(
                    self._inference,
                    make_json_request(
                        _INTAKE_PROMPT,
                        {
                            "farmer_message": request.query,
                            "explicit_fields": {
                                "crop": request.crop_query,
                                "location": request.location_query,
                                "variety": request.variety_query,
                                "growth_stage": request.growth_stage_query,
                            },
                        },
                        IntakeInterpretation,
                        agent_name=AgentId.INTAKE.value.casefold(),
                        max_output_tokens=(
                            _GEMINI_INTAKE_OUTPUT_LIMIT_TOKENS
                            if self._mode is WorkflowMode.GEMINI
                            else (
                                _CEREBRAS_INTAKE_OUTPUT_LIMIT_TOKENS
                                if self._mode is WorkflowMode.CEREBRAS
                                else _INTAKE_OUTPUT_LIMIT_TOKENS
                            )
                        ),
                    ),
                    expected_user_id=request.user_id,
                    expected_tenant_id=request.tenant_id,
                    response_model=IntakeInterpretation,
                )
                extraction = IntakeInterpretation.model_validate(raw)
                quoted = [
                    mention
                    for group in (
                        extraction.crops,
                        extraction.locations,
                        extraction.varieties,
                        extraction.growth_stages,
                    )
                    for mention in group
                ]
                if any(
                    not _mention_supported_by_quote(item.value, item.quote, request.query)
                    for item in quoted
                ):
                    raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE)
                quoted_observations = list(extraction.observations)
                if extraction.farming_problem is not None:
                    quoted_observations.append(extraction.farming_problem)
                if any(
                    not _quoted_in_query(item.quote, request.query)
                    for item in quoted_observations
                ):
                    raise ProviderFailure(ProviderFailureKind.MALFORMED_RESPONSE)
            except Exception as exc:
                extraction = None
                inference_status = _inference_status(exc)
        crop, location, variety, stage, ambiguous = _select_query_values(request, extraction)
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
        if extraction is not None:
            inferred_intents = tuple(FarmerIntent(value) for value in extraction.intents)
            intents = tuple(dict.fromkeys((*inferred_intents, *intents)))
            quoted_observations = tuple(
                f"Reported phrase: {item.quote}"
                for item in extraction.observations
                if _quoted_in_query(item.quote, request.query)
            )
            observations = tuple(dict.fromkeys((*quoted_observations, *observations)))
        missing = tuple(item.field_name for item in resolution.context.missing_information)
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
        interpretation_mode = (
            self._mode.value
            if extraction is not None
            else (
                "deterministic_fallback"
                if self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
                else "deterministic"
            )
        )
        if (
            self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            and inference_status is None
        ):
            inference_status = "completed" if extraction is not None else "unavailable"
        summary += f" Interpretation mode: {interpretation_mode}."
        finding_id = board.writer_for(AgentId.INTAKE).publish_finding(
            topic="intake_context",
            claim=summary,
            missing_information=missing,
            uncertainty=(
                "LLM-extracted candidates were checked against quoted user text and canonical registries; no cause or missing fact is inferred."
                if extraction is not None
                else "Intent and symptom extraction use deterministic phrase rules; no cause or missing fact is inferred."
            ),
        ).finding_id
        status_finding_id = board.writer_for(AgentId.INTAKE).publish_finding(
            topic="execution:intake",
            claim=f"{'partial' if interpretation_mode == 'deterministic_fallback' else 'completed'}: registry resolution finished using {interpretation_mode} interpretation.",
            missing_information=missing,
        ).finding_id
        prov_id = getattr(self._inference, "provider_id", None) or (
            self._mode.value
            if (
                self._inference is not None
                and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            )
            else None
        )
        mod_id = (
            getattr(self._inference, "model_id", None)
            if (
                self._inference is not None
                and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            )
            else None
        )
        intake_decision = evaluate_intake_decision(
            query=request.query,
            context=resolution.context,
            mode=self._mode,
        )
        payload = IntakePayload(
            resolution.context,
            resolution,
            intents,
            observations,
            tuple(ambiguous),
            interpretation_mode,
            inference_status,
            extraction.farming_problem.quote if extraction and extraction.farming_problem else None,
            prov_id,
            mod_id,
            intake_decision,
        )
        result = AgentResult(
            agent_id=AgentId.INTAKE,
            status=(
                AgentStatus.PARTIAL
                if interpretation_mode == "deterministic_fallback"
                else AgentStatus.COMPLETED
            ),
            started_at=started_at,
            completed_at=_now(),
            payload=payload,
            finding_ids=(finding_id, status_finding_id),
            provider_id=prov_id,
            model_id=mod_id,
        )
        case = AgentExecutionInput(request, resolution, board, result, self._cancellation_event)
        await workflow.send_message(case)
