# Public Data Quality Report

## Build summary

- Public plant rows: 315
- Search aliases: 1,337
- Main browser data file: `data/processed/plants.js`
- Public plant CSV columns: 55
- NPSOT propagation species summary rows: 463

## Public-release changes

The public build now removes or avoids browser-delivery of long source-heavy fields such as:

- full plant descriptions
- maintenance paragraphs
- full propagation instructions
- Mr. Smarty Plants text
- source database image URLs
- bibliography text blocks
- page boilerplate
- scrape/debug metadata

Propagation is displayed as summary fields:

- `NPSOT Propagation Materials`
- `NPSOT Propagation Treatment Tags`
- `NPSOT Propagation Public Note`
- `NPSOT Propagation Source URL`
- `NPSOT Propagation References`

## Current public fields

The public plant data file contains structured facts, source links, and short notes. It does not contain the full raw source spreadsheets.

## Remaining review items

Before a formal City/public launch:

1. Confirm preferred NPSOT attribution language.
2. Keep raw source files out of the public repository.
3. Spot-check several plant cards against their linked source pages.
4. Add BONAP/NAPA target-zone status when the local nativity review layer is ready.
5. If the existing GitHub repository already contained raw source files, clean Git history or create a new public repository.
