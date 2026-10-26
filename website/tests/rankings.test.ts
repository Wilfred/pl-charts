import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM, type DOMWindow } from "jsdom";
import {
  CATEGORIES,
  DATA,
  LANGUAGES,
  METRICS,
  METRIC_INFO,
  RELEASE_YEARS,
  formatValue,
  rankLanguages,
  rankValues,
} from "../src/data.ts";
import { initializeRankings } from "../src/rankings.ts";

function loadPage(page: string) {
  const { window } = new JSDOM(
    readFileSync(new URL(`../${page}`, import.meta.url), "utf8"),
  );
  return { window, document: window.document };
}
function rows(section: ParentNode): string[][] {
  return [...section.querySelectorAll("tbody tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent?.trim() ?? ""),
  );
}
function select(
  section: ParentNode,
  window: DOMWindow,
  selector: string,
  value: string,
) {
  const control = section.querySelector<HTMLSelectElement>(selector);
  assert.ok(control);
  control.value = value;
  control.dispatchEvent(new window.Event("change"));
}

test("ties share ranks and leave gaps with alphabetical tie ordering", () => {
  const result = rankValues({
    JavaScript: 10,
    Python: 10,
    Java: 5,
    Go: 5,
    Rust: 3,
    Ruby: 2,
  });
  assert.deepEqual(
    result.map((row) => [row.language, row.rank]),
    [
      ["JavaScript", 1],
      ["Python", 1],
      ["Go", 3],
      ["Java", 3],
      ["Rust", 5],
      ["Ruby", 6],
    ],
  );
});
test("all metrics and release years have a finite count for each language", () => {
  for (const metric of METRICS)
    for (const year of RELEASE_YEARS) {
      const result = rankLanguages(metric, year);
      assert.equal(result.length, LANGUAGES.length);
      assert.deepEqual(
        new Set(result.map((row) => row.language)),
        new Set(LANGUAGES),
      );
      const available = result.flatMap((row) =>
        row.value === null ? [] : [row.value],
      );
      assert.ok(
        available.every(
          (value, index) =>
            Number.isFinite(value) &&
            (!index || value <= available[index - 1]!),
        ),
      );
    }
});
for (const category of CATEGORIES) {
  test(`${category.label}: all metrics render and sort independently`, () => {
    const { document } = loadPage(category.href);
    const initial = [...document.querySelectorAll("[data-metric]")].map(
      (section) => rows(section),
    );
    assert.equal(initial.length, category.metrics.length);
    const captions = [...document.querySelectorAll("caption")].map(
      (caption) => caption.textContent,
    );
    initializeRankings(document);
    assert.deepEqual(
      [...document.querySelectorAll("caption")].map(
        (caption) => caption.textContent,
      ),
      captions,
    );
    category.metrics.forEach((metric, index) => {
      const section = document.querySelector(`[data-metric="${metric}"]`);
      assert.ok(section);
      assert.deepEqual(rows(section), initial[index]);
      assert.equal(rows(section).length, 6);
      const before = rows(section);
      const button = section.querySelector<HTMLButtonElement>(
        'button[data-sort="language"]',
      );
      assert.ok(button);
      button.click();
      const after = rows(section);
      assert.equal(after[0]?.[1], "Go");
      assert.deepEqual([...before].sort(), [...after].sort());
      if (index === 0 && category.metrics.length > 1) {
        const sibling = document.querySelector(
          `[data-metric="${category.metrics[1]}"]`,
        );
        assert.ok(sibling);
        assert.deepEqual(rows(sibling), initial[1]);
      }
      const date = section.querySelector("time");
      const updatedAt = METRIC_INFO[metric].updatedAt;
      assert.equal(date?.getAttribute("datetime"), updatedAt);
      assert.equal(
        date?.textContent,
        updatedAt === "1970-01-01" ? "1970" : updatedAt,
      );
    });
    assert.equal(
      document.querySelector(
        "input[type=search], .breadcrumb, .eyebrow, .sample-notice, .prototype-tag, .table-note",
      ),
      null,
    );
  });
}
test("overview includes every metric and preserves ranks when ordering changes", () => {
  const { document } = loadPage("index.html");
  const section = document.querySelector("[data-overview]");
  assert.ok(section);
  const initial = rows(section);
  initializeRankings(document);
  assert.deepEqual(rows(section), initial);
  assert.equal(section.querySelectorAll("time, .updated-badge").length, 0);
  assert.equal(initial[0]?.length, METRICS.length + 1);
  const button = section.querySelector<HTMLButtonElement>(
    'button[data-sort="hacker_news.job_descriptions"]',
  );
  assert.ok(button);
  button.click();
  assert.equal(rows(section)[0]?.[0], "Python");
  assert.equal(rows(section)[0]?.at(-1), "#1");
  assert.deepEqual([...initial].sort(), rows(section).sort());
});
test("release selector updates only its metric and the caption", () => {
  const { window, document } = loadPage("releases.html");
  initializeRankings(document);
  const section = document.querySelector('[data-metric="releases.stable"]');
  assert.ok(section);
  for (const year of RELEASE_YEARS) {
    select(section, window, ".release-year", String(year));
    assert.deepEqual(
      rows(section),
      rankLanguages("releases.stable", year).map((row) => [
        `#${row.rank}`,
        row.language,
        formatValue("releases.stable", row.value),
      ]),
    );
    assert.equal(
      section.querySelector("caption")?.textContent,
      `Stable release rankings, ${year}`,
    );
  }
  assert.equal(DATA["releases.stable"].series.Rust[0], 12);
});
test("categories have canonical navigation, metric anchors, and annotated references", () => {
  for (const page of [
    "index.html",
    ...CATEGORIES.map((category) => category.href),
  ]) {
    const { document } = loadPage(page);
    for (const category of CATEGORIES)
      assert.equal(
        document
          .querySelector(`nav a[href="${category.href}"]`)
          ?.textContent?.trim(),
        category.label,
      );
    const category = CATEGORIES.find((category) => category.href === page);
    if (!category) continue;
    assert.equal(
      document.querySelector("h1")?.textContent?.trim(),
      category.label,
    );
    assert.ok(document.querySelectorAll(".references li").length >= 2);
    for (const item of document.querySelectorAll(".references li")) {
      assert.ok(item.querySelector("a")?.href.startsWith("https://"));
      assert.ok(item.querySelector("p")?.textContent?.trim());
    }
  }
});

test("column headers toggle directions and expose the active sort to assistive technology", () => {
  const { document } = loadPage("packages.html");
  initializeRankings(document);
  const section = document.querySelector('[data-metric="packages.published"]');
  assert.ok(section);
  const language = section.querySelector<HTMLButtonElement>(
    'button[data-sort="language"]',
  );
  const value = section.querySelector<HTMLButtonElement>(
    'button[data-sort="value"]',
  );
  const rank = section.querySelector<HTMLButtonElement>(
    'button[data-sort="rank"]',
  );
  assert.ok(language && value && rank);
  assert.equal(rank.closest("th")?.getAttribute("aria-sort"), "ascending");
  language.click();
  assert.equal(rows(section)[0]?.[1], "Go");
  assert.equal(language.closest("th")?.getAttribute("aria-sort"), "ascending");
  language.click();
  assert.equal(rows(section)[0]?.[1], "Rust");
  assert.equal(language.closest("th")?.getAttribute("aria-sort"), "descending");
  value.click();
  assert.equal(rows(section)[0]?.[1], "JavaScript");
  assert.equal(value.closest("th")?.getAttribute("aria-sort"), "descending");
  value.click();
  assert.deepEqual(rows(section)[0], ["#5", "Go", "0"]);
  assert.equal(value.closest("th")?.getAttribute("aria-sort"), "ascending");
  assert.equal(section.querySelectorAll("th[aria-sort]").length, 1);
  assert.equal(section.querySelector(".ranking-order"), null);
});
