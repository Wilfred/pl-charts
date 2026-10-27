# Repository conventions

## Product

- Build a ranking-focused programming language reference for developers.
- Pages represent categories; a category contains one or more independently defined metrics.
- Categories are GitHub, Packages, Stack Overflow, Stack Overflow Survey, Releases, and HN Who's Hiring. Keep qualified metric IDs consistent with the data schema.
- Keep interface prose concise and factual. Describe each counting method once. Use sentence case and omit redundant labels and navigation.
- Use clickable name and quantity headers with aria-sort for table ordering. Rank headers are static; default to descending quantity. Keep period filters separate.
- Use neutral table text for values and ranks. Reserve colored table text for links. Use inline SVG for the header ranking icon.
- Preserve the charcoal palette, violet accents, readable contrast, keyboard focus, semantic tables, and responsive layouts. Check changes at mobile widths.
- Category metric badges show their update dates; omit update badges on the homepage. All metrics use their source observation dates.

## Structure and data

- `website/` and `collectors/` are separate TypeScript npm workspaces. Declare their dependencies in their own package manifests; shared code-quality tooling belongs at the root.
- Implement a reproducible collector, raw snapshots, provenance, and offline validation when replacing design values. Keep missing historical values distinct from zero.
- Collectors write to `data/`, independently of website implementation. Follow `data/README.md` for schema and provenance conventions.
- Retain exact raw responses, source metadata, checksums, and dated CSV observations. Publish the current export only after every required source validates.
- Query GitHub event data directly with the versioned collector. Preserve Unknown language counts, report attribution coverage, and retain partial quarters in raw data and exports while displaying complete quarters on the website. Keep the old GitHut import as historical provenance.
- Preserve missing observations and source-reported freshness. Keep registry counts distinct from language attribution and package names distinct from versions.
- `vendor/modulecounts/` and `vendor/githut/` are ignored reference checkouts. Keep its dependencies separate.
- Preserve competition ranks with gaps after ties. Keep static HTML tables consistent with their interactive data.
- Render shared JSX components into static HTML at build time. Edit `website/src/pages.tsx` and `website/src/components/`; generated HTML and `.generated/` are ignored artifacts.
- Derive all metric values from checked-in CSVs during rendering. Keep service counting definitions and implementation mappings documented. Display missing measurements as —; preserve measured zeros.
- Packages ranks services from `data/package-services.json`; keep it outside the homepage language comparison. Preserve the archived Modulecounts threshold evidence and service-specific counting rules.
- Releases ranks implementations from `data/implementations.json`, with related languages beneath each name. Keep it outside the homepage language comparison. Include the current year as year to date; keep incomplete quarters and months excluded from event metrics.
- Most Loved uses each language’s existing users as the denominator and follows the survey’s Loved/Admired definition. Preserve missing published options and source precision.
- Plots mark every observed point and initially show the current top five series for that metric. Keep exact hover, touch, and keyboard tooltips.
- Use the reviewed 20-language cohort in `data/languages.json`. Preserve source-period labels, exact-value tooltips, and gaps in historical plots.
- Use the shared collector CLI/runtime for new routine collectors. Keep source-specific parsing and counting rules in adapters. Reuse captured sources for normalization changes; preserve retrieval times.

## Checks

- Use strict TypeScript for application, collection, and tooling code.
- Run formatting, lint, type checks, offline tests, and the production build before committing affected changes.
- Use the installed pre-commit hook. Commit and push completed, validated stages when requested.

- Keep commits small and conceptually contained. Separate data changes, rendering refactors, UI behavior, and tooling where practical. Validate each completed step before committing and pushing it.
