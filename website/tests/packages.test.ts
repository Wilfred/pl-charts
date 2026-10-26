import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readPackageSnapshot } from "../scripts/package-data.ts";
import { JSDOM } from "jsdom";
import { HOST_NAMES, HOST_URLS } from "../src/package-hosts.ts";
import { initializeRankings } from "../src/rankings.ts";
import { metricCounts, rankLanguages } from "../src/data.ts";
const source = readFileSync(
  new URL("../../data/exports/packages.csv", import.meta.url),
  "utf8",
);
test("packages rank hosts without assigning their totals to languages", () => {
  const snapshot = readPackageSnapshot(source);
  assert.deepEqual(snapshot.counts, metricCounts("packages.published"));
  assert.deepEqual(Object.keys(snapshot.counts).sort(), [...HOST_NAMES].sort());
  assert.equal(Object.keys(snapshot.counts).length, 14);
  for (const language of ["JavaScript", "TypeScript", "Java", "Python"])
    assert.ok(!Object.hasOwn(snapshot.counts, language));
  const rows = rankLanguages("packages.published");
  assert.equal(rows.length, 14);
  assert.ok(rows.every((row) => row.value !== null && row.rank !== null));
  const { window } = new JSDOM(
    readFileSync(new URL("../packages.html", import.meta.url), "utf8"),
  );
  const document = window.document;
  const hostHeader = document.querySelector('[data-sort="language"]')!;
  assert.equal(hostHeader.textContent?.trim(), "Host");
  assert.equal(document.querySelectorAll("tbody th a").length, 14);
  initializeRankings(document);
  assert.equal(document.querySelectorAll("tbody th a").length, 14);
  for (const link of document.querySelectorAll<HTMLAnchorElement>("tbody th a"))
    assert.equal(link.getAttribute("href"), HOST_URLS[link.textContent!]);
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
