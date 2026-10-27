# Collection data

The website reads `exports/*.csv`. These contain measurements and provenance, rather than ranks. Language ranks use the reviewed cohort in `languages.json`; Packages and Releases use the separate service and implementation cohorts.

```python
import pandas as pd

observations = pd.read_csv("data/exports/stackoverflow.csv")
print(observations[["metric", "entity_id", "value", "period_start"]])
```

The CSVs also work with Python’s standard library, R, DuckDB, and spreadsheets. Values have no thousands separators; percentages use the 0–100 scale. Timestamps are UTC ISO 8601.

## Layout

```text
data/
  languages.json
  package-services.json
  implementations.json
  raw/<category>/<run_id>/
    <source files>
    <executed SQL, where applicable>
    manifest.json
  observations/<category>/<run_id>.csv
  exports/<category>.csv
```

Raw responses are preserved byte for byte. Manifests record method versions, options, HTTP status, selected response headers, observation times, SHA-256, byte counts, and source-specific metadata. Read-only GraphQL request bodies and SQL are retained. Authentication headers are omitted.

Observation runs are immutable. Publication replaces a current export only after the required sources validate. Failed runs retain their evidence and leave the previous export intact. The collector code and language profiles required for replay are committed with the observations.

## CLI and implementation

All routine collectors support:

| Argument                   | Meaning                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `--help`                   | Show usage                                                                           |
| `--data-dir PATH`          | Data root; defaults to this repository’s `data/`                                     |
| `--replay RUN`             | Verify saved sources and observation CSV offline                                     |
| `--source-run RUN`         | Produce a new derived run from a complete saved source set, with no network requests |
| `--from YEAR`, `--to YEAR` | Inclusive bounds for historical collectors                                           |

For example, `npm run collect:hiring -- --help` describes the hiring collector. `--replay` checks request URLs, bodies, checksums, SQL, and exact CSV output. Source reuse preserves the original response timestamps and copies the required responses into a self-contained new run. It permits a subset of cached requests; a missing or changed request fails rather than mixing cached and live data. Original observations remain intact.

`collectors/src/runtime.ts` shares CLI parsing, source capture, verification, cached-source processing, and atomic publication. Adapters retain their own queries, date policies, aliases, pagination, and parsers. GitHub release/tag pagination is shared because several implementation sources use the same API. The legacy replay adapter preserves the original package and direct GitHub snapshots. The one-off attribution diagnostic retains its specific `--cutoff` argument.

## Observation schema, version 1

| Column                       | Meaning                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `schema_version`             | Observation schema version                                         |
| `run_id`                     | Immutable collection identifier                                    |
| `category`, `metric`         | Source category and qualified metric identifier                    |
| `entity_id`, `entity_kind`   | Language, registry, implementation, or archive identifier and type |
| `ecosystem`                  | Scope; implementation name for release counts                      |
| `value`, `unit`              | Observed quantity and its unit                                     |
| `period_start`, `period_end` | Half-open measurement interval; blank for stock snapshots          |
| `observed_at`                | Retrieval time of the underlying response                          |
| `source_updated_at`          | Source-reported freshness or archive cutoff, when available        |
| `source_url`                 | Public source endpoint                                             |
| `method_version`             | Extraction and counting method                                     |
| `raw_path`                   | Response path relative to `data/`                                  |

A missing measurement is an absent observation, rather than a fabricated zero. Zero counts represent no matching records within the measured source window. Source archives may themselves be incomplete. The website omits partial event quarters and months, shows the current release year as year to date, preserves gaps, and displays missing values as —. Published annual surveys are complete survey cohorts, including the current survey year.

## Language cohort

`language-selection.csv` retains the top 20 from GitHut 2.0’s latest published pull-request quarter, 2024 Q1, applying its non-language exclusions. The pinned revision is `401c43b4c206088b7a8a46ce3840d369c6b6e850`. Raw ranking and exclusion files accompany the selection. `collect:languages` verifies the reviewed profiles against that source; it does not overwrite the curated profile definitions.

