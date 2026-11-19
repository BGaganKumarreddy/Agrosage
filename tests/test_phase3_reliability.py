"""Phase 3 reliability regressions for crop normalization and RAG isolation."""

from __future__ import annotations

from pathlib import Path

import pytest

from agrosage.agents.intake_intelligence import evaluate_intake_decision
from agrosage.api.conversations import resolve_followup_context
from agrosage.api.schemas.conversations import (
    ClarificationQuestionSchema,
    ContextStateSchema,
)
from agrosage.domain.seed import CROP_REGISTRY
from agrosage.knowledge import (
    DocumentProcessor,
    HashEmbeddingProvider,
    LocalKnowledgeBase,
    RetrievalFilter,
    load_curated,
)


TOMATO_ID = "crop:solanum-lycopersicum"
COTTON_ID = "crop:gossypium-hirsutum"


@pytest.mark.parametrize(
    "value",
    ("tomato", "tomatoes", "crop tomato", "crop tomatoes", "crop tomotoes"),
)
def test_tomato_forms_resolve_to_the_canonical_crop(value: str) -> None:
    """The explicit clarification syntax and reported typo remain bounded aliases."""
    resolution = CROP_REGISTRY.resolve(value)

    assert resolution.canonical_id == TOMATO_ID


def test_tomato_context_survives_crop_then_location_clarifications() -> None:
    """A later answer must enrich, rather than replace, previously known context."""
    original = (
        "There are brown spots with concentric rings on older leaves of tomatoes. "
        "What could be the reason and how can I cure it?"
    )
    initial, _ = resolve_followup_context(ContextStateSchema(), original)

    assert initial.crop_id == TOMATO_ID
    assert initial.crop_confirmed is True
    assert "brown spots" in initial.observations
    first_decision = evaluate_intake_decision(query=original, context=initial)
    assert first_decision.next_question is None or first_decision.next_question.field != "crop"

    crop_question = ClarificationQuestionSchema(
        field="crop",
        text="Which crop are you asking about?",
    )
    after_crop, _ = resolve_followup_context(
        initial,
        "crop tomotoes",
        pending_question=crop_question,
    )
    location_question = ClarificationQuestionSchema(
        field="location",
        text="Where is your farm located?",
    )
    after_location, _ = resolve_followup_context(
        after_crop,
        "Warangal, Telangana",
        pending_question=location_question,
    )

    assert after_location.crop_id == TOMATO_ID
    assert after_location.crop_confirmed is True
    assert after_location.location_id == "location:state:in-tg"
    assert after_location.observations == initial.observations


@pytest.fixture(scope="module")
def agricultural_knowledge() -> LocalKnowledgeBase:
    root = Path(__file__).resolve().parents[1]
    documents = load_curated(root / "data/agricultural/icar_advisories.json", CROP_REGISTRY)
    processor = DocumentProcessor()
    knowledge = LocalKnowledgeBase(HashEmbeddingProvider())
    knowledge.add(
        chunk
        for document in documents
        for chunk in processor.process_curated(document)
    )
    return knowledge


def test_tomato_query_does_not_fall_back_to_unrelated_crop_evidence(
    agricultural_knowledge: LocalKnowledgeBase,
) -> None:
    """No tomato corpus entry means a no-evidence result, never a substituted crop."""
    hits = agricultural_knowledge.search(
        "brown spots with concentric rings on older leaves",
        filters=RetrievalFilter(crop_id=TOMATO_ID),
    )

    assert hits == ()


@pytest.mark.parametrize(
    "query",
    (
        "pink bollworm management cotton Warangal",
        "pink bollworm symptoms cotton",
        "Pectinophora gossypiella cotton",
        "rosette flowers cotton",
        "damaged cotton bolls",
    ),
)
def test_pink_bollworm_queries_retrieve_only_cotton_evidence(
    agricultural_knowledge: LocalKnowledgeBase,
    query: str,
) -> None:
    hits = agricultural_knowledge.search(
        query,
        filters=RetrievalFilter(crop_id=COTTON_ID),
    )

    assert hits
    assert all(hit.chunk.crop_id == COTTON_ID for hit in hits)
    assert any("pink bollworm" in hit.chunk.text.casefold() for hit in hits)
