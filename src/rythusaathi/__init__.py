"""Compatibility shim redirecting legacy rythusaathi imports to agrosage."""
from __future__ import annotations

import sys
import agrosage

sys.modules["rythusaathi"] = agrosage

_SUBMODULES = [
    "agents", "agents.contracts", "agents.base", "agents.coordinator", "agents.crop",
    "agents.data_gov_in", "agents.intake", "agents.intake_intelligence", "agents.llm",
    "agents.market", "agents.open_meteo", "agents.providers", "agents.risk_alert",
    "agents.scheme", "agents.weather", "agents.workflow",
    "api", "api.app", "api.conversations", "api.dependencies", "api.exceptions",
    "api.history", "api.profile", "api.routes", "api.schemas",
    "api.schemas.admin", "api.schemas.advisory", "api.schemas.auth", "api.schemas.common",
    "api.schemas.configuration", "api.schemas.conversations", "api.schemas.credentials",
    "api.schemas.history", "api.schemas.profile",
    "api.routes.admin", "api.routes.advisory", "api.routes.auth", "api.routes.configuration",
    "api.routes.conversations", "api.routes.credentials", "api.routes.history", "api.routes.profile",
    "domain", "domain.board", "domain.evidence", "domain.models", "domain.recommendations",
    "domain.registry", "domain.resolution", "domain.risks", "domain.seed",
    "inference", "inference.contracts", "inference.service", "inference.providers",
    "inference.providers.cerebras", "inference.providers.gemini", "inference.providers.groq",
    "knowledge", "knowledge.adapters", "knowledge.embeddings", "knowledge.evidence",
    "knowledge.file_adapters", "knowledge.ingestion", "knowledge.models",
    "knowledge.persistent", "knowledge.processing", "knowledge.retrieval",
    "credentials", "local_auth", "recovery", "security",
]

for _sub in _SUBMODULES:
    try:
        _mod = __import__(f"agrosage.{_sub}", fromlist=["*"])
        sys.modules[f"rythusaathi.{_sub}"] = _mod
    except ImportError:
        pass
