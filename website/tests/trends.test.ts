import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { trendPath } from "../src/components/trends.tsx";
import { initializeTrends } from "../src/trends.ts";
import {
  GITHUB_QUARTERS,
  isPartialGithubQuarter,
  formatQuarter,
} from "../src/data.ts";

test("trend paths preserve zero and break across missing values", () => {
  assert.equal(
    trendPath([0, 10, null, 20, 30, 40], 40),
    "M10.00,290.00 L206.00,220.00  M598.00,150.00 L794.00,80.00 L990.00,10.00",
  );
  assert.equal(trendPath([null, null], 1).trim(), "");
});
test("both plots render statically and language toggles stay within their own plot", () => {
  const { window } = new JSDOM(
    readFileSync(new URL("../github.html", import.meta.url), "utf8"),
  );
  const document = window.document;
  const plots = document.querySelectorAll<HTMLElement>("[data-trend]");
  assert.equal(plots.length, 2);
  for (const plot of plots) {
    assert.equal(plot.querySelectorAll("[data-trend-series]").length, 6);
    assert.equal(plot.querySelectorAll("button:disabled").length, 6);
    assert.match(
      plot.querySelector("svg[role='img'] desc")?.textContent ?? "",
      /Quarterly counts for six languages/,
    );
    assert.equal(plot.querySelectorAll("[stroke-dasharray]").length, 0);
    assert.doesNotMatch(
      plot.querySelector("svg[role=img] title")?.textContent ?? "",
      /partial/,
    );
    for (const path of plot.querySelectorAll(".trend-line"))
      assert.doesNotMatch(path.getAttribute("d") ?? "", /NaN|Infinity/);
  }
  initializeTrends(document);
  const button = plots[0]!.querySelector<HTMLButtonElement>(
    'button[data-trend-language="Python"]',
  )!;
  const first = plots[0]!.querySelector<SVGGElement>(
    '[data-trend-series="Python"]',
  )!;
  const second = plots[1]!.querySelector<SVGGElement>(
    '[data-trend-series="Python"]',
  )!;
  button.click();
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(first.style.display, "none");
  assert.equal(second.style.display, "");
  button.click();
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(first.style.display, "");
});
test("partial quarter labels distinguish incomplete archive coverage", () => {
  assert.equal(isPartialGithubQuarter("2011-Q1"), true);
  assert.equal(formatQuarter("2011-Q1"), "2011 Q1 (partial)");
  assert.equal(isPartialGithubQuarter("2025-Q1"), false);
  assert.equal(
    GITHUB_QUARTERS.every((quarter) => !isPartialGithubQuarter(quarter)),
    true,
  );
  assert.equal(GITHUB_QUARTERS[0], "2011-Q2");
  assert.equal(GITHUB_QUARTERS.at(-1), "2026-Q3");
});
