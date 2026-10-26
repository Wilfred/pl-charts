# GitHub language attribution

The low push coverage comes primarily from missing repository metadata. Our current language join is too sparse for interpreting the plotted counts as trends across all public GitHub activity. GitHut also loses unattributed activity, but its mapping and event filters differ. Its published percentages do not measure attribution coverage.

## Evidence

The diagnostic run is `data/raw/github-attribution/2026-10-26T20-12-11-960Z/`. It uses the same exclusive source cutoff as the active collection, `2026-10-26T19:00:00.000Z`. The directory contains executed SQL, exact JSON responses, query statistics, timestamps, and checksums. The earlier diagnostic run is also retained.

Run the investigation with:

```sh
npm run inspect:github -- --cutoff 2026-10-26T19:00:00.000Z
```

The SQL templates are in `collectors/sql/github-attribution/`. These queries do not replace the metric export. The breakdown covers 2024 Q1 through the collection cutoff, splitting both metrics into known languages, matching repositories with empty languages, and repositories absent from the metadata. It also compares case-sensitive and case-insensitive joins and counts actors whose names contain `bot`.

### Latest complete quarter: 2026 Q3

| Attribution result               |      Pushes | Share of pushes | Opened pull requests | Share of requests |
| -------------------------------- | ----------: | --------------: | -------------------: | ----------------: |
| Known primary language           |   3,438,951 |         1.4767% |              243,005 |          11.3089% |
| Repository found, empty language |     713,476 |         0.3064% |                6,007 |           0.2796% |
| Repository absent from metadata  | 228,728,686 |        98.2169% |            1,899,774 |          88.4115% |
| Total                            | 232,881,113 |            100% |            2,148,786 |              100% |

These counts reconcile with the active export's known-language sum and Unknown bucket. The plotted 20 languages are a subset of the known-language group.

The `repos` table has 9,061,199 distinct repository names; its latest repository `updated_at` is 20 July 2022. `github_repos_history` has 3,819,295 distinct names with observations from June 2024 through 16 June 2026. Those sets overlap. Neither is a census of repositories active during the event window. Newly created, unobserved, renamed, deleted, and transferred repositories can miss the name join. The results directly establish absent metadata; they do not distinguish those individual causes.

Case-insensitive matching raises Q3 push coverage from 1.4767% to 1.4822%, a gain of 12,868 events. Casing is a minor contributor. Removing actors whose names contain `bot` lowers known-language coverage to 1.1699%; that simple name filter does not resolve the missing metadata. The busiest unmatched repositories include high-volume, single-actor activity without `bot` in the actor name. Actor names alone do not identify automation reliably.

Known-language push coverage falls from 8.2757% in 2024 Q1 to 1.4767% in 2026 Q3. This means the plotted decline can reflect changing metadata coverage as well as activity within the attributed repositories. The partial 2026 Q4 figures previously reported, 3.2742% for pushes and 10.1306% for opened requests, use the same join; that quarter is retained in the export and excluded from the website.

## GitHut's implementation

The ignored reference checkout is `vendor/githut/`, revision `401c43b4c206088b7a8a46ce3840d369c6b6e850`.

