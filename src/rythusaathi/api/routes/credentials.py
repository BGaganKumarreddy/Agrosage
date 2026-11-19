"""BYOK Credential vault routes: store, list, rotate, test, and delete encrypted provider keys."""

from __future__ import annotations

import time
from typing import Annotated

from agent_framework import Message
from fastapi import APIRouter, Depends, status

from ...agents.data_gov_in import DataGovInMarketProvider
from ...credentials import CredentialService
from ...inference import (
    InferenceRequest,
    ProviderCredential,
    ProviderFailure,
    ProviderFailureKind,
)
from ...inference.providers import CerebrasProvider, GeminiProvider, GroqProvider
from ...security import VerifiedIdentity
from ..dependencies import get_credential_service, get_current_identity
from ..exceptions import APIError
from ..schemas.common import SuccessResponse
from ..schemas.credentials import (
    CreateCredentialRequest,
    CredentialListResponse,
    CredentialResponse,
    RotateCredentialRequest,
    TestConnectionResponse,
    TestCredentialRequest,
)

router = APIRouter(prefix="/credentials", tags=["Credentials"])


async def _test_provider_key(provider_id: str, secret: str) -> TestConnectionResponse:
    clean_provider = provider_id.strip().lower()
    start = time.perf_counter()

    try:
        if clean_provider == "groq":
            provider = GroqProvider()
            req = InferenceRequest(
                messages=[Message(role="user", content="Ping")],
                options={"max_tokens": 5},
                agent_name="system",
            )
            await provider.complete(req, ProviderCredential(secret))
            latency = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                ok=True,
                provider_id="groq",
                status="connected",
                latency_ms=round(latency, 1),
                message="Connection verified successfully with Groq Cloud LPU.",
            )

        elif clean_provider == "cerebras":
            provider = CerebrasProvider()
            req = InferenceRequest(
                messages=[Message(role="user", content="Ping")],
                options={"max_tokens": 5},
                agent_name="system",
            )
            await provider.complete(req, ProviderCredential(secret))
            latency = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                ok=True,
                provider_id="cerebras",
                status="connected",
                latency_ms=round(latency, 1),
                message="Connection verified successfully with Cerebras Cloud Inference.",
            )

        elif clean_provider == "gemini":
            provider = GeminiProvider()
            req = InferenceRequest(
                messages=[Message(role="user", content="Ping")],
                options={"max_tokens": 5},
                agent_name="system",
            )
            await provider.complete(req, ProviderCredential(secret))
            latency = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                ok=True,
                provider_id="gemini",
                status="connected",
                latency_ms=round(latency, 1),
                message="Connection verified successfully with Google Gemini AI Studio.",
            )

        elif clean_provider == "data.gov.in":
            mandi = DataGovInMarketProvider(api_key=secret)
            await mandi.get_quote("ping-test", "crop:cotton", "location:state:in-tg")
            latency = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                ok=True,
                provider_id="data.gov.in",
                status="connected",
                latency_ms=round(latency, 1),
                message="Connection verified successfully with data.gov.in Mandi API.",
            )

        else:
            latency = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                ok=False,
                provider_id=provider_id,
                status="connection_error",
                latency_ms=round(latency, 1),
                message=f"Unsupported provider '{provider_id}'.",
            )

    except ProviderFailure as exc:
        latency = (time.perf_counter() - start) * 1000
        if exc.kind == ProviderFailureKind.AUTHENTICATION:
            return TestConnectionResponse(
                ok=False,
                provider_id=provider_id,
                status="invalid_credential",
                latency_ms=round(latency, 1),
                message="Authentication failed. The API key is invalid or unauthorized.",
            )
        elif exc.kind == ProviderFailureKind.RATE_LIMIT:
            return TestConnectionResponse(
                ok=False,
                provider_id=provider_id,
                status="rate_limited",
                latency_ms=round(latency, 1),
                message="Provider rate limit or quota exceeded.",
            )
        elif exc.kind in {ProviderFailureKind.TIMEOUT, ProviderFailureKind.NETWORK}:
            return TestConnectionResponse(
                ok=False,
                provider_id=provider_id,
                status="provider_unavailable",
                latency_ms=round(latency, 1),
                message="Provider endpoint timed out or is temporarily unavailable.",
            )
        else:
            return TestConnectionResponse(
                ok=False,
                provider_id=provider_id,
                status="connection_error",
                latency_ms=round(latency, 1),
                message="Provider rejected the request.",
            )
    except Exception:
        latency = (time.perf_counter() - start) * 1000
        return TestConnectionResponse(
            ok=False,
            provider_id=provider_id,
            status="connection_error",
            latency_ms=round(latency, 1),
            message="Connection test failed. Please verify network access and provider credentials.",
        )


