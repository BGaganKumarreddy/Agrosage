"""Configuration routes exposing crops, locations, and supported inference providers."""

from __future__ import annotations

import math
from typing import Annotated

from fastapi import APIRouter, Depends, status

from ...domain.seed import CROP_REGISTRY, LOCATION_REGISTRY
from ...security import VerifiedIdentity
from ..dependencies import get_current_identity
from ..exceptions import APIError
from ..schemas.configuration import (
    CropSchema,
    GrowthStageItem,
    LocationSchema,
    ProviderSchema,
    ResolveLocationRequest,
    ResolvedLocationResponse,
    SupportedDistrictCandidate,
    VarietyItem,
)

router = APIRouter(prefix="/configuration", tags=["Configuration"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two geographic coordinates in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c



@router.get(
    "/crops",
    response_model=list[CropSchema],
    summary="List all registered crops, growth stages, and varieties",
)
async def list_crops() -> list[CropSchema]:
    crops: list[CropSchema] = []
    for crop in CROP_REGISTRY.records:
        common_names = [n.value for n in crop.common_names]
        growth_stages = [
            GrowthStageItem(
                stage_id=s.stage_id,
                names=[n.value for n in s.names],
                order=s.order,
            )
            for s in crop.growth_stages
        ]
        varieties = [
            VarietyItem(
                variety_id=v.variety_id,
                names=[n.value for n in v.names],
            )
            for v in crop.varieties
        ]
        crops.append(
            CropSchema(
                crop_id=crop.crop_id,
                common_names=common_names,
                scientific_name=crop.scientific_name,
                category=crop.category.value if hasattr(crop.category, "value") else str(crop.category),
                growth_stages=growth_stages,
                varieties=varieties,
            )
        )
    return crops


@router.get(
    "/locations",
    response_model=list[LocationSchema],
    summary="List all registered administrative geographic scopes",
)
async def list_locations() -> list[LocationSchema]:
    return [
        LocationSchema(
            location_id=loc.location_id,
            display_name=loc.name,
            level=loc.level.value if hasattr(loc.level, "value") else str(loc.level),
            parent_id=loc.parent_id,
        )
        for loc in LOCATION_REGISTRY.records
    ]


@router.get(
    "/providers",
    response_model=list[ProviderSchema],
    summary="List all available inference engines and external data services",
)
async def list_providers() -> list[ProviderSchema]:
    return [
        ProviderSchema(
            provider_id="deterministic",
            name="Deterministic Baseline",
            kind="inference",
            requires_credential=False,
            supported_models=[],
            description="Local deterministic fallback and rule-based agronomic synthesis without external LLM calls.",
        ),
        ProviderSchema(
            provider_id="cerebras",
            name="Cerebras Cloud Inference",
            kind="inference",
            requires_credential=True,
            supported_models=["gpt-oss-120b", "llama-3.3-70b", "llama3.1-8b"],
            description="Ultra-fast wafer-scale engine inference with 30,000 TPM limit for full seven-agent workflow.",
        ),
        ProviderSchema(
            provider_id="gemini",
            name="Google Gemini API",
            kind="inference",
            requires_credential=True,
            supported_models=["gemini-2.5-flash", "gemini-2.5-pro"],
            description="Google DeepMind multimodal reasoning models via Google AI Studio BYOK.",
        ),
        ProviderSchema(
            provider_id="groq",
            name="Groq Cloud LPU",
            kind="inference",
            requires_credential=True,
            supported_models=["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            description="Groq LPU hardware inference engine with 7,200 TPM reservation limits.",
        ),
        ProviderSchema(
            provider_id="open-meteo",
            name="Open-Meteo Weather API",
            kind="weather",
            requires_credential=False,
            supported_models=[],
            description="Free live weather observations, precipitation accumulation, and 3-day agricultural forecast.",
        ),
        ProviderSchema(
            provider_id="data.gov.in",
            name="data.gov.in Agmarknet Mandi Prices",
            kind="market",
            requires_credential=True,
            supported_models=[],
            description="Official Ministry of Agriculture daily APMC mandi market commodity prices.",
        ),
    ]


@router.post(
    "/resolve-location",
    response_model=ResolvedLocationResponse,
    summary="Resolve browser coordinates to a catalog-validated agricultural location",
)
async def resolve_location(
    req: ResolveLocationRequest,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
) -> ResolvedLocationResponse:
    """Resolve browser geolocation coordinates to the nearest validated agricultural district."""
    candidates: list[SupportedDistrictCandidate] = []
    for loc in LOCATION_REGISTRY.records:
        level_str = loc.level.value if hasattr(loc.level, "value") else str(loc.level)
        if level_str == "district" and loc.latitude is not None and loc.longitude is not None:
            dist = _haversine_km(req.latitude, req.longitude, loc.latitude, loc.longitude)
            parent_rec = LOCATION_REGISTRY.get(loc.parent_id) if loc.parent_id else None
            state_name = parent_rec.name if parent_rec else "India"
            candidates.append(
                SupportedDistrictCandidate(
                    location_id=loc.location_id,
                    display_name=loc.name,
                    district=loc.name,
                    state=state_name,
                    distance_km=round(dist, 1),
                )
            )

    candidates.sort(key=lambda c: c.distance_km)
    if not candidates:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="no_registered_locations",
            message="No catalog locations registered in the agricultural system.",
        )

    closest = candidates[0]
    closest_rec = LOCATION_REGISTRY.get(closest.location_id)
    state_id = closest_rec.parent_id if closest_rec else None
    parent_state = LOCATION_REGISTRY.get(state_id) if state_id else None
    state_name = parent_state.name if parent_state else closest.state
    within_threshold = closest.distance_km <= 250.0

    summary = (
        f"{closest.district}, {state_name} ({closest.distance_km:.1f} km from detected coordinates)"
        if within_threshold
        else f"Nearest supported center is {closest.district}, {state_name} ({closest.distance_km:.1f} km away; please confirm or manually select your district)"
    )

    return ResolvedLocationResponse(
        location_id=closest.location_id,
        display_name=closest.district,
        district=closest.district,
        state=state_name,
        state_id=state_id,
        distance_km=closest.distance_km,
        is_within_threshold=within_threshold,
        candidate_summary=summary,
        supported_districts=candidates,
    )
