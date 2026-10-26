# PL Charts

Programming language rankings grouped into categories. A category contains one or more metrics, each with its own definition, table, and update date.

## Repository layout

| Directory              | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `website/`             | JSX static renderer, TypeScript/Vite website, and DOM tests                      |
| `collectors/`          | TypeScript data collectors and offline tests; uses Node's built-in APIs          |
| `data/`                | Checked-in source responses, provenance manifests, CSV observations, and exports |
| `scripts/`, `tests/`   | Shared Git hooks and repository tooling tests                                    |
| `vendor/modulecounts/` | Ignored reference clone of the original Modulecounts repository                  |

The root npm workspace provides shared TypeScript, ESLint, and Prettier tooling. Website-specific dependencies are declared in `website/package.json`; collection dependencies are declared in `collectors/package.json`. One root lockfile pins the workspace dependencies.

## Development

Use Node.js 22.18 or later and npm. Run commands from the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:8000>. The production build writes seven pages and downloadable data to `website/dist/`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm run preview` uses port 8000; stop the development server before starting it. Workspace commands can also be run directly, for example `npm run typecheck --workspace collectors`.

## Categories and metrics

- GitHub: Pushes and Pull Requests.
- Packages: Published packages.
- Stack Overflow: Questions and Answers.
- Stack Overflow Survey: Usage.
- Releases: Stable releases.
- Hacker News: Job descriptions.

Category definitions are in `website/src/categories.ts`; metric definitions and ranking values are in `website/src/data.ts`. Qualified metric identifiers match the collection schema. Each category includes annotated references to existing analyses and approaches.

Pages are rendered from `website/src/pages.tsx` and shared components in `website/src/components/`. React renders the JSX to HTML during type checks, tests, and production builds. Vite also rerenders pages when JSX, data, or the package CSV changes during development. Generated `website/*.html` and `website/.generated/` are ignored by Git; edit the JSX source.

The renderer reads `data/exports/packages.csv` and generates the package values used by both static tables and interactive sorting. npm maps to JavaScript, PyPI to Python, crates.io to Rust, and Maven Central to Java. Go and Ruby display zero. Package and GitHub update dates use their collection timestamps; other category metrics currently use `1970`.

## Data collection

```sh
npm run collect:packages
npm run collect:github
```

Package collection records aggregate PyPI, npm, crates.io, and Maven Central counts. GitHub collection queries public GH Archive events directly through the latest available archive hour, with quarterly backfill and explicit language-attribution coverage. The GitHub page exposes separate quarter selectors and interactive trend plots for pushes and opened pull requests. Rankings and plots use complete quarters.

Start with [data/exports/packages.csv](data/exports/packages.csv) for experiments. Original responses and checksums are checked in alongside the CSV. The full quarterly dataset is [data/exports/github.csv](data/exports/github.csv), retaining every attributed language and an Unknown group.

Reproduce the saved GitHub dataset offline:

```sh
npm run collect:github -- --replay 2026-10-26T09-08-31-760Z
```

See [data/README.md](data/README.md) for endpoint definitions, freshness information, the observation schema, and collection plans for every category.

## Formatting and checks

`npm ci` enables the pre-commit hook. It checks formatting and ESLint rules against staged contents, including partially staged files.

```sh
npm run format
npm run format:check
npm run lint:fix
```

GitHub Actions checks formatting, lint, tests, TypeScript, and the website build. Raw source responses and the reference clone are excluded from formatting and linting.
