import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  CATEGORIES,
  LANGUAGES,
  METRICS,
  METRIC_INFO,
  rankValues,
  rankLanguages,
  formatValue,
  formatRank,
  periodOptions,
  defaultPeriod,
  formatPeriod,
} from "../src/data.ts";
import { initializeRankings } from "../src/rankings.ts";
const load = (page: string) =>
  new JSDOM(readFileSync(new URL(`../${page}`, import.meta.url), "utf8"));
const rows = (section: ParentNode) =>
  [...section.querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent?.trim() ?? ""),
  );
const expected = (
  metric: (typeof METRICS)[number],
  period = defaultPeriod(metric),
) =>
  rankLanguages(metric, period).map((row) => [
    formatRank(row.rank),
    row.language,
    formatValue(metric, row.value),
  ]);
test("competition ranks retain ties and keep missing observations separate from zero", () => {
  const result = rankValues({
    JavaScript: 10,
    Python: 10,
    Java: 5,
    Go: 5,
    Rust: 0,
  });
  assert.deepEqual(
    result.slice(0, 5).map((row) => [row.language, row.rank]),
    [
      ["JavaScript", 1],
      ["Python", 1],
      ["Go", 3],
      ["Java", 3],
      ["Rust", 5],
    ],
  );
  assert.equal(result.length, 20);
  assert.equal(result.find((row) => row.language === "Ruby")?.rank, null);
});
for (const category of CATEGORIES)
  test(`${category.label}: static values, independent sorting, and period selection`, () => {
    const { window } = load(category.href),
      document = window.document;
    assert.equal(
      document.querySelectorAll("[data-metric]").length,
      category.metrics.length,
    );
    for (const metric of category.metrics)
      assert.deepEqual(
        rows(document.querySelector(`[data-metric="${metric}"]`)!),
        expected(metric),
      );
    initializeRankings(document);
    for (const metric of category.metrics) {
      const section = document.querySelector<HTMLElement>(
        `[data-metric="${metric}"]`,
      )!;
      assert.equal(rows(section).length, LANGUAGES.length);
      assert.deepEqual(rows(section), expected(metric));
      assert.equal(
        section.querySelector(".updated-badge time")?.textContent,
        METRIC_INFO[metric].updatedAt,
      );
      assert.notEqual(METRIC_INFO[metric].updatedAt, "1970-01-01");
      const button = section.querySelector<HTMLButtonElement>(
        '[data-sort="language"]',
      )!;
      button.click();
      assert.equal(
        rows(section)[0]?.[1],
        [...LANGUAGES].sort((a, b) => a.localeCompare(b))[0],
      );
      button.click();
      assert.equal(
        rows(section)[0]?.[1],
        [...LANGUAGES].sort((a, b) => b.localeCompare(a))[0],
      );
      section.querySelector<HTMLButtonElement>('[data-sort="rank"]')!.click();
      assert.deepEqual(rows(section), expected(metric));
      assert.equal(section.querySelectorAll("th[aria-sort]").length, 1);
      const control =
        section.querySelector<HTMLSelectElement>(".metric-period");
      if (control) {
        const sibling = [...document.querySelectorAll("[data-metric]")].find(
          (other) => other !== section,
        );
        const before = sibling ? rows(sibling) : null;
        for (const period of [
          periodOptions(metric)[0]!,
          defaultPeriod(metric),
        ]) {
          control.value = period;
          control.dispatchEvent(new window.Event("change"));
          assert.deepEqual(rows(section), expected(metric, period));
          assert.equal(
            section.querySelector("caption")?.textContent,
            `${METRIC_INFO[metric].label} rankings, ${formatPeriod(period)}`,
          );
          if (sibling) assert.deepEqual(rows(sibling), before);
        }
      }
    }
  });
test("overview exposes all 20 languages and eight measured metrics without update badges", () => {
  const { window } = load("index.html"),
    document = window.document;
  initializeRankings(document);
  const section = document.querySelector("[data-overview]")!;
  assert.equal(rows(section).length, 20);
  assert.equal(rows(section)[0]?.length, 9);
  assert.equal(document.querySelectorAll("time,.updated-badge").length, 0);
  const before = rows(section);
  section
    .querySelector<HTMLButtonElement>('[data-sort="survey.usage"]')!
    .click();
  assert.deepEqual(
    rows(section)[0]?.[0],
    rankLanguages("survey.usage")[0]?.language,
  );
  assert.deepEqual(rows(section).sort(), before.sort());
});
test("category navigation, source links, and downloads are canonical", () => {
  for (const page of [
    "index.html",
    ...CATEGORIES.map((category) => category.href),
  ]) {
    const { document } = load(page).window;
    assert.equal(
      document.querySelectorAll("nav a[aria-current='page']").length,
      1,
    );
    for (const category of CATEGORIES)
      assert.equal(
        document
          .querySelector(`nav a[href='${category.href}']`)
          ?.textContent?.trim(),
        category.label,
      );
    if (page !== "index.html") {
      assert.ok(document.querySelectorAll(".references li").length >= 2);
      for (const link of document.querySelectorAll<HTMLAnchorElement>(
        ".data-download",
      ))
        assert.ok(link.getAttribute("href")?.endsWith(".csv"));
    }
    assert.equal(
      document.querySelectorAll(
        ".table-note,.ranking-order,input[type='search'],.breadcrumbs",
      ).length,
      0,
    );
  }
});
