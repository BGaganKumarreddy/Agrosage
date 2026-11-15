"""FastAPI routes for persistent farmer farm profile defaults."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status

from ...security import VerifiedIdentity
from ..dependencies import get_current_identity, get_farm_profile_store
from ..exceptions import APIError
from ..profile import FarmProfileStore
from ..schemas.common import SuccessResponse
from ..schemas.profile import FarmProfileSchema, UpdateFarmProfileRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get(
    "/farm",
    response_model=FarmProfileSchema,
    summary="Get saved farm profile for authenticated user",
)
async def get_farm_profile(
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    profile_store: Annotated[FarmProfileStore, Depends(get_farm_profile_store)],
) -> FarmProfileSchema:
    profile = profile_store.get_profile(identity)
    if profile is None:
        # Return default empty profile scoped to user and tenant
        return FarmProfileSchema(
            user_id=identity.subject,
            tenant_id=identity.tenant_id,
            area_unit="acres",
        )
    return profile


@router.put(
    "/farm",
    response_model=FarmProfileSchema,
    summary="Create or update saved farm profile for authenticated user",
)
async def update_farm_profile(
    req: UpdateFarmProfileRequest,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    profile_store: Annotated[FarmProfileStore, Depends(get_farm_profile_store)],
) -> FarmProfileSchema:
    return profile_store.save_profile(identity, req)


@router.delete(
    "/farm",
    response_model=SuccessResponse,
    summary="Delete saved farm profile for authenticated user",
)
async def delete_farm_profile(
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    profile_store: Annotated[FarmProfileStore, Depends(get_farm_profile_store)],
) -> SuccessResponse:
    profile_store.delete_profile(identity)
    return SuccessResponse(message="Farm profile cleared successfully")