The implemented query in [scripts/query.js](https://github.com/madnight/githut/blob/401c43b4c206088b7a8a46ce3840d369c6b6e850/scripts/query.js) builds a repository-language map from `payload.pull_request.base.repo.language` in the same queried archive tables. When a repository has several language observations, it selects the first language in lexical order. It joins all target events to that map with an inner join.

Consequences:

- Events in repositories without a usable base-repository language observation in the queried window are omitted. Push-only repositories can therefore disappear.
- Language metadata is contemporaneous with the queried archive tables, unlike our separate repository snapshots. The two attribution sets need not overlap closely.
- Actor names containing `bot` are excluded. Actor/language/quarter/event groups above 1,000 events are also excluded.
- Pull-request counts include event actions rather than only openings. Published results retain the top 100 language groups per query.

The README also contains an older example joining the BigQuery repository-language dataset. That example differs from the executable script, so the script is the basis of this comparison.

[LangTable.js](https://github.com/madnight/githut/blob/401c43b4c206088b7a8a46ce3840d369c6b6e850/src/components/LangTable.js) divides each retained count by the sum of retained language counts. [LangChart.js](https://github.com/madnight/githut/blob/401c43b4c206088b7a8a46ce3840d369c6b6e850/src/components/LangChart.js) similarly normalizes the supplied series. Unmatched events have already disappeared before those denominators are calculated.

Thus GitHut has an attribution-selection problem too. Its published files have no Unknown bucket or pre-join event total, so they cannot establish the percentage of all pushes successfully attributed. For example, its 2024 Q1 published push file sums to 1,150,279 events across 100 languages, versus 309,904,712 raw pushes in our archive query for that quarter. That 0.3712% retained share combines attribution loss, actor filters, the volume cap, top-language truncation, and possible source differences. It is not an attribution-coverage estimate. Quantifying GitHut's attribution loss separately requires rerunning its language-map join while retaining unmatched events and measuring each filter stage.

## Collection changes to evaluate

The ClickHouse `github_events` projection has neither the original payload nor the base-repository language field; the saved schema confirms this. Reproducing a payload-derived language map requires raw [GH Archive](https://www.gharchive.org/) files or its BigQuery tables.

A stronger next method would build a dated language map from those payloads, use repository IDs where available to handle renames, and supplement missing active repositories with cached GitHub repository metadata. Measure coverage before filtering actors or limiting language groups, and preserve each loss category. Payload-derived attribution still selects for repositories with relevant pull-request activity; its coverage must be measured rather than assumed.

Before treating the lines as language-wide trends, compare quarterly coverage and counts across both methods. Keep source changes under a new method version. The current source counts and Unknown observations remain useful for auditing the join.

## Capture audit: the apparent post-2024 decline

The expanded website uses 20 languages. Expanding that display cohort does not repair the underlying source coverage.

`data/raw/github-health/2026-10-26T22-00-14-966Z/` retains our monthly capture audit. `data/exports/github-health.csv` contains the normalized results. Reproduce it with `npm run inspect:github-health`; replay the saved run with `--replay 2026-10-26T22-00-14-966Z`.

| Month          | Recorded pushes | Recorded PR events | Opened PR events | Represented archive hours |
| -------------- | --------------: | -----------------: | ---------------: | ------------------------: |
| January 2026   |      74,652,688 |          9,208,937 |        3,182,595 |                       744 |
| June 2026      |      95,398,281 |          1,163,246 |          463,726 |                       720 |
| July 2026      |     112,891,188 |            333,048 |          126,164 |                       744 |
| August 2026    |      83,158,500 |            348,205 |          131,065 |                       744 |
| September 2026 |      36,831,425 |          4,979,767 |        1,891,557 |                       720 |

The unjoined PR series itself collapses in July and August and recovers in September. Those two months have all 744 archive-hour timestamps represented. The push series changes differently. Hour presence measures timestamps with stored rows; it cannot certify complete capture or ingestion of each file. Missing-hour counts alone cannot explain these movements.

The retained PR rows report zero missing-action values in this audit. Our metric counts rows with action `opened`; push counts use event rows, rather than payload commit counts. This checks the arithmetic and action handling of the retained source data. It cannot measure events lost before those rows reached the table.

There are therefore two distinct coverage problems: the sparse repository-language join, quantified above, and changing capture in the unjoined archive. Both affect the apparent time trend.

Google’s [September 2026 investigation](https://opensource.googleblog.com/2026/09/how-much-should-you-trust-your-oss-data.html) independently estimates substantially reduced GH Archive retention since 2025, with some 2026 event types near 20%. It advises against using the archive for volume-based metrics. GitHub also [announced reductions to Events API payloads in 2025](https://github.blog/changelog/2025-08-08-upcoming-changes-to-github-events-api-payloads/); field availability is another variable when reconstructing language maps from payloads.

The current series establishes counts of recorded archive events within the attributed subset. It cannot establish a decline in overall GitHub development activity. The site labels that scope, reports attribution coverage, and shades 2025 onward to identify the documented capture-change period. The source data is preserved for inspection and comparison with future collection methods.