The cohort is Python, Java, Go, JavaScript, C++, TypeScript, PHP, Ruby, C, C#, Nix, Shell, Rust, Scala, Kotlin, Swift, Dart, Groovy, Perl, and Lua. Profiles define display colors, canonical Stack Overflow tags, survey aliases, and hiring-mention rules.

## Packages

Package rows identify services, with `entity_kind=registry`. The website ranks services by their package or project totals. `package-services.json` defines the service cohort independently of `languages.json`. Each service has a reviewed list of major programming languages, displayed beneath its name.

Selection uses the displayed, rounded average growth from [Modulecounts’ 15 January 2024 snapshot](https://web.archive.org/web/20240115115215/http://www.modulecounts.com/). Include rates ≥2 new packages/day, measured by Modulecounts over the preceding week. CPAN and CPAN (search) count as one service. CRAN’s displayed rate was −2/day; Hackage and Nimble were 1/day. These are historical inclusion criteria, rather than claims about present growth.

The collector saves that exact archived page and verifies every qualifying row against the reviewed service aliases. A new qualifying service or a selected service below the threshold fails validation. Selection metadata retains all displayed rates, including excluded services.

| Service       | Source                                                     | Counting unit                                                                   |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| npm           | Registry replication metadata                              | `doc_count`; package documents                                                  |
| PyPI          | Homepage                                                   | Projects                                                                        |
| Maven Central | Official search API, all artifacts, default core           | Distinct group/artifact pairs, `response.numFound`                              |
| NuGet         | Search API, empty query, prereleases and SemVer 2 included | Listed package IDs; unlisted-only packages are omitted                          |
| Packagist     | Statistics page                                            | Registered packages                                                             |
| crates.io     | Summary API                                                | `num_crates`                                                                    |
| RubyGems      | Statistics page                                            | Total gems                                                                      |
| CPAN          | MetaCPAN distribution index count                          | Distribution records, including retained historical names                       |
| Clojars       | Project listing                                            | Artifacts, including noncanonical forks                                         |
| Hex           | Homepage                                                   | Available packages                                                              |
| LuaRocks      | All-packages listing                                       | Owner/package listings; identical names under different owners count separately |
| CrystalShards | Current catalog at crystalshards.org                       | Indexed shard repositories                                                      |
| MELPA         | JSON archive                                               | Package-name keys, once across versions                                         |
| Drupal        | Project API, project_module, page size 1                   | Published module projects, using zero-based last-page index + 1                 |

Source URLs and method versions are recorded per observation; bodies and checksums are retained for replay. Catalogs have different retention and visibility rules. Versions, downloads, forks, and removed packages are treated according to those stated source definitions. Maven’s search index may lag publication; it supplies no freshness timestamp. The earlier quickstats snapshot reported June 2026 freshness and remains preserved with its original parser.

CrystalShards’ former `.xyz` domain now serves unrelated content. The collector uses the current `.org` catalog and records a separate method version. MELPA transfers use identity encoding to avoid a Node 22 HTTP-parser failure seen with its compressed response.

The ignored Modulecounts reference clone is at `vendor/modulecounts/`, revision `0643af5f34e9af7d732d3e95f3d976cdf1389697`. Original four-service snapshots remain replayable.

## GitHub

The collector executes our own SQL over [ClickHouse’s GH Archive mirror](https://clickhouse.com/docs/get-started/sample-datasets/github-events). `github.pushes` counts PushEvent rows; `github.pull_requests` counts PullRequestEvent rows with action `opened`. Bots and forks are included. Language attribution uses the latest known primary language in the separate repository metadata tables, applied retrospectively by repository name. Unmatched repositories and empty languages remain in the **Unknown** bucket.

The active snapshot has 64 quarters from 2011 Q1 through partial 2026 Q4, cut off at `2026-10-26T19:00:00.000Z`. The site uses 62 complete quarters from 2011 Q2 to 2026 Q3. The first archive quarter is partial because GH Archive began on 12 February 2011. All source language groups remain in the CSV.

Coverage is the sum of known-language counts divided by all recorded counts. It varies substantially and describes the mirror, rather than the entire platform. In 2026 Q3 it is 1.4767% for pushes and 11.3089% for opened pull requests. [The investigation](../docs/github-attribution.md) separates metadata loss from upstream capture changes.

`github-health.csv` publishes monthly unjoined event counts, opened requests, missing-action counts, and recorded hourly-file counts. Reproduce it with `npm run inspect:github-health`. Presence of an hourly file does not establish complete event capture. The older GitHut metric import remains as historical provenance; the active activity export uses direct queries.

## Stack Overflow

The collector queries the public [Stack Overflow post snapshot](https://clickhouse.com/docs/data-modeling/schema-design), ending 31 March 2024. Questions are grouped by their creation quarter and canonical language tags. Answers are grouped by their own creation quarter and inherit tags through `ParentId`. An answer can contribute to several languages.

The tag mapping is in `languages.json`; Shell uses `bash`. Dates cover retained posts from 2008 onward. Deleted posts and tag edits affect these reconstructed historical counts. The API snapshot, queries, raw aggregates, and source bounds are retained.

## Stack Overflow Survey

Annual usage covers 2013–2026 from the [official survey repository](https://github.com/StackExchange/Survey), pinned to the commit recorded in each manifest.

| Years     | Source and denominator                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------- |
| 2013–2014 | Raw checkbox matrices; respondents answering the past-year language/technology question              |
| 2015      | Raw current-technology checkbox fields; respondents selecting at least one current technology        |
| 2016      | Raw `tech_do` responses; nonempty current-technology answers                                         |
| 2017–2019 | Published all-respondent language percentages and their stated denominators                          |
| 2020–2025 | Published all-respondent language datasets, with frequencies and denominators                        |
| 2026      | The language-use slice for all respondents; desired use, AI use, and experience cohorts are separate |

The earlier 2011–2012 questions measured proficiency. The usage series starts with the past-year-use question in 2013. Respondent populations and wording change across years. Version-specific C++ options are combined once per respondent in the older CSVs. Shell follows the published combined shell option. Languages absent from a question remain missing.

Exact numerators, denominators, option labels, and question definitions are preserved when available. Older published percentages without numerator counts retain that limitation. Normalized percentages use four decimal places; tooltips and CSVs preserve that precision.

### Most Loved

`survey-loved.csv` contains `survey.most_loved`, collected independently with `npm run collect:survey-loved`. It covers 2015–2026. The counting unit is the percentage of each language’s past-year users who want to continue using it. Reports call this Loved through 2022 and Admired from 2023.

2015–2016 use the published Loved table in the official archived HTML; 2017–2020 use the language Loved graph in the report JSON. These preserve the published options and percentages; early tables report a subset of languages. A version-specific C++11 option is not merged with the general C++ cohort. 2021–2022 use the Loved field, retaining loved and dreaded counts to recover each language’s denominator. 2023–2025 use the Admired field; 2026 selects the all-respondent Admired series. Desired percentages and professional-only slices are separate measures. Numerators and language-specific usage denominators are retained where published. A question-wide response count is not a language’s retention denominator.

The pinned survey revision, original source bodies, published labels, frequencies, and percentages accompany the dated observations. The new collection is `2026-10-27T00-06-21-712Z`; Usage keeps its independent source capture and year range.

## Releases

Annual counts describe stable implementation release records in official histories, including maintenance releases. `implementations.json` identifies 21 distinct compilers and runtimes and lists their related languages. Observations use `entity_kind=implementation`; GCC appears once, Clang is separate, and Scala 2 and Scala 3 have independent histories. Implementations have separate source starting dates. The first recorded source year is excluded as potentially incomplete.

| Implementation              | Related languages           | Source / date basis                                                      |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| CPython                     | Python                      | Official download API, release date                                      |
| Eclipse Temurin             | Java                        | Adoptium GA publication timestamp                                        |
| Node.js                     | JavaScript, TypeScript      | Official distribution index, distribution date                           |
| GCC                         | C, C++, Fortran, Ada, Go, D | GCC release history, official release date                               |
| Clang                       | C, C++, Objective-C         | Stable `llvmorg-X.Y.Z` LLVM/Clang GitHub releases, publication timestamp |
| Go toolchain                | Go                          | Official release history, release date                                   |
| TypeScript compiler         | TypeScript                  | Official GitHub release publication timestamp                            |
| PHP                         | PHP                         | Official release history and current branch records, release date        |
| CRuby                       | Ruby                        | Official release table, release date                                     |
| .NET runtime                | C#, F#, Visual Basic        | Official runtime release metadata, release date                          |
| Nix                         | Nix                         | Numeric stable version tags; commit date for lightweight tags            |
| GNU Bash                    | Shell                       | Official source archives and numbered patches, modification date         |
| rustc                       | Rust                        | Stable compiler changelog, explicit dated version entries                |
| Scala 2 / Scala 3 compilers | Scala                       | Separate official GitHub release repositories, publication timestamp     |
| Kotlin / Swift compilers    | Kotlin / Swift              | Official GitHub release publication timestamps                           |
| Dart SDK                    | Dart                        | Explicit stable changelog dates                                          |
| Apache Groovy               | Groovy                      | Official issue-tracker release dates                                     |
| Perl 5                      | Perl                        | Released CPAN distribution timestamps                                    |
| Lua                         | Lua                         | Official source archive dates                                            |

Drafts, prereleases, and future dates are excluded. Each implementation deduplicates version identifiers and retains canonical version/date events in its manifest. Source scopes and archival completeness differ. Clang follows LLVM release publications; GCC and Clang contain multiple language frontends.

The active implementation run is `2026-10-27T00-07-37-891Z`, method `official-stable-implementation-publications-v2`. Current-year rows have an exclusive period end clipped to their source observation timestamps. The website includes 2026 with a YTD label in filters, chart axes, and tooltips. Earlier quarters and months in event categories retain their complete-period policy.

The original language-attributed release snapshots remain immutable and replayable through the collector’s v1 compatibility path. The original `2026-10-26T22-03-06-362Z` capture used a 2011 starting bound; replay it with `--from 2011`. The earlier full-history derived run is `2026-10-26T22-31-39-335Z`.

## HN Who's Hiring

The collector queries the public HN mirror for stories by `whoishiring` whose title begins with “Ask HN: Who is hiring?”, case-insensitively. It counts distinct top-level comment IDs, excluding reported deleted/dead comments. Months follow the thread’s publication month; later comments remain attributed to that hiring round. Thread IDs and comment totals are retained in the manifest.

HTML is stripped, entities decoded, and Series C funding phrases removed before matching the reviewed language aliases. Java and JavaScript are distinct; C excludes C++/C#; Go uses case-aware/contextual forms and Golang. Matching is lexical and can have false positives and negatives. A comment contributes at most once per language and can contribute to several languages.

The source includes 184 observed rounds from April 2011 through partial October 2026. Missing rounds remain gaps. The website ends at the last complete month.

## Replay examples

```sh
npm run collect:github -- --replay 2026-10-26T19-48-52-758Z
npm run collect:surveys -- --replay 2026-10-26T22-24-23-807Z
npm run collect:stackoverflow -- --replay 2026-10-26T21-24-13-197Z
npm run collect:hiring -- --replay 2026-10-26T21-55-17-257Z
npm run collect:releases -- --replay 2026-10-27T00-07-37-891Z
npm run collect:survey-loved -- --replay 2026-10-27T00-06-21-712Z
```

Collector tests replay active exports offline. Website tests reconcile every history with its CSV, preserve missing values and partial periods, and check sorting, source dates, plots, and point tooltips.
