"""BYOK Credential request and response schemas."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CreateCredentialRequest(BaseModel):
    """Payload to store an encrypted BYOK credential in the vault."""

    model_config = ConfigDict(frozen=True)

    provider_id: str = Field(
        min_length=1,
        max_length=64,
        description="Target provider (e.g. cerebras, gemini, groq, data.gov.in)",
    )
    secret: str = Field(min_length=1, max_length=512, description="API key or secret token")


class RotateCredentialRequest(BaseModel):
    """Payload to update/rotate an existing credential's secret in the vault."""

    model_config = ConfigDict(frozen=True)

    secret: str = Field(min_length=1, max_length=512, description="New API key or secret token")


class TestCredentialRequest(BaseModel):
    """Payload to test an unsaved provider API key before storing."""

    model_config = ConfigDict(frozen=True)

    provider_id: str | None = Field(default=None, min_length=1, max_length=64)
    secret: str | None = Field(default=None, min_length=1, max_length=512)


class TestConnectionResponse(BaseModel):
    """Sanitized test connection result."""

    model_config = ConfigDict(frozen=True)

    ok: bool
    provider_id: str
    status: str  # connected, invalid_credential, rate_limited, provider_unavailable, connection_error
    latency_ms: float
    message: str


class CredentialResponse(BaseModel):
    """Non-secret status of a stored credential; the key is never returned."""

    model_config = ConfigDict(frozen=True)

    credential_id: str
    provider_id: str
    state: str
    generation: int
    updated_at: datetime


class CredentialListResponse(BaseModel):
    """List of active credentials for the authenticated tenant."""

    model_config = ConfigDict(frozen=True)

    items: list[CredentialResponse]
    total: int
