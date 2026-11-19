"""Pydantic schemas for persistent agricultural conversations and follow-up messaging."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field, model_validator

from ...agents.contracts import WorkflowMode
from .advisory import (
    AgentResultSchema,
    EvidenceItemSchema,
    RiskAlertSchema,
)


class ClarificationQuestionSchema(BaseModel):
    """Structured, farmer-friendly question for gathering missing agricultural context."""

    field: str
    text: str
    options: list[str] = Field(default_factory=list)
    allow_free_text: bool = True
    allow_skip: bool = True


class IntakeDecisionSchema(BaseModel):
    """Typed Intake decision distinguishing whether context is sufficient for specialist execution."""

    decision: str
    understood_intent: str
    known_context: dict[str, str | None]
    missing_required_fields: list[str] = Field(default_factory=list)
    helpful_fields: list[str] = Field(default_factory=list)
    next_question: ClarificationQuestionSchema | None = None


class ContextStateSchema(BaseModel):
    """Accumulated agricultural context preserved across conversational turns."""

    crop: str | None = None
    crop_id: str | None = None
    crop_confirmed: bool = False
    location: str | None = None
    location_id: str | None = None
    growth_stage: str | None = None
    variety: str | None = None
    soil_info: str | None = None
    observations: list[str] = Field(default_factory=list)
    farming_problem: str | None = None
    confirmed_fields: list[str] = Field(default_factory=list)
    skipped_fields: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _sync_crop_confirmed(self) -> ContextStateSchema:
        if "crop" in self.confirmed_fields or bool(self.crop_id):
            self.crop_confirmed = True
        return self


class ConversationMessageSchema(BaseModel):
    """A single conversational message within an agricultural consultation."""

    message_id: str
    conversation_id: str
    role: str = Field(description="'user' or 'assistant'")
    content: str
    intent: str | None = None
    advisory_id: str | None = None
    agent_telemetry: list[AgentResultSchema] | None = None
    weather_evidence: list[EvidenceItemSchema] | None = None
    market_evidence: list[EvidenceItemSchema] | None = None
    scheme_evidence: list[EvidenceItemSchema] | None = None
    active_risk_alerts: list[RiskAlertSchema] | None = None
    uncertainty_and_limitations: list[str] | None = None
    suggested_next_steps: list[str] | None = None
    clarification: ClarificationQuestionSchema | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateConversationRequest(BaseModel):
    """Request payload to initiate a new persistent agricultural conversation."""

    title: str | None = Field(default=None, max_length=200)
    initial_message: str | None = Field(default=None, min_length=1)
    crop: str | None = None
    location: str | None = None
    growth_stage: str | None = None
    variety: str | None = None
    mode: WorkflowMode = WorkflowMode.DETERMINISTIC


class SendMessageRequest(BaseModel):
    """Request payload to continue an existing consultation with follow-up input."""

    content: str = Field(min_length=1, description="Farmer follow-up question or observation")
    crop: str | None = None
    location: str | None = None
    growth_stage: str | None = None
    variety: str | None = None
    mode: WorkflowMode = WorkflowMode.DETERMINISTIC


class UpdateConversationRequest(BaseModel):
    """Request payload to update conversation title or field context."""

    title: str | None = Field(default=None, max_length=200)
    crop: str | None = None
    location: str | None = None
    growth_stage: str | None = None
    variety: str | None = None



class ConversationSummarySchema(BaseModel):
    """Overview metadata for listing historical farmer conversations."""

    conversation_id: str
    title: str
    status: str
    crop: str | None = None
    location: str | None = None
    last_message_preview: str | None = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationDetailSchema(BaseModel):
    """Full conversational consultation details with messages and accumulated context."""

    conversation_id: str
    title: str
    status: str
    context: ContextStateSchema
    messages: list[ConversationMessageSchema] = Field(default_factory=list)
    pending_clarification: ClarificationQuestionSchema | None = None
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Paginated response for conversation listings."""

    items: list[ConversationSummarySchema]
    total: int
    limit: int
    offset: int
