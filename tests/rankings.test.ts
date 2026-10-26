import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM, type DOMWindow } from "jsdom";
import {
  DATA,
  LANGUAGES,
  METRICS,
  RELEASE_YEARS,
  rankLanguages,
  rankValues,
} from "../src/data.ts";
import { initializeRankings } from "../src/rankings.ts";

const pages = [
  "index",
  "github-repos",
  "packages",
  "stackoverflow",
  "releases",
  "hiring",
];

function loadPage(page: string) {
  const { window } = new JSDOM(
    readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8"),
  );
  const document = window.document;
  return { window, document };
}

function tableValues(document: Document): string[][] {
  return [...document.querySelectorAll("#ranking-body tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent?.trim() ?? ""),
  );
}

function select(
  document: Document,
  window: DOMWindow,
  id: string,
  value: string,
) {
  const control = document.querySelector<HTMLSelectElement>(id);
  assert.ok(control);
  control.value = value;
  control.dispatchEvent(new window.Event("change"));
}

test("ties share ranks and leave gaps, with stable alphabetical ordering", () => {
  const rows = rankValues({
    JavaScript: 10,
    Python: 10,
    Java: 5,
    Go: 5,
    Rust: 3,
    Ruby: 2,
  });
  assert.deepEqual(
    rows.map((row) => [row.language, row.rank]),
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

test("all metrics and release years contain a count for each language", () => {
  for (const metric of METRICS) {
    for (const year of RELEASE_YEARS) {
      const rows = rankLanguages(metric, year);
      assert.equal(rows.length, LANGUAGES.length);
      assert.deepEqual(
        new Set(rows.map((row) => row.language)),
        new Set(LANGUAGES),
      );
      assert.ok(
        rows.every(
          (row, index) =>
            Number.isFinite(row.value) &&
            (!index || row.value <= rows[index - 1]!.value),
        ),
      );
    }
  }
});

for (const page of pages) {
  test(`${page}: interactive values match the initial HTML and sorting preserves ranks`, () => {
    const { window, document } = loadPage(page);
    const initial = tableValues(document);
    assert.equal(initial.length, 6);
    initializeRankings(document);
    assert.deepEqual(tableValues(document), initial);
    assert.equal(
      document.querySelector<HTMLElement>(".table-controls")?.hidden,
      false,
    );
    select(document, window, "#ranking-order", "language");
    const sorted = tableValues(document);
    assert.deepEqual(
      [...sorted].sort((a, b) => a.join().localeCompare(b.join())),
      [...initial].sort((a, b) => a.join().localeCompare(b.join())),
    );
    assert.equal(sorted[0]?.[page === "index" ? 0 : 1], "Go");
    assert.equal(
      document.querySelector(
        "input[type=search], .breadcrumb, .eyebrow, .sample-notice, .prototype-tag",
      ),
      null,
    );
  });
}

test("overview ordering changes without changing each metric's ranks", () => {
  const { window, document } = loadPage("index");
  initializeRankings(document);
  select(document, window, "#ranking-order", "hiring");
  assert.deepEqual(tableValues(document)[0], [
    "Python",
    "#2",
    "#4",
    "#2",
    "#3",
    "#1",
  ]);
});

test("release year selection updates counts and the table caption", () => {
  const { window, document } = loadPage("releases");
  initializeRankings(document);
  for (const year of RELEASE_YEARS) {
    select(document, window, "#release-year", String(year));
    assert.deepEqual(
      tableValues(document),
      rankLanguages("releases", year).map((row) => [
        `#${row.rank}`,
        row.language,
        String(row.value),
      ]),
    );
    assert.equal(
      document.querySelector("caption")?.textContent,
      `Release rankings, ${year}`,
    );
  }
  assert.equal(DATA.releases.series.Rust[0], 12);
});

test("category labels are consistent across navigation and detail titles", () => {
  const labels = new Map([
    ["packages", "Packages"],
    ["stackoverflow", "SO Questions"],
    ["releases", "Releases"],
    ["hiring", "Job Descriptions"],
  ]);
  for (const page of pages) {
    const { document } = loadPage(page);
    for (const [target, label] of labels) {
      assert.equal(
        document
          .querySelector(`nav a[href="${target}.html"]`)
          ?.textContent?.trim(),
        label,
      );
    }
    if (labels.has(page))
      assert.equal(
        document.querySelector("h1")?.textContent?.trim(),
        labels.get(page),
      );
  }
});
