# Repository conventions

## Product

- Build a ranking-focused programming language reference for developers.
- Pages represent categories; a category contains one or more independently defined metrics.
- Categories are GitHub, Packages, Stack Overflow, Stack Overflow Survey, Releases, and Hacker News. Keep qualified metric IDs consistent with the data schema.
- Keep interface prose concise and factual. Describe each counting method once. Use sentence case and omit redundant labels and navigation.
- Use neutral table text for values and ranks. Reserve colored table text for links. Use inline SVG for the header ranking icon.
- Preserve the charcoal palette, violet accents, readable contrast, keyboard focus, semantic tables, and responsive layouts. Check changes at mobile widths.
- Category metric badges show their update dates; omit update badges on the homepage. Packages use the collected snapshot date; other metrics currently use 1970.

## Structure and data

- `website/` and `collectors/` are separate TypeScript npm workspaces. Declare their dependencies in their own package manifests; shared code-quality tooling belongs at the root.
- Collectors write to `data/`, independently of website implementation. Follow `data/README.md` for schema and provenance conventions.
- Retain exact raw responses, source metadata, checksums, and dated CSV observations. Publish the current export only after every required source validates.
- Preserve missing observations and source-reported freshness. Keep registry counts distinct from language attribution and package names distinct from versions.
- `vendor/modulecounts/` is an ignored reference checkout. Keep its dependencies separate.
- Preserve competition ranks with gaps after ties. Keep static HTML tables consistent with their interactive data.
- Render shared JSX components into static HTML at build time. Edit `website/src/pages.tsx` and `website/src/components/`; generated HTML and `.generated/` are ignored artifacts.
- Derive package values from the checked-in CSV during rendering. Keep the registry-to-language display mapping documented. Show zero for Go and Ruby until instructed otherwise.

## Checks

- Use strict TypeScript for application, collection, and tooling code.
- Run formatting, lint, type checks, offline tests, and the production build before committing affected changes.
- Use the installed pre-commit hook. Commit and push completed, validated stages when requested.

- Keep commits small and conceptually contained. Separate data changes, rendering refactors, UI behavior, and tooling where practical. Validate each completed step before committing and pushing it.
