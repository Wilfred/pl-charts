# PL Charts

Programming language rankings grouped into categories, with independent metric definitions, dated observations, downloadable CSVs, and historical plots.

The language cohort is GitHut 2.0’s latest published pull-request top 20: 2024 Q1, after its language exclusions. [data/languages.json](data/languages.json) records the reviewed profiles and pinned source revision. GitHub activity counts come from our own archive queries.

## Repository layout

| Directory            | Purpose                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `website/`           | JSX static renderer, TypeScript/Vite client, and DOM tests                                  |
| `collectors/`        | TypeScript collection scripts, source parsers, and offline tests                            |
| `data/`              | Source responses, manifests, dated observations, current CSV exports, and language profiles |
| `scripts/`, `tests/` | Git hooks and shared tooling tests                                                          |
| `vendor/`            | Ignored Modulecounts and GitHut reference clones                                            |

The two npm workspaces declare their own dependencies. Shared TypeScript, ESLint, and Prettier tooling belongs at the root. One lockfile pins the dependencies.

## Development

Use Node.js 22.18 or later:

```sh
npm ci
npm run dev
```

Open <http://localhost:8000>. The production build writes seven static pages and downloadable exports to `website/dist/`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

The development server and preview use port 8000. Edit `website/src/pages.tsx` and its shared JSX components; generated HTML and `.generated/` are ignored. The renderer derives all displayed values from the checked-in CSV exports. The development server watches sources, exports, and language profiles.

## Metrics

| Category              | Metrics                                  | Historical scope                       |
| --------------------- | ---------------------------------------- | -------------------------------------- |
| GitHub                | Recorded pushes and opened pull requests | Quarterly, 2011 onward                 |
| Packages              | Published registry totals                | 14 package-service snapshots           |
| Stack Overflow        | Questions and answers created            | Quarterly, 2008–March 2024 snapshot    |
| Stack Overflow Survey | Reported language use                    | Annual, 2013–2026                      |
| Releases              | Stable implementation release records    | Annual; source-specific starting dates |
| Hacker News           | Language mentions in hiring comments     | Monthly rounds, April 2011 onward      |

All numbers are derived from saved sources. Missing measurements display **—**. Complete calendar periods are shown for event metrics; published survey cohorts use their survey year. Plots preserve historical gaps and provide exact-value hover, touch, and keyboard tooltips. Tables sort through their column headers.

Packages ranks package services, independently of the language comparison table. The cohort contains 14 services with displayed growth of at least two packages per day in Modulecounts’ 15 January 2024 snapshot. `data/package-services.json` records service names, major programming languages, links, aliases, and the selection rule. Counts follow each service’s published package or catalog definition.

GitHub’s language join covers a small and changing fraction of recorded events. Archive capture also changes after 2024. The shaded region and coverage notes identify this limitation; see the [attribution and capture investigation](docs/github-attribution.md).

## Collection

```sh
npm run collect:languages
npm run collect:packages
npm run collect:github
npm run collect:stackoverflow
npm run collect:surveys
npm run collect:releases
npm run collect:hiring
npm run inspect:github-health
```

Every routine collector supports `--help`, `--data-dir PATH`, `--replay RUN`, and `--source-run RUN`. Historical collectors also accept inclusive `--from YEAR` and `--to YEAR` bounds. For example:

```sh
npm run collect:surveys -- --from 2013 --to 2026
npm run collect:github -- --replay 2026-10-26T19-48-52-758Z
npm run collect:releases -- --replay 2026-10-26T22-31-39-335Z
```

`--replay` verifies responses and recreates the saved observation CSV byte for byte, without network access. `--source-run` creates a separate derived run from a complete saved source set; source timestamps remain unchanged. It supports normalization experiments and avoids repeated downloads. Changed requests require a new live collection.

The release collector reads public GitHub GraphQL metadata using `GITHUB_TOKEN`, `GH_TOKEN`, or existing `gh auth login` credentials. Other sources use public HTTP endpoints. Replay requires no credentials.

See [data/README.md](data/README.md) for schemas, source definitions, freshness, and replay instructions. The [CSV exports](data/exports/) are the starting point for analysis.

## Formatting and checks

`npm ci` installs the commit hook. It checks formatting and ESLint against staged contents, including partially staged files.

```sh
npm run format
npm run format:check
npm run lint:fix
```

GitHub Actions runs formatting, lint, type checks, offline tests, and the static build. Raw source bodies and reference clones are excluded from formatting and linting.

## Deployment

[PL Charts](https://www.wilfred.me.uk/pl-charts/) is hosted on GitHub Pages. Each push to `main` runs all checks, builds `website/dist/`, and deploys that artifact through the `github-pages` environment. Pull requests run the same checks without publishing. The Checks workflow also supports manual runs.

Pages uses GitHub Actions as its publishing source. Relative page, asset, and CSV links support the `/pl-charts/` project path. Collection runs separately; deployment uses checked-in data and makes no live source queries.

`website/robots.txt` permits all crawlers, including archival agents, and is copied into the production build. The current Pages domain also permits all crawlers in its domain-root `/robots.txt`, which governs the project path.
