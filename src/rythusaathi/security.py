"""Provider-neutral identity and BYOK authorization contracts.

This module defines the trusted-principal boundary and permission policy. It
does not validate tokens or persist credentials; those implementations depend
on the approved identity provider, tenant-membership source, KMS, and store.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import StrEnum
from typing import Protocol


def _required_identifier(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError(f"{field_name} must be a non-empty, trimmed identifier")


def _aware(value: datetime, field_name: str) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field_name} must be timezone-aware")


@dataclass(frozen=True, slots=True)
class VerifiedIdentity:
    """Backend-only identity produced after validating an API access token.

    The identity adapter must validate signature, issuer, audience, token use,
    expiration, and active tenant membership before constructing this value.
    Request fields and unverified token claims are never accepted as identity.
    ``issuer`` plus ``subject`` is the stable user key; email is deliberately
    excluded because it can change or be reassigned.
    """

    issuer: str
    subject: str
    tenant_id: str
    roles: frozenset[IdentityRole]
    expires_at: datetime

    def __post_init__(self) -> None:
        _required_identifier(self.issuer, "issuer")
        _required_identifier(self.subject, "subject")
        _required_identifier(self.tenant_id, "tenant_id")
        if not isinstance(self.roles, frozenset) or any(
            not isinstance(role, IdentityRole) for role in self.roles
        ):
            raise ValueError("roles must be a frozenset of IdentityRole values")
        _aware(self.expires_at, "expires_at")

    @property
    def is_active(self) -> bool:
        return datetime.now(timezone.utc) < self.expires_at.astimezone(timezone.utc)


class AccessTokenVerifier(Protocol):
    """Adapter contract; concrete issuer and verification library are pending."""

    async def verify_access_token(self, token: str) -> VerifiedIdentity: ...


class IdentityRole(StrEnum):
    MEMBER = "member"
    TENANT_ADMIN = "tenant_admin"


@dataclass(frozen=True, slots=True)
class CredentialOwner:
    """Immutable owner binding for a user credential record."""

    tenant_id: str
    issuer: str
    subject: str

    def __post_init__(self) -> None:
        _required_identifier(self.tenant_id, "tenant_id")
        _required_identifier(self.issuer, "issuer")
        _required_identifier(self.subject, "subject")


class CredentialAction(StrEnum):
    CREATE = "create"
    STATUS = "status"
    USE = "use"
    ROTATE = "rotate"
    REVOKE = "revoke"
    DELETE = "delete"


class AuthorizationDenied(PermissionError):
    """Safe authorization error with no request or credential details."""

    def __init__(self) -> None:
        super().__init__("Credential operation is not authorized")


class CredentialAuthorizationPolicy:
    """Fail-closed owner-only policy for BYOK lifecycle operations."""

    @staticmethod
    def owner_for_creation(identity: VerifiedIdentity | None) -> CredentialOwner:
        """Derive ownership from verified identity, never caller-supplied IDs."""
        if not isinstance(identity, VerifiedIdentity) or not identity.is_active:
            raise AuthorizationDenied()
        return CredentialOwner(
            tenant_id=identity.tenant_id,
            issuer=identity.issuer,
            subject=identity.subject,
        )

    def authorize(
        self,
        identity: VerifiedIdentity | None,
        action: CredentialAction,
        owner: CredentialOwner,
    ) -> bool:
        if not isinstance(action, CredentialAction) or not isinstance(owner, CredentialOwner):
            return False
        if not isinstance(identity, VerifiedIdentity) or not identity.is_active:
            return False
        if identity.tenant_id != owner.tenant_id:
            return False
        if (identity.issuer, identity.subject) == (owner.issuer, owner.subject):
            return True
        return False

    def require(
        self,
        identity: VerifiedIdentity | None,
        action: CredentialAction,
        owner: CredentialOwner,
    ) -> None:
        if not self.authorize(identity, action, owner):
            raise AuthorizationDenied()


class CredentialState(StrEnum):
    ACTIVE = "active"
    REVOKED = "revoked"
    DELETED = "deleted"
    UNAVAILABLE = "unavailable"


@dataclass(frozen=True, slots=True)
class CredentialStatus:
    """Non-secret status response suitable for a web or CLI client."""

    credential_id: str
    provider_id: str
    state: CredentialState
    generation: int
    updated_at: datetime

    def __post_init__(self) -> None:
        _required_identifier(self.credential_id, "credential_id")
        _required_identifier(self.provider_id, "provider_id")
        if not isinstance(self.state, CredentialState):
            raise ValueError("state must be a CredentialState")
        if (
            isinstance(self.generation, bool)
            or not isinstance(self.generation, int)
            or self.generation < 1
        ):
            raise ValueError("generation must be a positive integer")
        _aware(self.updated_at, "updated_at")

    def to_dict(self) -> dict[str, str | int]:
        return {
            "credential_id": self.credential_id,
            "provider_id": self.provider_id,
            "state": self.state.value,
            "generation": self.generation,
            "updated_at": self.updated_at.isoformat(),
        }


class AuditOutcome(StrEnum):
    SUCCESS = "success"
    DENIED = "denied"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class CredentialAuditEvent:
    """Allowlisted audit fields; deliberately has no credential payload field."""

    event_id: str
    actor_tenant_id: str
    actor_issuer: str
    actor_subject: str
    credential_id: str
    action: CredentialAction
    outcome: AuditOutcome
    occurred_at: datetime

    def __post_init__(self) -> None:
        for field_name in (
            "event_id", "actor_tenant_id", "actor_issuer", "actor_subject",
            "credential_id",
        ):
            _required_identifier(getattr(self, field_name), field_name)
        if not isinstance(self.action, CredentialAction):
            raise ValueError("action must be a CredentialAction")
        if not isinstance(self.outcome, AuditOutcome):
            raise ValueError("outcome must be an AuditOutcome")
        _aware(self.occurred_at, "occurred_at")

    def to_dict(self) -> dict[str, str]:
        return {
            "event_id": self.event_id,
            "actor_tenant_id": self.actor_tenant_id,
            "actor_issuer": self.actor_issuer,
            "actor_subject": self.actor_subject,
            "credential_id": self.credential_id,
            "action": self.action.value,
            "outcome": self.outcome.value,
            "occurred_at": self.occurred_at.isoformat(),
        }


# =============================================================================
# Stage 5 — Diagnostic Redaction & Credential Safety Utility
# =============================================================================

import logging
import re
from typing import Any, Sequence

SYNTHETIC_TEST_SECRETS: tuple[str, ...] = (
    "TEST_CEREBRAS_SECRET_123",
    "TEST_GROQ_SECRET_456",
    "TEST_GEMINI_SECRET_789",
    "TEST_BEARER_TOKEN_ABC",
    "TEST_PASSWORD_XYZ",
)

_REDACTION_RULES: list[tuple[re.Pattern, str]] = [
    # Authorization header Bearer tokens
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9_\-\.]{6,}\b"), "Bearer [REDACTED]"),
    # Standard JSON Web Tokens (header.payload.signature starting with eyJ)
    (re.compile(r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b"), "[REDACTED_JWT]"),
    # Cerebras API keys (csk-...)
    (re.compile(r"\bcsk-[A-Za-z0-9]{16,}\b"), "[REDACTED_CEREBRAS_KEY]"),
    # Groq API keys (gsk_...)
    (re.compile(r"\bgsk_[A-Za-z0-9]{16,}\b"), "[REDACTED_GROQ_KEY]"),
    # Google Gemini API keys (AIza...)
    (re.compile(r"\bAIza[0-9A-Za-z-_]{35}\b"), "[REDACTED_GEMINI_KEY]"),
    # Explicit secret assignments (password=..., pwd: ..., api_key=...)
    (
        re.compile(r"(?i)\b(password|passwd|pwd|secret|api_key|token)\s*([:=])\s*['\"]?([^'\"\s,;]+)['\"]?"),
        r"\1\2[REDACTED]",
    ),
]


def redact_sensitive_text(text: str | None, custom_secrets: Sequence[str] = ()) -> str | None:
    """Scrub sensitive credentials, API keys, tokens, and synthetic test secrets from strings.

    Ensures API keys, bearer tokens, passwords, and decrypted BYOK secrets never appear
    in plaintext in error logs, exception messages, tracebacks, or diagnostic reports.
    """
    if text is None:
        return None
    if not isinstance(text, str):
        text = str(text)

    # 1. Redact known synthetic test secrets first
    for secret in SYNTHETIC_TEST_SECRETS:
        if secret in text:
            text = text.replace(secret, "[REDACTED]")

    # 2. Redact caller-specified custom secrets (e.g. active decrypted BYOK key)
    for secret in custom_secrets:
        if secret and secret in text:
            text = text.replace(secret, "[REDACTED]")

    # 3. Apply compiled regex pattern rules
    for pattern, replacement in _REDACTION_RULES:
        text = pattern.sub(replacement, text)

    return text


def sanitize_data_structure(data: Any, custom_secrets: Sequence[str] = ()) -> Any:
    """Recursively redact sensitive text within nested dicts, lists, and tuples."""
    if isinstance(data, str):
        return redact_sensitive_text(data, custom_secrets)
    if isinstance(data, dict):
        return {
            (redact_sensitive_text(k, custom_secrets) if isinstance(k, str) else k): sanitize_data_structure(v, custom_secrets)
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [sanitize_data_structure(item, custom_secrets) for item in data]
    if isinstance(data, tuple):
        return tuple(sanitize_data_structure(item, custom_secrets) for item in data)
    return data


class RedactingLoggingFilter(logging.Filter):
    """Logging filter that redacts secrets from record messages, args, and exc_text."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = sanitize_data_structure(record.args)
            elif isinstance(record.args, (list, tuple)):
                record.args = sanitize_data_structure(record.args)
        if record.exc_text:
            record.exc_text = redact_sensitive_text(record.exc_text)
        return True


class RedactingFormatter(logging.Formatter):
    """Logging formatter that passes the fully formatted record through redaction."""

    def format(self, record: logging.LogRecord) -> str:
        formatted = super().format(record)
        return redact_sensitive_text(formatted) or formatted


def install_redacting_logger(target_logger: logging.Logger | None = None) -> None:
    """Attach the redaction filter to root or designated application logger."""
    log = target_logger or logging.getLogger()
    redaction_filter = RedactingLoggingFilter()
    if not any(isinstance(f, RedactingLoggingFilter) for f in log.filters):
        log.addFilter(redaction_filter)
    for handler in log.handlers:
        if not any(isinstance(f, RedactingLoggingFilter) for f in handler.filters):
            handler.addFilter(redaction_filter)
