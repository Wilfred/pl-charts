import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import {
  githubQuery,
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
test("direct-query parser retains unknown languages and rejects duplicates and invalid counts", () => {
  const row = {
    name: "Unknown",
    year: 2026,
    quarter: 4,
    pushes: "123",
    pull_requests: 4,
  };
  const parse = (data: unknown[]) =>
    parseGithubQuarterCounts(JSON.stringify({ data }));
  assert.deepEqual(parse([row]), [
    { language: "Unknown", quarter: "2026-Q4", pushes: 123, pull_requests: 4 },
  ]);
  assert.throws(() => parse([row, row]), /Duplicate/);
  for (const pushes of [-1, 1.5, "9007199254740992", undefined])
    assert.throws(() => parse([{ ...row, pushes }]));
  assert.throws(() => parse([]));
  assert.throws(() =>
    parseGithubQuarterCounts('{"exception":"query timed out","data":[]}'),
  );
});
test("normalization clips the current quarter and preserves provenance and zeros", () => {
  const rows = githubObservations(
    [{ language: "Python", quarter: "2026-Q4", pushes: 123, pull_requests: 0 }],
    {
      runId: "run-1",
      observedAt: "2026-10-26T20:00:00.000Z",
      cutoff: "2026-10-26T19:00:00.000Z",
      rawPath: "raw/quarters.json",
    },
  );
  assert.equal(rows[0]?.metric, "github.pushes");
  assert.equal(rows[0]?.value, "123");
  assert.equal(rows[1]?.metric, "github.pull_requests");
  assert.equal(rows[1]?.value, "0");
  assert.equal(rows[0]?.period_start, "2026-10-01T00:00:00.000Z");
  assert.equal(rows[0]?.period_end, "2026-10-26T19:00:00.000Z");
  assert.equal(rows[0]?.source_updated_at, rows[0]?.period_end);
  assert.equal(rows[0]?.raw_path, "raw/quarters.json");
});
test("query counts opened requests and bounds both events and language snapshots", () => {
  const sql = githubQuery("2026-10-26T19:00:00.000Z");
  assert.match(sql, /action = 'opened'/);
  assert.match(sql, /LEFT JOIN/);
  assert.match(sql, /e.file_time < '2026-10-26 19:00:00'/);
  assert.match(sql, /snapshot_at < '2026-10-26 19:00:00'/);
  assert.throws(() => githubQuery("'; DROP TABLE"));
});

test("the active GitHub export replays offline from checked-in query responses", () => {
  const source = readFileSync(
    new URL("../../data/exports/github.csv", import.meta.url),
    "utf8",
  );
  const run = source.split("\n")[1]?.split(",")[1];
  assert.ok(run);
  const output = execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("../src/collect-github.ts", import.meta.url)),
      "--replay",
      run,
    ],
    { encoding: "utf8" },
  );
  assert.match(output, /Verified \d+ quarters offline/);
  assert.equal(
    source,
    readFileSync(
      new URL(`../../data/observations/github/${run}.csv`, import.meta.url),
      "utf8",
    ),
  );
});