@router.post(
    "",
    response_model=CredentialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store an encrypted BYOK API key in the vault",
)
async def create_credential(
    req: CreateCredentialRequest,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    credential_service: Annotated[CredentialService, Depends(get_credential_service)],
) -> CredentialResponse:
    try:
        status_rec = credential_service.create(
            identity=identity,
            provider_id=req.provider_id,
            secret=req.secret,
        )
    except ValueError as exc:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_credential_input",
            message=str(exc),
        )

    return CredentialResponse(
        credential_id=status_rec.credential_id,
        provider_id=status_rec.provider_id,
        state=status_rec.state.value,
        generation=status_rec.generation,
        updated_at=status_rec.updated_at,
    )


@router.get(
    "",
    response_model=CredentialListResponse,
    summary="List stored BYOK credentials for the current user and tenant",
)
async def list_credentials(
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    credential_service: Annotated[CredentialService, Depends(get_credential_service)],
) -> CredentialListResponse:
    statuses = credential_service.list_status(identity)
    items = [
        CredentialResponse(
            credential_id=s.credential_id,
            provider_id=s.provider_id,
            state=s.state.value,
            generation=s.generation,
            updated_at=s.updated_at,
        )
        for s in statuses
    ]
    return CredentialListResponse(items=items, total=len(items))


@router.put(
    "/{credential_id}",
    response_model=CredentialResponse,
    summary="Rotate/replace a stored credential in the encrypted vault",
)
async def rotate_credential(
    credential_id: str,
    req: RotateCredentialRequest,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    credential_service: Annotated[CredentialService, Depends(get_credential_service)],
) -> CredentialResponse:
    try:
        status_rec = credential_service.rotate(
            identity=identity,
            credential_id=credential_id,
            secret=req.secret,
        )
    except ValueError as exc:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_credential_input",
            message=str(exc),
        )

    return CredentialResponse(
        credential_id=status_rec.credential_id,
        provider_id=status_rec.provider_id,
        state=status_rec.state.value,
        generation=status_rec.generation,
        updated_at=status_rec.updated_at,
    )


@router.delete(
    "/{credential_id}",
    response_model=SuccessResponse,
    summary="Delete a stored credential from the encrypted vault",
)
async def delete_credential(
    credential_id: str,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    credential_service: Annotated[CredentialService, Depends(get_credential_service)],
) -> SuccessResponse:
    credential_service.delete(identity, credential_id)
    return SuccessResponse(message=f"Credential '{credential_id}' successfully deleted")


@router.post(
    "/test",
    response_model=TestConnectionResponse,
    summary="Test connection with an unsaved provider key before saving to vault",
)
async def test_unsaved_credential(
    req: TestCredentialRequest,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
) -> TestConnectionResponse:
    if not req.provider_id or not req.secret:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="invalid_credential_input",
            message="Both provider_id and secret are required to test connection",
        )
    return await _test_provider_key(req.provider_id, req.secret)


@router.post(
    "/{credential_id}/test",
    response_model=TestConnectionResponse,
    summary="Test connectivity using an existing stored credential from the vault",
)
async def test_stored_credential(
    credential_id: str,
    identity: Annotated[VerifiedIdentity, Depends(get_current_identity)],
    credential_service: Annotated[CredentialService, Depends(get_credential_service)],
) -> TestConnectionResponse:
    cred_status = credential_service.status(identity, credential_id)

    async def _run_test(secret_val: str, _gen: int) -> TestConnectionResponse:
        return await _test_provider_key(cred_status.provider_id, secret_val)

    coro = credential_service.dispatch_handoff(
        identity,
        credential_id,
        _run_test,
        expected_provider_id=cred_status.provider_id,
    )
    return await coro
