# Kyle Biodiversity Custom GPT Static Knowledge Pack

Generated: 2026-05-01

## Purpose

Use these files as the non-iNaturalist, mostly static knowledge base for a custom GPT that supports the Kyle biodiversity dashboard.

The live iNaturalist observations should stay in the dashboard pipeline, not in GPT Knowledge, because iNaturalist observations change constantly.

## Upload these to Custom GPT Knowledge first

1. `kyle_site_locations_for_gpt.csv`
2. `kyle_trail_corridors_for_gpt.csv`
3. `kyle_location_aliases_for_gpt.csv`
4. `kyle_site_summary_by_type_owner.csv`
5. `kyle_management_zones_template.csv`
6. `kyle_watchlist_taxa_template.csv`
7. `kyle_static_data_dictionary.csv`
8. `kyle_reference_file_registry.csv`
9. `Wildflower Center Native Plants Hays County(1).csv`
10. `Host Calculator(1).xlsx`

## Keep these in the dashboard data/reference folder

1. `Parks.geojson`
2. `VybeTrails.geojson`
3. `Wildflower Center Native Plants Hays County(1).csv`
4. `Host Calculator(1).xlsx`
5. `kyle_management_zones_template.csv`
6. `kyle_watchlist_taxa_template.csv`

## Do not rely on GPT Knowledge for

- the current iNaturalist observation dataset
- exact point-in-polygon spatial joins
- final GIS authority

For exact maps and spatial joins, use the dashboard scripts and GeoJSON layers.

## Important notes

- `center_lat` and `center_lon` in the CSVs are approximate text-reference centers only.
- Use `Parks.geojson` for exact park polygon analysis.
- Use `VybeTrails.geojson` for future trail-corridor buffers.
- Management-zone data is currently a template until official ESA/restoration/reduced-mowing polygons are exported.
