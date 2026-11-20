"""Report registry recognition coverage separately from curated RAG coverage."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from agrosage.domain.seed import CROP_REGISTRY
from agrosage.knowledge import load_curated


def main() -> None:
    documents = load_curated(ROOT / "data" / "agricultural" / "icar_advisories.json", CROP_REGISTRY)
    by_crop: dict[str, list] = defaultdict(list)
    for document in documents:
        by_crop[document.crop_id].append(document)

    report = {
        "registry_version": CROP_REGISTRY.metadata.version,
        "registered_crops": len(CROP_REGISTRY.records),
        "crops_with_curated_documents": len(by_crop),
        "coverage": [
            {
                "crop_id": crop.crop_id,
                "crop": crop.common_names[0].value,
                "document_count": len(by_crop[crop.crop_id]),
                "topics": sorted({document.topic for document in by_crop[crop.crop_id]}),
                "geographic_applicability": sorted({
                    geography
                    for document in by_crop[crop.crop_id]
                    for geography in (document.geographic_applicability or ())
                }) or ["not explicitly scoped"],
                "important_missing_topics": (
                    ["No curated crop-specific document ingested yet"]
                    if not by_crop[crop.crop_id]
                    else []
                ),
            }
            for crop in CROP_REGISTRY.records
        ],
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
