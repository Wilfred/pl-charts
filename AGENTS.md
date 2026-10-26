# Repository conventions

## Product

- Build a ranking-focused programming language reference for developers.
- Retain five metrics: repositories, packages, Stack Overflow questions, releases, and Hacker News hiring mentions.
- Use placeholder data while prototyping structure and interactions.
- Keep interface prose concise, factual, and clinical. Describe the metric and its counting method directly.
- Use sentence case. Keep each label, heading, and navigation element only where it adds information.
- Preserve the dark theme and accessible contrast, keyboard focus, semantic tables, and responsive layouts.
- Prototype notices and production data sourcing are managed separately by the owner.

## Development

- Keep dependencies and abstractions proportional to this small static site.
- Use strict TypeScript for application and tooling code.
- Keep data definitions, static HTML tables, and interactive rankings consistent.
- Preserve shared ranks for ties, with gaps after tied positions.
- Run the formatting check, type check, tests, and production build before committing changes that affect them.
- Use the installed pre-commit hook. Commit and push completed, validated stages when requested.
