import assert from "node:assert/strict";
import test from "node:test";
import {
  GITHUT_REVISION,
  githubObservations,
  parseGithubQuarterCounts,
  quarterInterval,
} from "../src/github.ts";

test("quarters have UTC half-open intervals including year boundaries", () => {
  assert.deepEqual(quarterInterval(2023, 4), {
    start: "2023-10-01T00:00:00.000Z",
    end: "2024-01-01T00:00:00.000Z",
  });
  assert.throws(() => quarterInterval(2024, 5));
});
test("published counts retain all languages and reject duplicate or invalid observations", () => {
  const records = [
    { name: "Ruby", year: "2024", quarter: "1", count: "10" },
    { name: "Python", year: "2023", quarter: "4", count: "20" },
  ];
  const rows = parseGithubQuarterCounts(JSON.stringify(records));
  assert.deepEqual(rows, [
    { language: "Python", quarter: "2023-Q4", value: 20 },
    { language: "Ruby", quarter: "2024-Q1", value: 10 },
  ]);
  assert.throws(
    () => parseGithubQuarterCounts(JSON.stringify([...records, records[0]])),
    /Duplicate/,
  );
  assert.throws(() =>
    parseGithubQuarterCounts(
      '[{"name":"Go","year":"2024","quarter":"1","count":"-1"}]',
    ),
  );
  assert.throws(() => parseGithubQuarterCounts("[]"));
});
test("normalization preserves metric, quarter, language, value, and source provenance", () => {
  const rows = githubObservations(
    [{ language: "Python", quarter: "2024-Q1", value: 123 }],
    {
      metric: "github.pushes",
      runId: "run-1",
      observedAt: "2026-10-26T00:00:00Z",
      sourceUrl: "https://example.test/pushes.json",
      rawPath: "raw/pushes.json",
      revision: GITHUT_REVISION,
    },
  );
  assert.equal(rows[0]?.metric, "github.pushes");
  assert.equal(rows[0]?.entity_id, "Python");
  assert.equal(rows[0]?.value, "123");
  assert.equal(rows[0]?.period_start, "2024-01-01T00:00:00.000Z");
  assert.equal(rows[0]?.period_end, "2024-04-01T00:00:00.000Z");
  assert.equal(rows[0]?.raw_path, "raw/pushes.json");
});
