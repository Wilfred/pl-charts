import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { trendPaths } from "../src/components/trends.tsx";
import { initializeTrends } from "../src/trends.ts";
import {
  GITHUB_CUTOFF,
  GITHUB_QUARTERS,
  isPartialGithubQuarter,
  formatQuarter,
} from "../src/data.ts";

test("trend paths preserve zero, break across missing values, and separate partial intervals", () => {
  const paths = trendPaths([0, 10, null, 20, 30, 40], 40, [
    true,
    false,
    false,
    false,
    false,
    true,
  ]);
  assert.equal(paths.complete, "M598.00,150.00L794.00,80.00");
  assert.equal(
    paths.partial,
    "M10.00,290.00L206.00,220.00 M794.00,80.00L990.00,10.00",
  );
  assert.deepEqual(trendPaths([null, null], 1, [false, false]), {
    complete: "",
    partial: "",
  });
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
      /partial quarters/,
    );
    assert.ok(plot.querySelector(`time[datetime='${GITHUB_CUTOFF}']`));
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
  assert.match(formatQuarter(GITHUB_QUARTERS.at(-1)!), /partial/);
});
