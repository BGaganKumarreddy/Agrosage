"""Small, source-attributed starter catalogs; these are not complete registries."""

from datetime import date

from .registry import (CoverageRegistry, CropCategory, CropRecord, CropRegistry, GrowthStageRecord,
                       LocationRecord, LocationRegistry, NameVariant, RegistryLevel,
                       RegistryMetadata, VarietyRecord)

SEED_VERSION = "seed-2026.11-v1"
_CROP_SEED_VERSION = "seed-2026.11-v3"
_EFFECTIVE_FROM = date(2026, 1, 1)

CROP_REGISTRY_METADATA = RegistryMetadata(
    registry_id="agrosage:crop-seed", version=_CROP_SEED_VERSION,
    effective_from=_EFFECTIVE_FROM, source_reference="https://powo.science.kew.org/",
    scope_note="Small cited starter catalog; absence does not mean a crop is unsupported in agriculture.",
)

RICE = CropRecord(
    crop_id="crop:oryza-sativa",
    common_names=(NameVariant(value="rice"), NameVariant(value="paddy")),
    regional_names=(NameVariant(value="వరి", language="te", region_id="location:state:in-tg"),),
    scientific_name="Oryza sativa L.", category=CropCategory.CEREAL,
    varieties=(
        VarietyRecord(
            variety_id="variety:oryza-sativa:pusa-basmati-1121",
            names=(NameVariant(value="Pusa Basmati 1121"),),
            source_reference="https://icar.org.in/en/crop-science/basmati-rice-varieties",
        ),
        VarietyRecord(
            variety_id="variety:oryza-sativa:bpt-5204",
            names=(NameVariant(value="BPT 5204"), NameVariant(value="Samba Mahsuri")),
            source_reference="https://icar-iirr.org/research/varieties",
        ),
        VarietyRecord(
            variety_id="variety:oryza-sativa:mtu-1010",
            names=(NameVariant(value="MTU 1010"), NameVariant(value="Cottondora Sannalu")),
            source_reference="https://icar-iirr.org/research/varieties",
        ),
        VarietyRecord(
            variety_id="variety:oryza-sativa:swarna",
            names=(NameVariant(value="Swarna"), NameVariant(value="MTU 7029")),
            source_reference="https://icar-iirr.org/research/varieties",
        ),
        VarietyRecord(
            variety_id="variety:oryza-sativa:ir-64",
            names=(NameVariant(value="IR 64"),),
            source_reference="https://icar-iirr.org/research/varieties",
        ),
    ),
    growth_stages=(
        GrowthStageRecord(stage_id="seedling", names=(NameVariant(value="seedling"),), order=10,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="tillering", names=(NameVariant(value="tillering"),), order=20,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="panicle-initiation", names=(NameVariant(value="panicle initiation"),), order=30,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="booting", names=(NameVariant(value="booting"),), order=40,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="heading", names=(NameVariant(value="heading"),), order=50,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="grain-filling", names=(NameVariant(value="grain filling"),), order=60,
                          source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"),
        GrowthStageRecord(stage_id="maturity", names=(NameVariant(value="maturity"),), order=70,
                          source_reference="https://epubs.icar.org.in/index.php/JISAS/article/view/171327"),
    ),
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:316812-2",
                       "https://icar.org.in/en/crop-science/basmati-rice-varieties",
                       "https://www.icar.gov.in/sites/default/files/Circulars/ICAR%20Kharif%20Agro-Advisories%20for%20Farmers%202025__multi%20language%2B%2BNew.pdf"),
    effective_from=_EFFECTIVE_FROM,
)

WHEAT = CropRecord(
    crop_id="crop:triticum-aestivum",
    common_names=(NameVariant(value="wheat"), NameVariant(value="bread wheat")),
    scientific_name="Triticum aestivum L.", category=CropCategory.CEREAL,
    varieties=(VarietyRecord(
        variety_id="variety:triticum-aestivum:hd-3226",
        names=(NameVariant(value="HD 3226"),), source_reference="https://icar.org.in/en/node/12081",
    ),),
    source_references=("https://powo.science.kew.org/taxon/332110-2",),
    effective_from=_EFFECTIVE_FROM,
)

