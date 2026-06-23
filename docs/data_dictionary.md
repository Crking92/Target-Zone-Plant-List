# Public Data Dictionary

This dictionary describes the fields intentionally exposed in the public dashboard data.

## Core identity

| Field | Meaning |
|---|---|
| `Plant_ID` | Stable dashboard key, currently the scientific name. |
| `Scientific Name` | Botanical name used for matching and display. |
| `Common Name(s)` | Common names where available. |
| `Family` | Plant family. |

## Growth and landscape traits

| Field | Meaning |
|---|---|
| `Duration` | Annual, biennial, perennial, or similar life-duration trait. |
| `Growth Habitat` / `Habit` | General growth form such as herb, shrub, vine, tree, grass, etc. |
| `Sun/Shade Requirements` / `Light Requirement` | Light category. |
| `Water Req.` / `Water Use` | Water-use category. |
| `Avg Height (ft)` | Approximate height where available. |
| `Avg Width (ft)` | Approximate spread where available. |
| `Size Notes` | Short size note where available. |
| `Leaf` | Short leaf trait where available. |
| `Soil Moisture` | General soil-moisture category. |

## Bloom and wildlife

| Field | Meaning |
|---|---|
| `Bloom Time` | Bloom season or months. |
| `Bloom Color` | Flower color category. |
| `Attracts` | Short wildlife-attraction categories. |
| `Larval Host` | Short larval-host note where available. |
| `Nectar Source` | Simple nectar-source flag where available. |
| `Birds Using This Plant` | Bird species linked to the plant from the bird-use source table. |
| `Bird Use Sources` | Source links for bird-use records. |

## Hays County microregion fields

| Field | Meaning |
|---|---|
| `Microregion Group` | Broad local habitat/microregion group. |
| `Primary Microregion` | Primary mapped/local microregion assignment. |
| `Secondary Microregions` | Additional possible microregion assignments. |
| `Fine Habitat Tags` | Short habitat tags. |
| `Fine Habitat Summary` | Short habitat summary. |
| `Microregion Moisture / Water / Light` | Condensed environmental trait summary. |
| `Wetland Status Summary` | Wetland status summary where available. |
| `Microregion Confidence` | Confidence label for microregion assignment. |
| `Microregion Review Needed` | Whether the assignment needs review. |
| `Microregion Public Status` | Public-publication status. |
| `Microregion Publication Note` | Short publication caveat. |
| `Microregion Source Note` | Source-use note. |
| `Microregion Dataset Version` | Dataset version label. |
| `Microregion Last Updated` | Last update date. |
| `Microregion Online Slug` | URL-safe slug. |

## Propagation summary fields

| Field | Meaning |
|---|---|
| `NPSOT Propagation Common Name` | Common name from propagation source data. |
| `NPSOT Propagation Materials` | Propagation materials, such as seed or stem. |
| `NPSOT Propagation Treatment Tags` | Short treatment tags, such as scarification or stratification. |
| `NPSOT Propagation Public Note` | Public note explaining that full protocols are linked, not reproduced. |
| `NPSOT Propagation Source URL` | NPSOT plant-page URL. |
| `NPSOT Propagation References` | Reference URLs extracted from propagation source data. |

## Source links

| Field | Meaning |
|---|---|
| `LBJ URL` | Lady Bird Johnson Wildflower Center plant-page URL. |
| `Microregion LBJ Profile URL` | Wildflower Center URL carried through the microregion table. |
| `USDA Plants URL` | USDA PLANTS profile/search URL. |
| `FNA Search URL` | Flora of North America search URL. |
| `Wetland Plant List URL` | National Wetland Plant List URL. |
| `NRCS Web Soil Survey URL` | NRCS Web Soil Survey URL. |
| `EPA Ecoregions URL` | EPA ecoregion reference URL. |
| `TPWD EMS URL` | TPWD ecological mapping system URL. |
| `Public Data Note` | Standard note describing the public-data limitation. |
