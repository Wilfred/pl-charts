# Repository conventions

## Product

- Build a ranking-focused programming language reference for developers.
- Retain six metrics: Repositories, Packages, SO Questions, SO Surveys, Releases, and Job Descriptions (Hacker News hiring mentions).
- Use placeholder data while prototyping structure and interactions.
- Keep interface prose concise, factual, and clinical. Describe the counting method once. Use “Releases”, “Packages”, “SO Questions”, “SO Surveys”, and “Job Descriptions” as category labels.
- Use sentence case. Keep each label, heading, and navigation element only where it adds information.
- Use neutral table text for values and ranks. Reserve colored table text for links. Use inline SVG for the header ranking icon.
- Preserve the charcoal palette with muted violet accents and accessible contrast, keyboard focus, semantic tables, and responsive layouts.
- Prototype notices and production data sourcing are managed separately by the owner.

## Development

- Keep dependencies and abstractions proportional to this small static site.
- Use strict TypeScript for application and tooling code.
- Keep data definitions, static HTML tables, and interactive rankings consistent.
- Preserve shared ranks for ties, with gaps after tied positions.
- Run the formatting check, lint, type check, tests, and production build before committing changes that affect them.
- Use the installed pre-commit hook. Commit and push completed, validated stages when requested.
