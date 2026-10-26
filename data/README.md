# Data collection and storage

`exports/packages.csv` is the current package-count export. Each row is one registry observation. `observations/packages/` contains dated CSV snapshots; `raw/packages/` contains the original responses and provenance manifests.

```python
import pandas as pd

counts = pd.read_csv("data/exports/packages.csv")
print(counts[["entity_id", "value", "observed_at", "source_updated_at"]])
```

Python's standard `csv` module, R, spreadsheets, and DuckDB can read the same files. Counts use integers without thousands separators. Timestamps use UTC ISO 8601. Empty fields represent unavailable metadata.

## Package collector

From the repository root:

```sh
npm ci
npm run collect:packages
```

The collector makes one request per registry, records the exact response bytes, validates the count, and writes the CSV. A timeout, HTTP failure, or parse failure is recorded in the run manifest. A failed run preserves its responses and leaves the current export unchanged. Each run has a unique directory; existing runs are retained.

| Registry          | Endpoint                              | Counting unit                                   | Method version                     |
| ----------------- | ------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| PyPI              | <https://pypi.org/>                   | Homepage project count                          | `pypi-project-count-v1`            |
| npm               | <https://replicate.npmjs.com/>        | Registry `doc_count`                            | `npm-registry-doc-count-v1`        |
| crates.io (Cargo) | <https://crates.io/api/v1/summary>    | `num_crates`                                    | `crates-num-crates-v1`             |
| Maven Central     | <https://search.maven.org/quickstats> | Distinct `groupId:artifactId` pairs, `gaNumber` | `maven-distinct-group-artifact-v1` |

These are aggregate registry totals. PyPI projects and crates are package names; npm reports registry documents; Maven reports coordinates spanning JVM languages. Versions and downloads have separate units. The npm endpoint replaces the original collector's `skimdb.npmjs.com/registry` endpoint. PyPI's homepage HTML and Maven's quickstats endpoint need monitoring for format changes.

The first Maven response reports `2026-06-26T20:33:56Z` as its source modification date, despite being fetched in October. `observed_at` records retrieval; `source_updated_at` records the source's reported freshness. Consumers should inspect both dates.

