"""Phase 3 reliability regressions for crop normalization and RAG isolation."""

from __future__ import annotations

from pathlib import Path

import pytest

from agrosage.agents.intake_intelligence import (
    evaluate_intake_decision,
    is_market_only_turn,
    starts_independent_task,
)
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
BANANA_ID = "crop:musa-spp"
RICE_ID = "crop:oryza-sativa"


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


def test_banana_rice_terminology_mismatch_requires_confirmation_and_preserves_report() -> None:
    report = (
        "My banana crops are growing abnormally tall, pale, weak seedlings "
        "that die early or produce empty panicles."
    )
    initial, _ = resolve_followup_context(ContextStateSchema(), report)
    initial.farming_problem = report

    assert initial.crop_id == BANANA_ID
    assert initial.crop == "Banana"
    assert initial.farming_problem == report
    assert {"abnormally tall", "pale", "weak seedlings", "seedlings that die early", "empty panicles"} <= set(initial.observations)

    decision = evaluate_intake_decision(query=report, context=initial)
    assert decision.next_question is not None
    assert decision.next_question.field == "crop"
    assert "banana" in decision.next_question.text.lower()
    assert "rice" in decision.next_question.text.lower()

    banana_answer, _ = resolve_followup_context(
        initial,
        "Banana",
        pending_question=ClarificationQuestionSchema(
            field="crop", text=decision.next_question.text,
        ),
    )
    assert banana_answer.crop_id == BANANA_ID
    assert banana_answer.farming_problem == report
    assert "crop_symptom_consistency_checked" in banana_answer.confirmed_fields
    assert evaluate_intake_decision(query="Banana", context=banana_answer).next_question is None

    rice_answer, _ = resolve_followup_context(
        initial,
        "Rice",
        pending_question=ClarificationQuestionSchema(
            field="crop", text=decision.next_question.text,
        ),
    )
    assert rice_answer.crop_id == RICE_ID
    assert rice_answer.farming_problem == report


def test_banana_mismatch_cannot_retrieve_rice_evidence(
    agricultural_knowledge: LocalKnowledgeBase,
) -> None:
    banana_hits = agricultural_knowledge.search(
        "abnormally tall pale weak seedlings empty panicles",
        filters=RetrievalFilter(crop_id=BANANA_ID),
    )
    rice_hits = agricultural_knowledge.search(
        "rice foot rot Bakanae seed borne",
        filters=RetrievalFilter(crop_id=RICE_ID),
    )

    assert banana_hits == ()
    assert rice_hits
    assert all(hit.chunk.crop_id == RICE_ID for hit in rice_hits)


def test_market_turn_is_independent_of_a_previous_pink_bollworm_task() -> None:
    prior = "What are the common symptoms of pink bollworm in cotton and recommended IPM control measures?"
    current = "What is the market price for cotton?"

    assert starts_independent_task(current, prior)
    assert is_market_only_turn(current)

    previous, _ = resolve_followup_context(ContextStateSchema(), prior)
    previous.farming_problem = prior
    # This mirrors the route's task-context reset while retaining durable crop.
    previous.observations = []
    previous.growth_stage = None
    previous.farming_problem = current

    decision = evaluate_intake_decision(query=current, context=previous)
    assert decision.understood_intent == "Cotton market arrivals and modal price discovery"
    assert decision.next_question is None


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
