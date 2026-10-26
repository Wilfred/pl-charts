# PL Charts

A prototype of programming language popularity rankings for developers. Current work covers structure, design, and interactions, using placeholder counts.

## Scope

- Compare rankings in an overview, with a detail page for each metric.
- Include Repositories (GitHub), Packages, SO Questions, SO Surveys, Releases, and Job Descriptions (Hacker News “Who's Hiring” comments).
- Use a dark theme, sentence-case headings, and concise descriptions.
- Keep navigation and labels distinct; describe each counting method once.
- Support semantic tables, keyboard navigation, sorting, and release-year selection.

Ranks are calculated separately for each metric. Ties share a rank and leave a gap: 1, 1, 3.

## Development

Use Node.js 22.18 or later and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:8000>. The site uses TypeScript and Vite with seven HTML entry points. Application code is in `src/`; tooling is in `scripts/`. Counts and ranking functions are defined in `src/data.ts`.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The production build writes all seven pages and their assets to `dist/`. `npm run preview` serves that build on port 8000; stop the development server before starting it.

The HTML includes initial ranking rows. Update those rows when changing counts in `src/data.ts`; tests check that they match the interactive tables.

## Formatting and checks

`npm ci` enables the pre-commit hook in `.githooks`. The hook checks staged file contents, including partially staged files. Format files and stage them before committing:

```sh
npm run format
npm run format:check
```

GitHub Actions checks formatting, runs tests, type-checks TypeScript, and builds all pages on pushes and pull requests.

## References

Each metric page surveys existing analyses and documents comparison variables. Sources include GitHut 2.0, the January 2024 Modulecounts archive and source, HN hiring analyses, Stack Overflow surveys and tag analysis, and language release policies. Ranking values remain placeholders.
