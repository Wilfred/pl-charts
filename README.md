# PL Charts

Programming language rankings grouped into categories. A category contains one or more metrics, each with its own definition, table, and update date.

## Repository layout

| Directory              | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `website/`             | Static TypeScript/Vite website and DOM tests                                     |
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

The category and metric definitions are in `website/src/data.ts`. Qualified metric identifiers match the collection schema. UI update badges currently display `1970`. Each category includes annotated references to existing analyses and approaches.

## Data collection

```sh
npm run collect:packages
```

This collects aggregate PyPI, npm, crates.io, and Maven Central counts into dated snapshots. Start with [data/exports/packages.csv](data/exports/packages.csv) for experiments. Original responses and checksums are checked in alongside the CSV.

See [data/README.md](data/README.md) for endpoint definitions, freshness information, the observation schema, and collection plans for every category.

## Formatting and checks

`npm ci` enables the pre-commit hook. It checks formatting and ESLint rules against staged contents, including partially staged files.

```sh
npm run format
npm run format:check
npm run lint:fix
```

GitHub Actions checks formatting, lint, tests, TypeScript, and the website build. Raw source responses and the reference clone are excluded from formatting and linting.
