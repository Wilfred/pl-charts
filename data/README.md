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
| GitHub                | `github.pushes`, `github.pull_requests`            | Aggregate GH Archive events by month or quarter, following GitHut 2.0's queries                                   | Event actions, bot filtering, primary-language attribution, fork policy, query text, dataset partition, and query cost |
| Packages              | `packages.published`                               | Snapshot the four public aggregate endpoints                                                                      | Registry scope, package names versus versions, source freshness, and missing observations                              |
| Stack Overflow        | `stackoverflow.questions`, `stackoverflow.answers` | Aggregate posts by language tags using Stack Exchange datasets or Data Explorer; join answers to parent questions | Tag aliases, version tags, deleted posts, parent-tag attribution, and snapshot versus monthly counts                   |
| Stack Overflow Survey | `survey.usage`                                     | Read the annual downloadable survey files                                                                         | Survey year, question identifier, respondent cohort, missing answers, multi-select denominator, and license            |
| Releases              | `releases.stable`                                  | Parse official version histories into dated release events before yearly aggregation                              | Implementation, stable channel, feature/maintenance classification, publication date, and duplicate tags               |
| Hacker News           | `hacker_news.job_descriptions`                     | Fetch monthly hiring threads through the HN API and classify top-level employer comments                          | Thread IDs, comment coverage, language aliases, deleted comments, company duplicates, and matching rules               |

Start each adapter with a small saved fixture and offline tests. Retain source-native identifiers and raw numeric measurements. For surveys and mention shares, preserve the numerator, denominator, cohort, and question or matching definition in a sidecar manifest; a shared dimension table or an explicitly versioned schema extension can expose those fields when the first adapter is implemented.

For events, use explicit half-open intervals `[period_start, period_end)` in UTC. For stock counts, record observation times without inventing an interval. Record gaps as missing observations. Retain revised source data as a new run and identify corrections through the method version and manifest.

Suggested collection cadence is daily for package totals, monthly for GitHub/HN/Stack Overflow aggregates, annually for surveys, and at each published release for release histories. Introduce scheduling after validating each adapter's completeness and request cost. Large event-level datasets should use compressed, partitioned files or separately hosted archives with checked-in manifests and checksums; keep the small aggregate CSV exports in Git.

Website metrics currently use design values and the requested `1970` update badges. The collected registry dataset is available as a separate download. Connecting it to language rankings requires explicit ecosystem-to-language mapping and coverage rules, especially for npm and Maven.
