"""Intelligent Conversational Intake and Progressive Clarification Engine.

Provides farmer-friendly clarification question prioritization, intent-driven
required vs. helpful field classification, and typed Intake decisions.
"""

from __future__ import annotations

import re
from typing import Any, Sequence

from .contracts import (
    ClarificationQuestion,
    IntakeDecision,
    IntakeDecisionType,
    WorkflowMode,
)
from ..domain import ContextFact, FactState
from ..domain.registry import RegistryLevel
from ..domain.seed import CROP_REGISTRY, LOCATION_REGISTRY

_WEATHER_INTENT_PATTERN = re.compile(
    r"\b(?:weather|rain|rainfall|forecast|temperature|temp|humidity|wind|cloud|storm|heatwave|precipitation)\b",
    re.I,
)
_MARKET_INTENT_PATTERN = re.compile(
    r"\b(?:market|price|mandi|rate|cost|sell|arrival|apmc|wholesale|quote|msp)\b",
    re.I,
)
_SCHEME_INTENT_PATTERN = re.compile(
    r"\b(?:scheme|pm[- ]?kisan|pmfby|insurance|subsidy|grant|aid|assistance|yojana|bharosa|financial|compensation)\b",
    re.I,
)
_SYMPTOM_INTENT_PATTERN = re.compile(
    r"\b(?:yellow|yellowing|turning yellow|spots?|lesions?|blight|blast|pests?|insects?|caterpillars?|borers?|whitefly|rot|disease|wilt|drying|curling|fungus|damage|infestation|spindle|chlorosis|stunt)\b",
    re.I,
)
_AGRONOMY_INTENT_PATTERN = re.compile(
    r"\b(?:grow|sow|sowing|plant|cultivate|fertilizer|fertiliser|irrigate|irrigation|water|harvest|yield|dose|management|spacing|variety)\b",
    re.I,
)

_UNCERTAINTY_PHRASES = re.compile(
    r"\b(?:i['’]?m not sure|not sure|don['’]?t know|i don['’]?t know|unknown|no idea|cannot say|can['’]?t say)\b",
    re.I,
)
_SKIP_PHRASES = re.compile(
    r"\b(?:skip|skip this question|pass|next|skip question)\b",
    re.I,
)


def _detect_primary_intent(query: str, observations: Sequence[str] = ()) -> str:
    """Classify farmer's message into a canonical conversational intent."""
    if _WEATHER_INTENT_PATTERN.search(query):
        return "weather"
    if _MARKET_INTENT_PATTERN.search(query):
        return "market"
    if _SCHEME_INTENT_PATTERN.search(query):
        return "scheme"
    if _SYMPTOM_INTENT_PATTERN.search(query) or observations:
        return "disease_or_pest"
    if _AGRONOMY_INTENT_PATTERN.search(query):
        return "crop_advice"
    return "general"


