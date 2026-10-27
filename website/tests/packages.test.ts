import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readPackageSnapshot } from "../scripts/package-data.ts";
import { JSDOM } from "jsdom";
import {
  SERVICE_NAMES,
  SERVICE_URLS,
  SERVICE_LANGUAGES,
  PACKAGE_SERVICES,
} from "../src/package-services.ts";
import { initializeRankings } from "../src/rankings.ts";
import { metricCounts, rankLanguages } from "../src/data.ts";
const source = readFileSync(
  new URL("../../data/exports/packages.csv", import.meta.url),
  "utf8",
);
test("packages rank services without assigning their totals to languages", () => {
  const snapshot = readPackageSnapshot(source);
  assert.deepEqual(snapshot.counts, metricCounts("packages.published"));
  assert.deepEqual(
    Object.keys(snapshot.counts).sort(),
    [...SERVICE_NAMES].sort(),
  );
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
  const serviceHeader = document.querySelector('[data-sort="language"]')!;
  assert.equal(serviceHeader.textContent?.trim(), "Service");
  assert.equal(document.querySelectorAll("tbody th a").length, 14);
  const supportedLanguages = () => {
    for (const row of document.querySelectorAll("tbody tr")) {
      const name = row.querySelector("th a")!.textContent!;
      assert.equal(
        row.querySelector(".entity-languages")?.textContent,
        SERVICE_LANGUAGES[name],
      );
    }
  };
  assert.equal(SERVICE_LANGUAGES.npm, "JavaScript, TypeScript");
  assert.ok(SERVICE_LANGUAGES["Maven Central"]!.includes("Kotlin"));
  assert.ok(SERVICE_LANGUAGES.Hex!.includes("Gleam"));
  assert.ok(PACKAGE_SERVICES.every((service) => service.languages.length > 0));
  supportedLanguages();
  initializeRankings(document);
  supportedLanguages();
  document.querySelector<HTMLButtonElement>('[data-sort="language"]')!.click();
  supportedLanguages();
  assert.equal(document.querySelectorAll("tbody th a").length, 14);
  for (const link of document.querySelectorAll<HTMLAnchorElement>("tbody th a"))
    assert.equal(link.getAttribute("href"), SERVICE_URLS[link.textContent!]);
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
