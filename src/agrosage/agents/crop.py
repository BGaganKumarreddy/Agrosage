"""Crop Agent: Retrieves verified agricultural knowledge and provides agronomic interpretations."""

from __future__ import annotations

import re

from ..domain import (
    AgentId,
    FactState,
)
from .llm import WorkflowInference
from ..knowledge import RetrievedChunk, RetrievalFilter, to_evidence_record
from .base import (
    _DomainAgent,
    _AgentWork,
    _resolved_id,
    _location_scopes,
    _record_finding,
    _model_statements,
    KnowledgeSearch,
)
from .contracts import (
    AgentExecutionInput,
    AgentStatus,
    RetrievalPayload,
    WorkflowMode,
)


class CropAgent(_DomainAgent):
    def __init__(
        self,
        knowledge: KnowledgeSearch,
        inference: WorkflowInference | None = None,
        mode: WorkflowMode = WorkflowMode.DETERMINISTIC,
    ):
        super().__init__(AgentId.CROP, inference, mode)
        self._knowledge = knowledge

    async def perform(self, case: AgentExecutionInput) -> _AgentWork:
        crop_id = _resolved_id(case.context.crop)
        location_id = _resolved_id(case.context.location)
        if not crop_id:
            detail = "Confirmed crop is required for scoped agricultural retrieval."
            return _AgentWork(
                AgentStatus.SKIPPED,
                RetrievalPayload(0, (), (), (), detail),
                detail,
            )

        if case.context.location.state is FactState.UNAVAILABLE:
            detail = "Unregistered location requires clarification before retrieving localized crop guidance."
            return _AgentWork(
                AgentStatus.SKIPPED,
                RetrievalPayload(0, (), (), (), detail),
                detail,
            )

        stage = (
            case.context.growth_stage.value
            if case.context.growth_stage.state is FactState.SUPPLIED
            else None
        )
        scopes = _location_scopes(location_id) if location_id else ()
        hits_with_tier: dict[str, tuple[RetrievedChunk, str]] = {}

        if location_id:
            local_scope = scopes[0] if scopes else location_id
            # Tier 1: Exact Match Retrieval (crop_id + local geography + growth_stage)
            if stage:
                for hit in self._knowledge.search(
                    case.request.query,
                    top_k=4,
                    filters=RetrievalFilter(
                        crop_id=crop_id, geography=local_scope, growth_stage=stage
                    ),
                ):
                    if hit.chunk.crop_id != crop_id:
                        continue
                    chunk_geos = hit.chunk.geographic_applicability or ()
                    tier = (
                        "tier_1_exact"
                        if (local_scope in chunk_geos)
                        else "tier_2_broader_geography"
                    )
                    hits_with_tier.setdefault(hit.chunk.chunk_id, (hit, tier))

            # Tier 2: Broader Geographic Evidence (same crop and stage across broader geographic scopes)
            if stage and len(hits_with_tier) < 2:
                for geo in scopes[1:]:
                    for hit in self._knowledge.search(
                        case.request.query,
                        top_k=4,
                        filters=RetrievalFilter(
                            crop_id=crop_id, geography=geo, growth_stage=stage
                        ),
                    ):
                        if hit.chunk.crop_id != crop_id:
                            continue
                        hits_with_tier.setdefault(
                            hit.chunk.chunk_id, (hit, "tier_2_broader_geography")
                        )

            # Tier 3: Broader Growth-Stage Evidence (same crop, relaxed stage, within location scopes)
            if not hits_with_tier:
                for geo in scopes:
                    for hit in self._knowledge.search(
                        case.request.query,
                        top_k=4,
                        filters=RetrievalFilter(crop_id=crop_id, geography=geo),
                    ):
                        if hit.chunk.crop_id != crop_id:
                            continue
                        hits_with_tier.setdefault(
                            hit.chunk.chunk_id, (hit, "tier_3_broader_stage")
                        )
                    if hits_with_tier:
                        break

            # Tier 4: Broader National Evidence (same crop, national or unrestricted geographic scope)
            if not hits_with_tier:
                query_lower = case.request.query.lower()
                is_pest_or_protection = any(
                    term in query_lower
                    for term in (
                        "pest",
                        "disease",
                        "bollworm",
                        "worm",
                        "caterpillar",
                        "borer",
                        "rust",
                        "blight",
                        "wilt",
                        "mildew",
                        "symptom",
                        "symptoms",
                        "ipm",
                        "pesticide",
                        "spray",
                        "trap",
                        "control",
                        "infest",
                        "damage",
                        "attack",
                        "pectinophora",
                        "gossypiella",
                        "helicoverpa",
                        "spodoptera",
                        "whitefly",
                        "aphid",
                        "thrips",
                        "jassid",
                        "mite",
                        "weevil",
                        "insect",
                        "larva",
                        "larvae",
                        "moth",
                        "egg",
                        "rosette",
                        "rosetted",
                        "locule",
                        "frass",
                        "stain",
                        "etl",
                        "nske",
                        "azadirachtin",
                        "parasitoid",
                        "trichogramma",
                    )
                )
                national_queries = [case.request.query]
                if (
                    case.context.location.state is FactState.SUPPLIED
                    and case.context.location.value
                ):
                    loc_disp = case.context.location.value.display_name
                    cleaned_q = re.sub(
                        rf"\b(?:in\s+)?{re.escape(loc_disp)}\b",
                        "",
                        case.request.query,
                        flags=re.IGNORECASE,
                    )
                    cleaned_q = re.sub(r"\s+", " ", cleaned_q).strip()
                    if cleaned_q and cleaned_q.lower() != case.request.query.lower():
                        national_queries.append(cleaned_q)

                if stage:
                    for q_candidate in national_queries:
                        for hit in self._knowledge.search(
                            q_candidate,
                            top_k=4,
                            filters=RetrievalFilter(crop_id=crop_id, growth_stage=stage),
                        ):
                            if hit.chunk.crop_id != crop_id:
                                continue
                            chunk_geos = hit.chunk.geographic_applicability or ()
                            if chunk_geos and "location:country:in" not in chunk_geos:
                                continue
                            hits_with_tier.setdefault(
                                hit.chunk.chunk_id, (hit, "tier_2_broader_geography")
                            )
                        if hits_with_tier:
                            break

                if not hits_with_tier and is_pest_or_protection:
                    for q_candidate in national_queries:
                        for hit in self._knowledge.search(
                            q_candidate,
                            top_k=4,
                            filters=RetrievalFilter(crop_id=crop_id),
                        ):
                            if hit.chunk.crop_id != crop_id:
                                continue
                            chunk_geos = hit.chunk.geographic_applicability or ()
                            if chunk_geos and "location:country:in" not in chunk_geos:
                                continue
                            hits_with_tier.setdefault(
                                hit.chunk.chunk_id, (hit, "tier_2_broader_geography")
                            )
                        if hits_with_tier:
                            break

        else:
            # Tier 4: General crop guidance (when location is unconfirmed)
            if stage:
                for hit in self._knowledge.search(
                    case.request.query,
                    top_k=4,
                    filters=RetrievalFilter(crop_id=crop_id, growth_stage=stage),
                ):
                    if hit.chunk.crop_id != crop_id:
                        continue
                    if (
                        hit.chunk.geographic_applicability
                        and "location:country:in" not in hit.chunk.geographic_applicability
                    ):
                        continue
                    hits_with_tier.setdefault(hit.chunk.chunk_id, (hit, "tier_1_exact"))

            if not hits_with_tier:
                for hit in self._knowledge.search(
                    case.request.query,
                    top_k=4,
                    filters=RetrievalFilter(crop_id=crop_id),
                ):
                    if hit.chunk.crop_id != crop_id:
                        continue
                    if (
                        hit.chunk.geographic_applicability
                        and "location:country:in" not in hit.chunk.geographic_applicability
                    ):
                        continue
                    tier = "tier_3_broader_stage" if stage else "tier_4_general_crop"
                    hits_with_tier.setdefault(hit.chunk.chunk_id, (hit, tier))

        prov_id = getattr(self._inference, "provider_id", None) or (
            self._mode.value
            if (
                self._inference is not None
                and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
            )
            else None
        )
        mod_id = getattr(self._inference, "model_id", None) if (
            self._inference is not None
            and self._mode in {WorkflowMode.GROQ, WorkflowMode.GEMINI, WorkflowMode.CEREBRAS}
        ) else None

        # Tier 5: Structured Limitation Result (Zero-Match Outcome)
        if not hits_with_tier:
            crop_name = (
                case.context.crop.value.display_name.title()
                if (
                    case.context.crop.state is FactState.SUPPLIED
                    and case.context.crop.value
                    and hasattr(case.context.crop.value.display_name, "title")
                )
                else crop_id
            )
            loc_name = (
                case.context.location.value.display_name
                if case.context.location.state is FactState.SUPPLIED
                else (location_id or "unspecified location")
            )
            note = (
                f"No verified agricultural guidance matched crop '{crop_name}' in {loc_name} "
                f"across exact or broader retrieval tiers. Field observations and consultation with local "
                f"KVK / agriculture department extension officers are advised."
            )
            finding_id = _record_finding(
                case,
                AgentId.CROP,
                "crop_guidance_limitation",
                note,
                (),
                uncertainty="No applicable extension guidance met the requested crop, geographic or growth-stage criteria.",
            )
            filters = [("crop_id", crop_id)]
            if location_id:
                filters.append(("geography", location_id))
            if stage:
                filters.append(("growth_stage", stage))
            filters.append(("retrieval_tier", "tier_5_limitation"))
            return _AgentWork(
                AgentStatus.COMPLETED,
                RetrievalPayload(
                    0,
                    (),
                    (),
                    tuple(filters),
                    note,
                    None,
                    "no_evidence_limitation",
                    None,
                    (),
                    prov_id,
                    mod_id,
                ),
                note,
                (),
                (finding_id,),
            )

        evidence_ids: list[str] = []
        finding_ids: list[str] = []
        sorted_hits = sorted(
            hits_with_tier.values(),
            key=lambda value: (-value[0].similarity, value[0].chunk.chunk_id),
        )[:4]
        dominant_tier = sorted_hits[0][1] if sorted_hits else "tier_1_exact"

        for hit, tier in sorted_hits:
            evidence = to_evidence_record(hit, request_id=case.request.request_id, tier=tier)
            case.board.writer_for(AgentId.CROP).publish_evidence(evidence)
            evidence_ids.append(evidence.evidence_id)
            finding_ids.append(
                _record_finding(
                    case,
                    AgentId.CROP,
                    f"crop_source:{evidence.evidence_id}",
                    f"Retrieved source excerpt: {evidence.excerpt or evidence.source.title}",
                    (evidence.evidence_id,),
                    uncertainty="Source applicability is limited to its recorded crop, geographic and stage metadata.",
                )
            )

        filters = [("crop_id", crop_id)]
        if location_id:
            filters.append(("geography", location_id))
        if stage:
            filters.append(("growth_stage", stage))
        filters.append(("retrieval_tier", dominant_tier))

        if not location_id:
            note = f"Retrieved {len(evidence_ids)} general crop-scoped source excerpt(s) without location refinement; this is not a diagnosis."
        else:
            note = f"Retrieved {len(evidence_ids)} crop-scoped source excerpt(s); this is not a diagnosis."

        interpretation, inference_status = await self.interpret(
            case,
            evidence_ids,
            "crop agronomy, symptom observation, and disease risk assessment; distinguish symptoms from confirmed diagnoses, cite retrieved evidence for any disease risks (such as rice blast), recommend field inspection and local KVK/extension consultation, never prescribe unverified chemical dosages, and keep output concise (maximum 3 key statements, under 250 words total)",
        )
        finding_ids.extend(self.publish_interpretation(case, interpretation))
        interpretation_mode = (
            self._mode.value
            if interpretation is not None
            else "deterministic_fallback"
            if inference_status is not None
            else "deterministic"
        )
        status = AgentStatus.COMPLETED
        if (inference_status is not None and inference_status != "completed") and evidence_ids:
            status = AgentStatus.PARTIAL

        return _AgentWork(
            status,
            RetrievalPayload(
                len(evidence_ids),
                tuple(evidence_ids),
                tuple(dict.fromkeys(hit.chunk.source.title for hit, _ in hits_with_tier.values())),
                tuple(filters),
                note,
                interpretation.summary if interpretation else None,
                interpretation_mode,
                inference_status,
                _model_statements(interpretation.statements) if interpretation else (),
                prov_id,
                mod_id,
            ),
            note,
            tuple(evidence_ids),
            tuple(finding_ids),
        )