def _build_farmer_friendly_question(
    field: str,
    *,
    crop: str | None = None,
    location: str | None = None,
    intent: str = "general",
) -> ClarificationQuestion:
    """Build a jargon-free, supportive question with interactive choices."""
    if field == "crop":
        return ClarificationQuestion(
            field="crop",
            text="Which crop are you asking about?",
            options=(
                "Rice (Paddy)",
                "Cotton",
                "Wheat",
                "Maize",
                "Tomato",
                "Chilli",
                "I'm not sure",
            ),
            allow_free_text=True,
            allow_skip=True,
        )

    if field == "location":
        if intent == "weather":
            text = "Which location or district do you need the weather forecast for?"
        elif intent == "market":
            text = "Which state or district market (mandi) would you like prices for?"
        else:
            text = f"Where is your {crop or 'crop'} farm located? Please share your location (District or State)."

        return ClarificationQuestion(
            field="location",
            text=text,
            options=(
                "Warangal, Telangana",
                "Ludhiana, Punjab",
                "Bathinda, Punjab",
                "Guntur, Andhra Pradesh",
                "I'm not sure",
            ),
            allow_free_text=True,
            allow_skip=True,
        )

    if field == "growth_stage":
        crop_lower = (crop or "").lower()
        if "rice" in crop_lower or "paddy" in crop_lower:
            text = "How old is your rice crop?"
            options = (
                "Recently transplanted (under 2 weeks)",
                "Around one month (tillering)",
                "Two months or more (flowering/panicle)",
                "I'm not sure",
            )
        elif "cotton" in crop_lower:
            text = "What stage is your cotton crop in?"
            options = (
                "Early vegetative / seedling",
                "Squaring / branching",
                "Flowering / boll formation",
                "I'm not sure",
            )
        elif "wheat" in crop_lower:
            text = "What stage is your wheat crop in?"
            options = (
                "Crown root initiation / seedling",
                "Tillering / jointing",
                "Heading / flowering",
                "I'm not sure",
            )
        else:
            text = f"What growth stage is your {crop or 'crop'} currently in?"
            options = (
                "Early seedling / vegetative",
                "Flowering / developing",
                "Near maturity / harvest",
                "I'm not sure",
            )

        return ClarificationQuestion(
            field="growth_stage",
            text=text,
            options=options,
            allow_free_text=True,
            allow_skip=True,
        )

    # Fallback generic field question
    field_display = field.replace("_", " ").title()
    return ClarificationQuestion(
        field=field,
        text=f"Please provide your {field_display.lower()} for tailored advice:",
        options=("I'm not sure",),
        allow_free_text=True,
        allow_skip=True,
    )


def map_clarification_answer(
    field: str,
    answer: str,
    *,
    crop: str | None = None,
) -> tuple[str | None, str | None, bool]:
    """Map a farmer's conversational answer to a field value, field ID, and whether it was skipped/unknown.

    Returns:
        (canonical_value, canonical_id, is_unknown_or_skipped)
    """
    trimmed = answer.strip()
    if _UNCERTAINTY_PHRASES.search(trimmed):
        return None, None, True
    if _SKIP_PHRASES.search(trimmed):
        return None, None, True

    if field == "growth_stage":
        lower = trimmed.lower()
        if "squaring" in lower:
            return "squaring", None, False
        if any(term in lower for term in ("under 2 weeks", "recently", "transplanted", "seedling", "nursery")):
            return "seedling", None, False
        if any(term in lower for term in ("one month", "around one month", "tillering", "vegetative")):
            return "tillering", None, False
        if any(term in lower for term in ("two months", "flowering", "panicle", "heading", "boll")):
            return "flowering", None, False
        if any(term in lower for term in ("maturity", "harvest", "ripe", "ripening")):
            return "maturity", None, False
        return trimmed.lower(), None, False

    if field == "location":
        # Check district records first so e.g. "Warangal, Telangana" resolves to Warangal district rather than state Telangana
        district_records = [rec for rec in LOCATION_REGISTRY.records if rec.level == RegistryLevel.DISTRICT]
        for rec in district_records:
            if re.search(rf"\b{re.escape(rec.name)}\b", trimmed, re.I):
                return rec.name, rec.location_id, False
        for rec in LOCATION_REGISTRY.records:
            if re.search(rf"\b{re.escape(rec.name)}\b", trimmed, re.I):
                display = trimmed.strip().title() if ("," in trimmed or len(trimmed.split()) > 1) else rec.name
                return display, rec.location_id, False
        loc_res = LOCATION_REGISTRY.resolve(trimmed)
        if loc_res.canonical_id:
            loc_rec = LOCATION_REGISTRY.get(loc_res.canonical_id)
            name = loc_rec.name if loc_rec else trimmed
            return name, loc_res.canonical_id, False
        clean_loc = re.sub(r"^(?:my farm is in|i am from|located in|in|at)\s+", "", trimmed, flags=re.I).strip(" .")
        return clean_loc.title(), None, False

    if field == "crop":
        for rec in CROP_REGISTRY.records:
            names = [rec.scientific_name] + [v.value for v in rec.common_names] + [v.value for v in rec.regional_names]
            for n in names:
                if re.search(rf"\b{re.escape(n)}\b", trimmed, re.I):
                    canon = rec.common_names[0].value if rec.common_names else rec.scientific_name
                    return canon.title(), rec.crop_id, False
        crop_res = CROP_REGISTRY.resolve(trimmed)
        if crop_res.canonical_id:
            crop_rec = CROP_REGISTRY.get(crop_res.canonical_id)
            canon = crop_rec.common_names[0].value if crop_rec and crop_rec.common_names else (crop_rec.scientific_name if crop_rec else trimmed)
            return canon.title(), crop_res.canonical_id, False
        clean_crop = re.sub(r"^(?:i am growing|growing|it is|it's|crop is|my crop is)\s+", "", trimmed, flags=re.I).strip(" .")
        return clean_crop.title(), None, False

    return trimmed, None, False


