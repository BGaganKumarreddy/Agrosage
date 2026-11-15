"""Pydantic schemas for persistent farmer profile management."""

from __future__ import annotations

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class FarmProfileSchema(BaseModel):
    """Persistent farmer profile representing default farm parameters."""

    user_id: str
    tenant_id: str
    farm_name: str | None = None
    location: str | None = None
    location_id: str | None = None
    crop: str | None = None
    crop_id: str | None = None
    variety: str | None = None
    variety_id: str | None = None
    growth_stage: str | None = None
    sowing_date: str | None = None
    farm_size_acres: float | None = None
    area_unit: str = "acres"
    soil_type: str | None = None
    irrigation_source: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UpdateFarmProfileRequest(BaseModel):
    """Payload to create or update persistent farmer farm profile defaults."""

    farm_name: str | None = Field(default=None, max_length=150)
    location: str | None = None
    location_id: str | None = None
    crop: str | None = None
    crop_id: str | None = None
    variety: str | None = None
    variety_id: str | None = None
    growth_stage: str | None = None
    sowing_date: str | None = None
    farm_size_acres: float | None = Field(default=None, ge=0)
    area_unit: str | None = "acres"
    soil_type: str | None = None
    irrigation_source: str | None = None
