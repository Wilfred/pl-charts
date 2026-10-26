import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readPackageSnapshot } from "../scripts/package-data.ts";
import { LANGUAGES, metricCounts, rankLanguages } from "../src/data.ts";
const source = readFileSync(
  new URL("../../data/exports/packages.csv", import.meta.url),
  "utf8",
);
test("packages use the four collected registry totals and preserve unmeasured ecosystems", () => {
  const snapshot = readPackageSnapshot(source);
  assert.deepEqual(snapshot.counts, metricCounts("packages.published"));
  assert.equal(
    Object.values(snapshot.counts).filter((value) => value !== null).length,
    4,
  );
  assert.equal(snapshot.counts.Go, null);
  assert.equal(snapshot.counts.Ruby, null);
  assert.equal(snapshot.counts.TypeScript, null);
  assert.equal(Object.keys(snapshot.counts).length, LANGUAGES.length);
  assert.equal(rankLanguages("packages.published").at(-1)?.rank, null);
});
test("incomplete, invalid, duplicate, or mixed package runs fail before rendering", () => {
  const lines = source.trim().split("\n");
  for (const input of [
    lines.slice(0, -1).join("\n"),
    source + lines[1] + "\n",
    source.replace(
      ",packages,packages.published,",
      ",other,packages.published,",
    ),
    source.replace(/,\d+,packages,/, ",-1,packages,"),
  ])
    assert.throws(() => readPackageSnapshot(input));
});