The original [Modulecounts repository](https://github.com/edebill/modulecounts) is cloned locally at `vendor/modulecounts/`, initially at `0643af5f34e9af7d732d3e95f3d976cdf1389697`. It is ignored by Git and the project tools. To recreate that reference checkout:

```sh
git clone https://github.com/edebill/modulecounts.git vendor/modulecounts
git -C vendor/modulecounts checkout 0643af5f34e9af7d732d3e95f3d976cdf1389697
```

The new TypeScript collector runs independently of the Ruby application.

## Layout and provenance

```text
data/
  raw/<category>/<run_id>/
    <source>.json or <source>.html
    manifest.json
  observations/<category>/<run_id>.csv
  exports/<category>.csv
```

Raw bodies are retained byte for byte and excluded from formatting. Manifests record the source URL, response status, selected HTTP headers, retrieval timestamp, SHA-256, byte count, parser version, and collector Git revision. The initial collection was performed while the collector was being developed; its recorded Git revision is the parent revision. The implementation is committed alongside the snapshots.

The normalized CSV is derived from those responses. `exports/` contains replaceable convenience copies of the latest complete snapshots. The website copies that directory into its production output, so `packages.csv` can be downloaded directly from the Packages page. Collectors write to `data/` and have no dependency on website code.

## Observation schema, version 1

| Column                       | Meaning                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `schema_version`             | Observation format version                                       |
| `run_id`                     | Collection run identifier                                        |
| `category`                   | Stable category identifier, such as `packages`                   |
| `metric`                     | Stable qualified metric identifier, such as `packages.published` |
| `entity_id`                  | Registry or language identifier                                  |
| `entity_kind`                | Entity type; currently `registry`                                |
| `ecosystem`                  | Ecosystem scope, including shared ecosystems such as JVM         |
| `value`                      | Measured number                                                  |
| `unit`                       | Unit of measurement                                              |
| `period_start`, `period_end` | Measurement interval; blank for snapshot totals                  |
| `observed_at`                | Retrieval time                                                   |
| `source_updated_at`          | Source-reported update time, when available                      |
| `source_url`                 | Public source endpoint                                           |
| `method_version`             | Versioned extraction and counting rule                           |
| `raw_path`                   | Response path relative to `data/`                                |

Ranks are presentation outputs. Store the underlying values and coverage so researchers can calculate ranks over their own entity sets.

## Plan for the remaining categories

Use the same raw → validated observations → export sequence for each category. Keep collection separate from rendering. Each adapter should publish its entity coverage, time window, method version, and source parameters in its manifest.

| Category              | Metrics                                            | Collection approach                                                                                               | Decisions to record                                                                                                    |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GitHub                | `github.pushes`, `github.pull_requests`            | Query GH Archive events directly by UTC quarter                                                                   | Event actions, bot filtering, primary-language attribution, fork policy, query text, dataset partition, and query cost |
| Packages              | `packages.published`                               | Snapshot the four public aggregate endpoints                                                                      | Registry scope, package names versus versions, source freshness, and missing observations                              |
| Stack Overflow        | `stackoverflow.questions`, `stackoverflow.answers` | Aggregate posts by language tags using Stack Exchange datasets or Data Explorer; join answers to parent questions | Tag aliases, version tags, deleted posts, parent-tag attribution, and snapshot versus monthly counts                   |
| Stack Overflow Survey | `survey.usage`                                     | Read the annual downloadable survey files                                                                         | Survey year, question identifier, respondent cohort, missing answers, multi-select denominator, and license            |
| Releases              | `releases.stable`                                  | Parse official version histories into dated release events before yearly aggregation                              | Implementation, stable channel, feature/maintenance classification, publication date, and duplicate tags               |
| Hacker News           | `hacker_news.job_descriptions`                     | Fetch monthly hiring threads through the HN API and classify top-level employer comments                          | Thread IDs, comment coverage, language aliases, deleted comments, company duplicates, and matching rules               |

Start each adapter with a small saved fixture and offline tests. Retain source-native identifiers and raw numeric measurements. For surveys and mention shares, preserve the numerator, denominator, cohort, and question or matching definition in a sidecar manifest; a shared dimension table or an explicitly versioned schema extension can expose those fields when the first adapter is implemented.

For events, use explicit half-open intervals `[period_start, period_end)` in UTC. For stock counts, record observation times without inventing an interval. Record gaps as missing observations. Retain revised source data as a new run and identify corrections through the method version and manifest.

Suggested collection cadence is daily for package totals, monthly for GitHub/HN/Stack Overflow aggregates, annually for surveys, and at each published release for release histories. Introduce scheduling after validating each adapter's completeness and request cost. Large event-level datasets should use compressed, partitioned files or separately hosted archives with checked-in manifests and checksums; keep the small aggregate CSV exports in Git.

The website renderer reads `exports/packages.csv` at build time. Its display maps npm to JavaScript, PyPI to Python, crates.io to Rust, and Maven Central to Java; Go and Ruby display zero. This attribution is a presentation convention: npm covers JavaScript and TypeScript, and Maven covers JVM languages. Raw observations retain registry entities and ecosystem scope.

Package update badges show the latest `observed_at` date in the snapshot. Source freshness remains available in `source_updated_at`, including Maven’s older reported date. GitHub also uses collected quarterly data; Stack Overflow, surveys, releases, and Hacker News retain design values.

## Quarterly GitHub backfill

```sh
npm run collect:github
npm run collect:github -- --replay RUN_ID
```

The collector runs our own SQL against [ClickHouse’s public GitHub event database](https://clickhouse.com/docs/get-started/sample-datasets/github-events), a mirror of [GH Archive](https://www.gharchive.org/). No GitHut aggregates enter this method. Each run queries the full available history, including the current partial quarter. It selects an exclusive cutoff at the end of the latest archived hour, then bounds both event timestamps and archive file timestamps. The archive begins on 2011-02-12, so the first quarter is also partial. Source ingestion gaps remain a property of the archive; the cutoff does not certify uninterrupted delivery.

`github.pushes` counts PushEvent rows. `github.pull_requests` counts PullRequestEvent rows whose action is `opened`. Bots and forks are included. Requests are attributed to the destination repository. Counts describe public activity retained by the source.

Language attribution joins repository names to `repos` and `github_repos_history`, taking the latest known primary language at the cutoff (lexical language breaks timestamp ties). `repos` is an older metadata snapshot; the history table adds later observations. The join is case-sensitive and cannot resolve repository renames. Attribution applies that snapshot language to all historical events. It is not the language of each changed file. The metadata covers a subset of repositories, particularly for recent activity; these are counts within the attributed subset. Unmatched repositories and empty primary languages are retained under `Unknown`. Calculate coverage as the sum of known-language counts divided by all counts for the metric and quarter. Changes in coverage can affect trends.

Every language group is retained. An absent group within a covered quarter is normalized to zero; gaps between quarters abort publication. CSV intervals are half-open UTC intervals; the final quarter ends at the source cutoff. The first quarter starts at its calendar boundary, with the actual archive start recorded in the manifest. The method is `gharchive-clickhouse-primary-language-v1`.

Raw JSON query responses, executed SQL, response checksums, query statistics, collection timestamps, source bounds, and normalized observations are checked in. `--replay` verifies checksums and SQL and recreates the observation CSV byte for byte without network access. A fresh live run may differ as the archive and repository metadata change; offline replay reproduces the saved run. Publication replaces `exports/github.csv` atomically after validation. A failed query leaves the previous export intact.

The older GitHut import remains in its dated raw and observation directories as historical provenance. It is not used by the direct collector or the active website export, and its counting rules differ.

The current run is `2026-10-26T19-48-52-758Z`: 80,512 observations, 64 quarters (2011 Q1–2026 Q4), 628 named languages plus Unknown, and a cutoff of `2026-10-26T19:00:00.000Z`. The latest quarter attributes 3.3% of pushes and 10.1% of opened pull requests to a known language. Both plots show the coverage range and latest share. Refresh and replay:

```sh
npm run collect:github
npm run collect:github -- --replay 2026-10-26T19-48-52-758Z
```

The collector test suite replays the active export offline and compares it with its saved observation CSV. Website tests check partial intervals, Unknown coverage, plot gaps, and independent language controls.