COTTON = CropRecord(
    crop_id="crop:gossypium-hirsutum",
    common_names=(NameVariant(value="cotton"), NameVariant(value="American cotton")),
    scientific_name="Gossypium hirsutum L.", category=CropCategory.FIBRE,
    varieties=(VarietyRecord(
        variety_id="variety:gossypium-hirsutum:f-2228",
        names=(NameVariant(value="F 2228"), NameVariant(value="F2228")),
        source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        applicable_region_ids=("location:state:in-pb",),
    ),),
    growth_stages=(
        GrowthStageRecord(
            stage_id="seedling",
            names=(NameVariant(value="seedling"), NameVariant(value="germination")),
            order=10,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
        GrowthStageRecord(
            stage_id="vegetative",
            names=(NameVariant(value="vegetative"), NameVariant(value="vegetative growth")),
            order=20,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
        GrowthStageRecord(
            stage_id="squaring",
            names=(NameVariant(value="squaring"), NameVariant(value="square formation"), NameVariant(value="square")),
            order=30,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
        GrowthStageRecord(
            stage_id="flowering",
            names=(NameVariant(value="flowering"), NameVariant(value="bloom"), NameVariant(value="flower")),
            order=40,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
        GrowthStageRecord(
            stage_id="boll-development",
            names=(NameVariant(value="boll development"), NameVariant(value="boll formation"), NameVariant(value="boll")),
            order=50,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
        GrowthStageRecord(
            stage_id="maturity",
            names=(NameVariant(value="maturity"), NameVariant(value="boll opening"), NameVariant(value="boll bursting")),
            order=60,
            source_reference="https://www.icar.org.in/sites/default/files/Circulars/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
        ),
    ),
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:30042843-2",),
    effective_from=_EFFECTIVE_FROM,
)

TOMATO = CropRecord(
    crop_id="crop:solanum-lycopersicum",
    common_names=(
        NameVariant(value="tomato"),
        NameVariant(value="tomatoes"),
        NameVariant(value="tomato crop"),
        # Deliberate, bounded correction for the farmer-facing typo observed in
        # conversation intake. This is an alias, not fuzzy matching.
        NameVariant(value="tomotoes"),
    ),
    scientific_name="Solanum lycopersicum L.",
    category=CropCategory.VEGETABLE,
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:818246-1",),
    effective_from=_EFFECTIVE_FROM,
)

MAIZE = CropRecord(
    crop_id="crop:zea-mays",
    common_names=(NameVariant(value="maize"), NameVariant(value="corn")),
    scientific_name="Zea mays L.", category=CropCategory.CEREAL,
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:426810-1",),
    effective_from=_EFFECTIVE_FROM,
)

CHICKPEA = CropRecord(
    crop_id="crop:cicer-arietinum",
    common_names=(NameVariant(value="chickpea"), NameVariant(value="gram"),
                  NameVariant(value="Bengal gram")),
    scientific_name="Cicer arietinum L.", category=CropCategory.PULSE,
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:486336-1",),
    effective_from=_EFFECTIVE_FROM,
)

BLACK_GRAM = CropRecord(
    crop_id="crop:vigna-mungo",
    common_names=(NameVariant(value="black gram"), NameVariant(value="urad"),
                  NameVariant(value="urd")),
    scientific_name="Vigna mungo (L.) Hepper", category=CropCategory.PULSE,
    source_references=("https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:525443-1",),
    effective_from=_EFFECTIVE_FROM,
)

# The registry deliberately separates recognition from advisory coverage.  The
# entries below are source-attributed identity records: registering a crop never
# implies that AgroSage has a package of practices or treatment evidence for it.
_ICAR_CROP_SOURCE = "https://icar.gov.in/en/crop-science"
_KEW_POWO_SOURCE = "https://powo.science.kew.org/"


def _priority_crop(
    crop_id: str, names: tuple[str, ...], scientific_name: str, category: CropCategory,
    *, regional: tuple[tuple[str, str], ...] = (),
) -> CropRecord:
    return CropRecord(
        crop_id=crop_id,
        common_names=tuple(NameVariant(value=name) for name in names),
        scientific_name=scientific_name,
        category=category,
        regional_names=tuple(NameVariant(value=name, language=language) for name, language in regional),
        source_references=(_ICAR_CROP_SOURCE, _KEW_POWO_SOURCE),
        effective_from=_EFFECTIVE_FROM,
    )


SORGHUM = _priority_crop("crop:sorghum-bicolor", ("sorghum", "jowar"), "Sorghum bicolor (L.) Moench", CropCategory.CEREAL, regional=(("జొన్న", "te"),))
PEARL_MILLET = _priority_crop("crop:cenchrus-americanus", ("pearl millet", "bajra"), "Cenchrus americanus (L.) Morrone", CropCategory.CEREAL, regional=(("సజ్జలు", "te"),))
FINGER_MILLET = _priority_crop("crop:eleusine-coracana", ("finger millet", "ragi"), "Eleusine coracana (L.) Gaertn.", CropCategory.CEREAL, regional=(("రాగి", "te"),))
PIGEON_PEA = _priority_crop("crop:cajanus-cajan", ("pigeon pea", "tur", "arhar", "red gram"), "Cajanus cajan (L.) Millsp.", CropCategory.PULSE, regional=(("కంది", "te"),))
GREEN_GRAM = _priority_crop("crop:vigna-radiata", ("green gram", "moong", "mung bean"), "Vigna radiata (L.) R. Wilczek", CropCategory.PULSE, regional=(("పెసర", "te"),))
LENTIL = _priority_crop("crop:lens-culinaris", ("lentil", "masoor"), "Lens culinaris Medik.", CropCategory.PULSE)
FIELD_PEA = _priority_crop("crop:pisum-sativum", ("field pea", "pea", "matar"), "Pisum sativum L.", CropCategory.PULSE)
GROUNDNUT = _priority_crop("crop:arachis-hypogaea", ("groundnut", "peanut", "peanut crop"), "Arachis hypogaea L.", CropCategory.OILSEED, regional=(("వేరుశనగ", "te"),))
SOYBEAN = _priority_crop("crop:glycine-max", ("soybean", "soya bean"), "Glycine max (L.) Merr.", CropCategory.OILSEED)
MUSTARD = _priority_crop("crop:brassica-juncea", ("mustard", "Indian mustard", "rai"), "Brassica juncea (L.) Czern.", CropCategory.OILSEED)
SESAME = _priority_crop("crop:sesamum-indicum", ("sesame", "til", "gingelly"), "Sesamum indicum L.", CropCategory.OILSEED, regional=(("నువ్వులు", "te"),))
SUNFLOWER = _priority_crop("crop:helianthus-annuus", ("sunflower",), "Helianthus annuus L.", CropCategory.OILSEED)
CASTOR = _priority_crop("crop:ricinus-communis", ("castor", "castor bean"), "Ricinus communis L.", CropCategory.OILSEED, regional=(("ఆముదం", "te"),))
SUGARCANE = _priority_crop("crop:saccharum-officinarum", ("sugarcane", "sugar cane"), "Saccharum officinarum L.", CropCategory.OTHER, regional=(("చెరకు", "te"),))
JUTE = _priority_crop("crop:corchorus-olitorius", ("jute", "tossa jute"), "Corchorus olitorius L.", CropCategory.FIBRE)
TOBACCO = _priority_crop("crop:nicotiana-tabacum", ("tobacco",), "Nicotiana tabacum L.", CropCategory.OTHER)
BANANA = _priority_crop("crop:musa-spp", ("banana", "plantain"), "Musa spp.", CropCategory.FRUIT, regional=(("అరటి", "te"),))
MANGO = _priority_crop("crop:mangifera-indica", ("mango",), "Mangifera indica L.", CropCategory.FRUIT, regional=(("మామిడి", "te"),))
CITRUS = _priority_crop("crop:citrus-spp", ("citrus", "orange", "sweet orange", "mandarin", "lemon", "lime"), "Citrus spp.", CropCategory.FRUIT)
GRAPES = _priority_crop("crop:vitis-vinifera", ("grape", "grapes", "grapevine"), "Vitis vinifera L.", CropCategory.FRUIT)
PAPAYA = _priority_crop("crop:carica-papaya", ("papaya", "pawpaw"), "Carica papaya L.", CropCategory.FRUIT)
GUAVA = _priority_crop("crop:psidium-guajava", ("guava",), "Psidium guajava L.", CropCategory.FRUIT)
POMEGRANATE = _priority_crop("crop:punica-granatum", ("pomegranate", "anar"), "Punica granatum L.", CropCategory.FRUIT)
COCONUT = _priority_crop("crop:cocos-nucifera", ("coconut",), "Cocos nucifera L.", CropCategory.FRUIT)
POTATO = _priority_crop("crop:solanum-tuberosum", ("potato",), "Solanum tuberosum L.", CropCategory.VEGETABLE)
CHILLI = _priority_crop("crop:capsicum-annuum", ("chilli", "chili", "green chilli", "hot pepper"), "Capsicum annuum L.", CropCategory.VEGETABLE, regional=(("మిరప", "te"),))
ONION = _priority_crop("crop:allium-cepa", ("onion",), "Allium cepa L.", CropCategory.VEGETABLE, regional=(("ఉల్లిపాయ", "te"),))
BRINJAL = _priority_crop("crop:solanum-melongena", ("brinjal", "eggplant", "aubergine"), "Solanum melongena L.", CropCategory.VEGETABLE, regional=(("వంకాయ", "te"),))
OKRA = _priority_crop("crop:abelmoschus-esculentus", ("okra", "bhindi", "lady's finger"), "Abelmoschus esculentus (L.) Moench", CropCategory.VEGETABLE, regional=(("బెండకాయ", "te"),))
CABBAGE = _priority_crop("crop:brassica-oleracea-capitata", ("cabbage",), "Brassica oleracea var. capitata L.", CropCategory.VEGETABLE)
CAULIFLOWER = _priority_crop("crop:brassica-oleracea-botrytis", ("cauliflower",), "Brassica oleracea var. botrytis L.", CropCategory.VEGETABLE)
CUCUMBER = _priority_crop("crop:cucumis-sativus", ("cucumber",), "Cucumis sativus L.", CropCategory.VEGETABLE)
TURMERIC = _priority_crop("crop:curcuma-longa", ("turmeric", "haldi"), "Curcuma longa L.", CropCategory.SPICE, regional=(("పసుపు", "te"),))
GINGER = _priority_crop("crop:zingiber-officinale", ("ginger", "adrak"), "Zingiber officinale Roscoe", CropCategory.SPICE, regional=(("అల్లం", "te"),))
GARLIC = _priority_crop("crop:allium-sativum", ("garlic", "lahsun"), "Allium sativum L.", CropCategory.SPICE)
CORIANDER = _priority_crop("crop:coriandrum-sativum", ("coriander", "coriander seed", "dhania"), "Coriandrum sativum L.", CropCategory.SPICE, regional=(("ధనియాలు", "te"),))
CUMIN = _priority_crop("crop:cuminum-cyminum", ("cumin", "jeera"), "Cuminum cyminum L.", CropCategory.SPICE)

CROP_REGISTRY = CropRegistry(CROP_REGISTRY_METADATA, (
    RICE, WHEAT, COTTON, TOMATO, MAIZE, CHICKPEA, BLACK_GRAM,
    SORGHUM, PEARL_MILLET, FINGER_MILLET, PIGEON_PEA, GREEN_GRAM, LENTIL, FIELD_PEA,
    GROUNDNUT, SOYBEAN, MUSTARD, SESAME, SUNFLOWER, CASTOR,
    SUGARCANE, JUTE, TOBACCO, BANANA, MANGO, CITRUS, GRAPES, PAPAYA, GUAVA, POMEGRANATE,
    COCONUT, POTATO, CHILLI, ONION, BRINJAL, OKRA, CABBAGE, CAULIFLOWER, CUCUMBER,
    TURMERIC, GINGER, GARLIC, CORIANDER, CUMIN,
))

LOCATION_REGISTRY_METADATA = RegistryMetadata(
    registry_id="agrosage:location-seed", version=SEED_VERSION,
    effective_from=_EFFECTIVE_FROM, source_reference="https://www.telangana.gov.in/about/districts/",
    scope_note="Small, source-attributed examples only; not a complete India location catalog or government ID list.",
)

_INDIA = "location:country:in"
_STATE = {code: f"location:state:in-{code}" for code in ("ap", "ka", "pb", "tg")}

LOCATION_RECORDS = (
    LocationRecord(location_id=_INDIA, name="India", level=RegistryLevel.COUNTRY,
                   latitude=20.5937, longitude=78.9629,
                   timezone="Asia/Kolkata", source_reference="https://knowindia.india.gov.in/states-uts/"),
    LocationRecord(location_id=_STATE["ap"], name="Andhra Pradesh", level=RegistryLevel.STATE,
                   parent_id=_INDIA, aliases=(NameVariant(value="AP"),),
                   latitude=15.9129, longitude=79.7400, timezone="Asia/Kolkata",
                   source_reference="https://guntur.ap.gov.in/"),
    LocationRecord(location_id=_STATE["ka"], name="Karnataka", level=RegistryLevel.STATE,
                   parent_id=_INDIA, aliases=(NameVariant(value="KA"),),
                   latitude=15.3173, longitude=75.7139, timezone="Asia/Kolkata",
                   source_reference="https://mysore.nic.in/en/"),
    LocationRecord(location_id=_STATE["pb"], name="Punjab", level=RegistryLevel.STATE,
                   parent_id=_INDIA, aliases=(NameVariant(value="PB"),),
                   latitude=31.1471, longitude=75.3412, timezone="Asia/Kolkata",
                   source_reference="https://ludhiana.nic.in/"),
    LocationRecord(location_id=_STATE["tg"], name="Telangana", level=RegistryLevel.STATE,
                   parent_id=_INDIA, aliases=(NameVariant(value="TG"),),
                   latitude=17.8749, longitude=78.1008, timezone="Asia/Kolkata",
                   source_reference="https://www.telangana.gov.in/about/districts/"),
    LocationRecord(location_id="location:district:in-ap-guntur", name="Guntur",
                   level=RegistryLevel.DISTRICT, parent_id=_STATE["ap"],
                   latitude=16.3067, longitude=80.4365, timezone="Asia/Kolkata",
                   source_reference="https://guntur.ap.gov.in/"),
    LocationRecord(location_id="location:district:in-ka-mysuru", name="Mysuru",
                   level=RegistryLevel.DISTRICT, parent_id=_STATE["ka"],
                   latitude=12.2958, longitude=76.6394, timezone="Asia/Kolkata",
                   source_reference="https://mysore.nic.in/en/"),
    LocationRecord(location_id="location:district:in-pb-ludhiana", name="Ludhiana",
                   level=RegistryLevel.DISTRICT, parent_id=_STATE["pb"],
                   latitude=30.9010, longitude=75.8573, timezone="Asia/Kolkata",
                   source_reference="https://ludhiana.nic.in/"),
    LocationRecord(location_id="location:district:in-tg-nalgonda", name="Nalgonda",
                   level=RegistryLevel.DISTRICT, parent_id=_STATE["tg"],
                   latitude=17.0577, longitude=79.2684, timezone="Asia/Kolkata",
                   source_reference="https://nalgonda.telangana.gov.in/"),
    LocationRecord(location_id="location:district:in-tg-adilabad", name="Adilabad",
                   level=RegistryLevel.DISTRICT, parent_id=_STATE["tg"],
                   latitude=19.6641, longitude=78.5320, timezone="Asia/Kolkata",
                   source_reference="https://adilabad.telangana.gov.in/"),
)

LOCATION_REGISTRY = LocationRegistry(LOCATION_REGISTRY_METADATA, LOCATION_RECORDS)

COVERAGE_REGISTRY_METADATA = RegistryMetadata(
    registry_id="agrosage:coverage-seed",
    version=SEED_VERSION,
    effective_from=_EFFECTIVE_FROM,
    source_reference="https://icar.org.in/",
    scope_note="Seeded validated coverage pairs for supported crops and locations.",
)

SEEDED_COVERAGE_PAIRS: tuple[tuple[str, str], ...] = (
    ("crop:gossypium-hirsutum", "location:district:in-tg-adilabad"),
    ("crop:oryza-sativa", "location:district:in-tg-nalgonda"),
    ("crop:oryza-sativa", "location:district:in-pb-ludhiana"),
    ("crop:triticum-aestivum", "location:district:in-pb-ludhiana"),
)

SEEDED_COVERAGE_REGISTRY = CoverageRegistry(COVERAGE_REGISTRY_METADATA, SEEDED_COVERAGE_PAIRS)
