"""Owner- and tenant-scoped persistent farm profile store."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from ..domain.seed import CROP_REGISTRY, LOCATION_REGISTRY
from ..security import VerifiedIdentity
from .history import _history_db
from .schemas.profile import FarmProfileSchema, UpdateFarmProfileRequest

logger = logging.getLogger(__name__)


def initialize_profile_schema(path: str | Path) -> None:
    """Initialize persistent SQLite table for farmer farm profile defaults."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with _history_db(path) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS farmer_profiles (
            user_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            farm_name TEXT,
            location TEXT,
            location_id TEXT,
            crop TEXT,
            crop_id TEXT,
            variety TEXT,
            variety_id TEXT,
            growth_stage TEXT,
            sowing_date TEXT,
            farm_size_acres REAL,
            area_unit TEXT DEFAULT 'acres',
            soil_type TEXT,
            irrigation_source TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (tenant_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS ix_farmer_profiles_owner
            ON farmer_profiles(tenant_id, user_id);
        """)


class FarmProfileStore:
    """Persistent SQLite store for authenticated farmer farm profile defaults."""

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        initialize_profile_schema(self.db_path)

    def get_profile(self, identity: VerifiedIdentity) -> FarmProfileSchema | None:
        """Retrieve the farm profile for the authenticated tenant and user."""
        with _history_db(self.db_path) as db:
            row = db.execute(
                """
                SELECT user_id, tenant_id, farm_name, location, location_id,
                       crop, crop_id, variety, variety_id, growth_stage,
                       sowing_date, farm_size_acres, area_unit, soil_type,
                       irrigation_source, created_at, updated_at
                FROM farmer_profiles
                WHERE tenant_id = ? AND user_id = ?
                """,
                (identity.tenant_id, identity.subject),
            ).fetchone()

            if not row:
                return None

            return FarmProfileSchema(
                user_id=row["user_id"],
                tenant_id=row["tenant_id"],
                farm_name=row["farm_name"],
                location=row["location"],
                location_id=row["location_id"],
                crop=row["crop"],
                crop_id=row["crop_id"],
                variety=row["variety"],
                variety_id=row["variety_id"],
                growth_stage=row["growth_stage"],
                sowing_date=row["sowing_date"],
                farm_size_acres=row["farm_size_acres"],
                area_unit=row["area_unit"] or "acres",
                soil_type=row["soil_type"],
                irrigation_source=row["irrigation_source"],
                created_at=datetime.fromisoformat(row["created_at"]),
                updated_at=datetime.fromisoformat(row["updated_at"]),
            )

    def save_profile(
        self, identity: VerifiedIdentity, req: UpdateFarmProfileRequest
    ) -> FarmProfileSchema:
        """Create or update the farm profile for the authenticated tenant and user."""
        now = datetime.now(timezone.utc).isoformat()
        current = self.get_profile(identity)

        # Canonicalize location if provided
        resolved_location = req.location.strip() if req.location is not None else (current.location if current else None)
        resolved_location_id = req.location_id if req.location_id is not None else (current.location_id if current else None)
        if req.location is not None and req.location.strip():
            loc_match = LOCATION_REGISTRY.resolve(req.location.strip())
            if loc_match.status.value in {"resolved", "matched"} and loc_match.canonical_id:
                loc_rec = LOCATION_REGISTRY.get(loc_match.canonical_id)
                resolved_location = loc_rec.name if loc_rec else req.location.strip()
                resolved_location_id = loc_match.canonical_id

        # Canonicalize crop if provided
        resolved_crop = req.crop.strip() if req.crop is not None else (current.crop if current else None)
        resolved_crop_id = req.crop_id if req.crop_id is not None else (current.crop_id if current else None)
        if req.crop is not None and req.crop.strip():
            crop_match = CROP_REGISTRY.resolve(req.crop.strip())
            if crop_match.status.value in {"resolved", "matched"} and crop_match.canonical_id:
                crop_rec = CROP_REGISTRY.get(crop_match.canonical_id)
                resolved_crop = (
                    crop_rec.common_names[0].value.title()
                    if (crop_rec and crop_rec.common_names)
                    else req.crop.strip()
                )
                resolved_crop_id = crop_match.canonical_id

        farm_name = req.farm_name if req.farm_name is not None else (current.farm_name if current else None)
        variety = req.variety if req.variety is not None else (current.variety if current else None)
        variety_id = req.variety_id if req.variety_id is not None else (current.variety_id if current else None)
        growth_stage = req.growth_stage if req.growth_stage is not None else (current.growth_stage if current else None)
        sowing_date = req.sowing_date if req.sowing_date is not None else (current.sowing_date if current else None)
        farm_size_acres = req.farm_size_acres if req.farm_size_acres is not None else (current.farm_size_acres if current else None)
        area_unit = req.area_unit if req.area_unit is not None else (current.area_unit if current else "acres")
        soil_type = req.soil_type if req.soil_type is not None else (current.soil_type if current else None)
        irrigation_source = req.irrigation_source if req.irrigation_source is not None else (current.irrigation_source if current else None)

        created_at = current.created_at.isoformat() if current and current.created_at else now

        with _history_db(self.db_path) as db:
            db.execute(
                """
                INSERT INTO farmer_profiles (
                    user_id, tenant_id, farm_name, location, location_id,
                    crop, crop_id, variety, variety_id, growth_stage,
                    sowing_date, farm_size_acres, area_unit, soil_type,
                    irrigation_source, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tenant_id, user_id) DO UPDATE SET
                    farm_name = excluded.farm_name,
                    location = excluded.location,
                    location_id = excluded.location_id,
                    crop = excluded.crop,
                    crop_id = excluded.crop_id,
                    variety = excluded.variety,
                    variety_id = excluded.variety_id,
                    growth_stage = excluded.growth_stage,
                    sowing_date = excluded.sowing_date,
                    farm_size_acres = excluded.farm_size_acres,
                    area_unit = excluded.area_unit,
                    soil_type = excluded.soil_type,
                    irrigation_source = excluded.irrigation_source,
                    updated_at = excluded.updated_at
                """,
                (
                    identity.subject,
                    identity.tenant_id,
                    farm_name,
                    resolved_location,
                    resolved_location_id,
                    resolved_crop,
                    resolved_crop_id,
                    variety,
                    variety_id,
                    growth_stage,
                    sowing_date,
                    farm_size_acres,
                    area_unit,
                    soil_type,
                    irrigation_source,
                    created_at,
                    now,
                ),
            )

        return self.get_profile(identity) or FarmProfileSchema(
            user_id=identity.subject,
            tenant_id=identity.tenant_id,
            farm_name=farm_name,
            location=resolved_location,
            location_id=resolved_location_id,
            crop=resolved_crop,
            crop_id=resolved_crop_id,
            variety=variety,
            variety_id=variety_id,
            growth_stage=growth_stage,
            sowing_date=sowing_date,
            farm_size_acres=farm_size_acres,
            area_unit=area_unit,
            soil_type=soil_type,
            irrigation_source=irrigation_source,
            created_at=datetime.fromisoformat(created_at),
            updated_at=datetime.fromisoformat(now),
        )

    def delete_profile(self, identity: VerifiedIdentity) -> bool:
        """Delete the farm profile for the authenticated tenant and user."""
        with _history_db(self.db_path) as db:
            cur = db.execute(
                "DELETE FROM farmer_profiles WHERE tenant_id = ? AND user_id = ?",
                (identity.tenant_id, identity.subject),
            )
            return cur.rowcount > 0