def evaluate_intake_decision(
    *,
    query: str,
    context: Any,
    farm_profile: Any | None = None,
    mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
) -> IntakeDecision:
    """Evaluate whether available information is sufficient or requires farmer clarification.

    Distinguishes:
    - 'ready_for_advisory': all required fields confirmed.
    - 'needs_clarification': one or more required fields missing and not previously skipped.
    - 'partial_advisory': required fields missing but acknowledged as unknown or skipped by farmer.
    """
    # 1. Inspect existing confirmed context
    crop = getattr(context, "crop", None)
    crop_id = getattr(context, "crop_id", None)
    location = getattr(context, "location", None)
    location_id = getattr(context, "location_id", None)
    growth_stage = getattr(context, "growth_stage", None)
    variety = getattr(context, "variety", None)

    # Handle RequestContext where facts are ContextFact[EntityReference]
    if isinstance(crop, ContextFact):
        if crop.state is FactState.SUPPLIED and crop.value:
            crop_id = crop.value.canonical_id
            crop = crop.value.display_name
            crop_confirmed = True
        else:
            crop = None
            crop_id = None
            crop_confirmed = False
    else:
        crop_confirmed = bool(getattr(context, "crop_confirmed", False))
        if crop_id and CROP_REGISTRY.get(crop_id):
            crop_confirmed = True
        elif isinstance(crop, str) and crop.strip():
            resolved_crop = CROP_REGISTRY.resolve(crop)
            crop_confirmed = resolved_crop.canonical_id is not None
            if crop_confirmed:
                crop_id = resolved_crop.canonical_id
        if not crop_confirmed:
            crop = None
            crop_id = None

    if isinstance(location, ContextFact):
        if location.state is FactState.SUPPLIED and location.value:
            location_id = location.value.canonical_id
            location = location.value.display_name
        else:
            location = None
            location_id = None

    if isinstance(growth_stage, ContextFact):
        growth_stage = growth_stage.value if growth_stage.state is FactState.SUPPLIED else None

    if isinstance(variety, ContextFact):
        variety = variety.value.display_name if variety.state is FactState.SUPPLIED and variety.value else None

    observations = list(getattr(context, "observations", ()) or ())
    confirmed_fields = set(getattr(context, "confirmed_fields", ()) or ())
    skipped_fields = set(getattr(context, "skipped_fields", ()) or ())

    # 2. Inherit from saved farm profile defaults if not confirmed in conversation
    if not crop and farm_profile and getattr(farm_profile, "crop", None) and "crop" not in skipped_fields:
        crop = farm_profile.crop
        crop_id = getattr(farm_profile, "crop_id", None)
    if not location and farm_profile and getattr(farm_profile, "location", None) and "location" not in skipped_fields:
        location = farm_profile.location
        location_id = getattr(farm_profile, "location_id", None)
    if not growth_stage and farm_profile and getattr(farm_profile, "growth_stage", None) and "growth_stage" not in skipped_fields:
        growth_stage = farm_profile.growth_stage
    if not variety and farm_profile and getattr(farm_profile, "variety", None) and "variety" not in skipped_fields:
        variety = farm_profile.variety

    # 3. Detect intent and agricultural problem using query + context problem
    farming_problem = getattr(context, "farming_problem", None) or ""
    full_query_text = f"{farming_problem} {query}".strip()
    intent = _detect_primary_intent(full_query_text, observations)

    # 4. Classify Required vs. Helpful Information
    missing_required: list[str] = []
    helpful: list[str] = []

    if intent == "weather":
        understood_intent = "weather forecast and meteorological conditions"
        if not location and "location" not in skipped_fields:
            missing_required.append("location")
        if not crop and "crop" not in skipped_fields:
            helpful.append("crop")

    elif intent == "market":
        understood_intent = f"{crop or 'crop'} market arrivals and modal price discovery"
        if not crop and "crop" not in skipped_fields:
            missing_required.append("crop")
        if not location and "location" not in skipped_fields:
            helpful.append("location")

    elif intent == "scheme":
        understood_intent = "government agricultural scheme and subsidy advisory"
        if not crop and "crop" not in skipped_fields:
            helpful.append("crop")
        if not location and "location" not in skipped_fields:
            helpful.append("location")

    elif intent == "disease_or_pest":
        understood_intent = f"{crop or 'crop'} symptom assessment and disease/pest risk evaluation"
        if not crop and "crop" not in skipped_fields:
            missing_required.append("crop")
        else:
            # Check if stage or location should be prioritized for symptom inquiry
            is_yellowing = bool(re.search(r"\b(?:yellow|yellowing|chlorosis)\b", full_query_text, re.I))
            is_pest = bool(re.search(r"\b(?:caterpillars?|bollworms?|armyworms?|stem borer|pests?|insects?|borers?|whitefly)\b", full_query_text, re.I))

            if is_yellowing:
                if not growth_stage and "growth_stage" not in skipped_fields:
                    missing_required.append("growth_stage")
                if not location and "location" not in skipped_fields:
                    helpful.append("location")
            elif is_pest:
                # Dynamic pest risk alerts require location for regional advisory
                if not location and "location" not in skipped_fields:
                    missing_required.append("location")
                if not growth_stage and "growth_stage" not in skipped_fields:
                    helpful.append("growth_stage")
            else:
                # General agronomy and nationwide disease controls (ICAR) apply across locations
                if not location and "location" not in skipped_fields:
                    helpful.append("location")
                if not growth_stage and "growth_stage" not in skipped_fields:
                    helpful.append("growth_stage")

        if not variety and "variety" not in skipped_fields:
            helpful.append("variety")

    else:
        # General crop advice
        understood_intent = f"{crop or 'crop'} agronomic advisory and cultivation guidance"
        if not crop and "crop" not in skipped_fields:
            missing_required.append("crop")
        if not location and "location" not in skipped_fields:
            helpful.append("location")
        if not growth_stage and "growth_stage" not in skipped_fields:
            helpful.append("growth_stage")

    known_context: dict[str, str | None] = {
        "crop": crop,
        "location": location,
        "growth_stage": growth_stage,
        "variety": variety,
    }

    # 5. Decide next question and status
    if missing_required:
        # Prioritize single most impactful missing field: crop -> location -> growth_stage
        field_priority = ("crop", "location", "growth_stage")
        next_field = next((f for f in field_priority if f in missing_required), missing_required[0])
        next_question = _build_farmer_friendly_question(
            next_field,
            crop=crop,
            location=location,
            intent=intent,
        )
        return IntakeDecision(
            decision=IntakeDecisionType.NEEDS_CLARIFICATION,
            understood_intent=understood_intent,
            known_context=known_context,
            missing_required_fields=tuple(missing_required),
            helpful_fields=tuple(helpful),
            next_question=next_question,
        )

    # No unaddressed required fields
    if skipped_fields or helpful:
        decision_type = IntakeDecisionType.PARTIAL_ADVISORY
    else:
        decision_type = IntakeDecisionType.READY_FOR_ADVISORY

    return IntakeDecision(
        decision=decision_type,
        understood_intent=understood_intent,
        known_context=known_context,
        missing_required_fields=(),
        helpful_fields=tuple(helpful),
        next_question=None,
    )
