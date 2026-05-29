# Central Texas Plant Dashboard Starter

This is a beginner-friendly static dashboard built from the current `Master_Plant_Database.xlsx`.

## Current build

- Plant rows: 318
- Search aliases: 1304
- Source sheet: Sheet1
- Plant ID rule: `Plant_ID = Scientific Name`

## Open the dashboard

Double-click:

```text
index.html
```

It should open in your browser. No server is required for the current version because the plant data is stored in `data/processed/plants.js`.

## Normal update workflow

1. Replace `data/raw/Master_Plant_Database.xlsx` with your newest master workbook.
2. Open a terminal in this folder.
3. Run:

```bash
python scripts/build_dashboard_data.py
```

4. Open `index.html` again.

## How future spreadsheets should connect

For now, use the exact scientific name as the ID.

Future tables should include a column named:

```text
Scientific Name
```

Examples:

- plant interactions
- microregions
- human uses
- seed harvest data
- phytochemistry
- host plants

The dashboard can later join those tables back to this master plant list by matching `Scientific Name`.

## GitHub use

Upload this whole folder to a GitHub repository. A good repository name would be:

```text
central-texas-plant-dashboard
```

Suggested commit message:

```text
Add initial plant dashboard from master plant database
```

## Important beginner rule

Scientific names must stay consistent. If one sheet says:

```text
Vernonia ×guadalupensis
```

and another says:

```text
Vernoniaxguadalupensis
```

those will not connect cleanly unless an alias/crosswalk is added.
