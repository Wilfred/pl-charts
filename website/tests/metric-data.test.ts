import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readMetricHistory } from "../scripts/metric-data.ts";
import {
  METRICS,
  METRIC_INFO,
  metricSnapshot,
  metricCounts,
  periodOptions,
  defaultPeriod,
} from "../src/data.ts";
const fixture = [
  "schema_version,run_id,category,metric,entity_kind,unit,entity_id,value,period_start,period_end,observed_at",
  "1,run-1,github,github.pushes,language,events,Python,10,2023-10-01T00:00:00.000Z,2024-01-01T00:00:00.000Z,2026-10-26T00:00:00Z",
  "1,run-1,github,github.pushes,language,events,Rust,0,2023-10-01T00:00:00.000Z,2024-01-01T00:00:00.000Z,2026-10-26T00:00:00Z",
  "1,run-1,github,github.pushes,language,events,Unknown,30,2023-10-01T00:00:00.000Z,2024-01-01T00:00:00.000Z,2026-10-26T00:00:00Z",
  "1,run-1,github,github.pushes,language,events,Python,4,2024-01-01T00:00:00.000Z,2024-02-01T00:00:00.000Z,2026-10-26T00:00:00Z",
].join("\n");
test("history reader preserves zeros and missing values, measures coverage, and excludes partial periods", () => {
  const snapshot = readMetricHistory(fixture, ["github.pushes"])[
    "github.pushes"
  ]!;
  assert.deepEqual(snapshot.periods, ["2023-Q4"]);
  assert.equal(snapshot.latestPeriod, "2023-Q4");
  assert.equal(snapshot.counts["2023-Q4"]?.Rust, 0);
  assert.equal(snapshot.counts["2023-Q4"]?.Java, null);
  assert.equal(snapshot.coverage["2023-Q4"], 0.25);
  assert.deepEqual(snapshot.partialPeriods, ["2024-Q1"]);
  for (const source of [
    fixture + "\n" + fixture.split("\n")[1],
    fixture.replace("Python,10", "Python,-10"),
    fixture.replace("run-1,github", "run-2,github"),
    fixture.replace("language,events", "language,posts"),
    fixture.replace("2024-02-01T00:00:00.000Z", "2024-05-01T00:00:00.000Z"),
  ])
    assert.throws(() => readMetricHistory(source, ["github.pushes"]));
});
test("a missing month remains a gap rather than an observed zero", () => {
  const data = [
    "schema_version,run_id,category,metric,entity_kind,unit,entity_id,value,period_start,period_end,observed_at",
    ...[
      ["04", "05"],
      ["06", "07"],
    ].map(
      ([start, end]) =>
        `1,run,hiring,hacker_news.job_descriptions,language,comments,Python,1,2025-${start}-01T00:00:00.000Z,2025-${end}-01T00:00:00.000Z,2026-10-26T00:00:00Z`,
    ),
  ].join("\n");
  const result = readMetricHistory(data, ["hacker_news.job_descriptions"])[
    "hacker_news.job_descriptions"
  ]!;
  assert.deepEqual(result.periods, ["2025-04", "2025-05", "2025-06"]);
  assert.equal(result.counts["2025-05"]?.Python, null);
  assert.deepEqual(result.periodOptions, ["2025-04", "2025-06"]);
});
test("every rendered history is derived from its checked-in CSV", () => {
  for (const file of [
    "github",
    "stackoverflow",
    "surveys",
    "releases",
    "hiring",
  ]) {
    const metrics = METRICS.filter(
      (metric) => METRIC_INFO[metric].file === file,
    );
    const result = readMetricHistory(
      readFileSync(
        new URL(`../../data/exports/${file}.csv`, import.meta.url),
        "utf8",
      ),
      metrics,
    );
    for (const metric of metrics) {
      assert.deepEqual(metricSnapshot(metric), result[metric]);
      assert.deepEqual(
        metricCounts(metric),
        result[metric]!.counts[defaultPeriod(metric)],
      );
      assert.ok(periodOptions(metric).length > 1);
      assert.ok(
        periodOptions(metric).every(
          (period) => !result[metric]!.partialPeriods.includes(period),
        ),
      );
    }
  }
  assert.equal(defaultPeriod("github.pushes"), "2026-Q3");
  assert.equal(defaultPeriod("stackoverflow.questions"), "2024-Q1");
  assert.equal(defaultPeriod("survey.usage"), "2026");
  assert.equal(defaultPeriod("releases.stable"), "2025");
  assert.equal(defaultPeriod("hacker_news.job_descriptions"), "2026-09");
});
