import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { readGithubSnapshot } from "../scripts/github-data.ts";
import {
  DEFAULT_GITHUB_QUARTER,
  GITHUB_QUARTERS,
  githubCounts,
  rankLanguages,
} from "../src/data.ts";
import { initializeRankings } from "../src/rankings.ts";

const fixture = [
  "schema_version,run_id,category,metric,entity_kind,unit,entity_id,value,period_start,period_end,observed_at",
  ...["github.pushes", "github.pull_requests"].flatMap((metric) => [
    `1,run-1,github,${metric},language,events,Python,10,2023-10-01T00:00:00.000Z,2024-01-01T00:00:00.000Z,2026-10-26T00:00:00Z`,
    `1,run-1,github,${metric},language,events,Rust,20,2024-01-01T00:00:00.000Z,2024-04-01T00:00:00.000Z,2026-10-26T00:00:01Z`,
  ]),
].join("\n");

test("quarterly snapshot preserves missing values and validates both metric series", () => {
  const snapshot = readGithubSnapshot(fixture);
  assert.deepEqual(snapshot.quarters, ["2023-Q4", "2024-Q1"]);
  assert.equal(snapshot.latestQuarter, "2024-Q1");
  assert.equal(snapshot.counts["github.pushes"]["2023-Q4"]?.Python, 10);
  assert.equal(snapshot.counts["github.pushes"]["2023-Q4"]?.Rust, null);
  assert.throws(
    () => readGithubSnapshot(fixture + "\n" + fixture.split("\n")[1]),
    /Duplicate/,
  );
  assert.throws(
    () =>
      readGithubSnapshot(
        fixture.replace("2024-04-01T00:00:00.000Z", "2024-05-01T00:00:00.000Z"),
      ),
    /quarter end/,
  );
});

test("the rendered dataset matches the checked-in quarterly export", () => {
  const source = readFileSync(
    new URL("../../data/exports/github.csv", import.meta.url),
    "utf8",
  );
  const snapshot = readGithubSnapshot(source);
  assert.equal(GITHUB_QUARTERS.length, snapshot.quarters.length);
  assert.equal(DEFAULT_GITHUB_QUARTER, snapshot.latestQuarter);
  assert.equal(GITHUB_QUARTERS[0], snapshot.quarters[0]);
  assert.deepEqual(
    githubCounts("github.pushes", DEFAULT_GITHUB_QUARTER),
    snapshot.counts["github.pushes"][DEFAULT_GITHUB_QUARTER],
  );
  assert.deepEqual(
    githubCounts("github.pull_requests", DEFAULT_GITHUB_QUARTER),
    snapshot.counts["github.pull_requests"][DEFAULT_GITHUB_QUARTER],
  );
});

test("quarter selectors update their metric independently and keep unavailable counts missing", () => {
  const { window } = new JSDOM(
    readFileSync(new URL("../github.html", import.meta.url), "utf8"),
  );
  const document = window.document;
  initializeRankings(document);
  const pushes = document.querySelector('[data-metric="github.pushes"]');
  const pulls = document.querySelector('[data-metric="github.pull_requests"]');
  assert.ok(pushes && pulls);
  const before = pulls.querySelector("tbody")?.textContent;
  const select = pushes.querySelector<HTMLSelectElement>(".github-quarter");
  assert.ok(select);
  select.value = "2012-Q2";
  select.dispatchEvent(new window.Event("change"));
  assert.equal(pulls.querySelector("tbody")?.textContent, before);
  const expected = rankLanguages("github.pushes", 2025, "2012-Q2");
  const actual = [...pushes.querySelectorAll("tbody tr")];
  assert.deepEqual(
    actual.map((row) => row.querySelector("th")?.textContent?.trim()),
    expected.map((row) => row.language),
  );
  expected.forEach((row, index) => {
    if (row.value === null) {
      assert.equal(actual[index]?.querySelector("td")?.textContent, "—");
      assert.equal(
        actual[index]?.querySelector("td:last-child")?.textContent,
        "—",
      );
    }
  });
  assert.equal(
    pushes.querySelector("caption")?.textContent,
    "Pushes rankings, 2012 Q2",
  );
  assert.equal(select.options.length, GITHUB_QUARTERS.length);
});

test("partial quarters retain exact cutoff and all-language attribution coverage", () => {
  const source =
    fixture.replaceAll("2024-04-01T00:00:00.000Z", "2024-02-01T12:00:00.000Z") +
    "\n1,run-1,github,github.pushes,language,events,Unknown,60,2024-01-01T00:00:00.000Z,2024-02-01T12:00:00.000Z,2026-10-26T00:00:01Z";
  const snapshot = readGithubSnapshot(source);
  assert.equal(snapshot.cutoff, "2024-02-01T12:00:00.000Z");
  assert.equal(snapshot.coverage["github.pushes"]["2024-Q1"], 0.25);
  assert.equal(snapshot.coverage["github.pull_requests"]["2024-Q1"], 1);
  assert.throws(
    () => readGithubSnapshot(source.replace("Unknown,60", "Unknown,-60")),
    /count/,
  );
});
