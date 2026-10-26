import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { trendPath } from "../src/plot.ts";
import { initializeTrends } from "../src/trends.ts";
import {
  CATEGORIES,
  historyPeriods,
  metricCounts,
  pointLabel,
  type Metric,
} from "../src/data.ts";
test("trend paths preserve zero and break at missing observations", () => {
  assert.equal(
    trendPath([0, 10, null, 20, 30, 40], 40),
    "M10.00,290.00 L206.00,220.00  M598.00,150.00 L794.00,80.00 L990.00,10.00",
  );
  assert.equal(trendPath([null, null], 1).trim(), "");
});
for (const category of CATEGORIES.filter(
  (category) => category.id !== "packages",
))
  test(`${category.label}: history plots have exact keyboard tooltips and independent language controls`, () => {
    const { window } = new JSDOM(
      readFileSync(new URL(`../${category.href}`, import.meta.url), "utf8"),
    );
    const document = window.document;
    const figures = document.querySelectorAll<HTMLElement>("[data-trend]");
    assert.equal(figures.length, category.metrics.length);
    for (const figure of figures) {
      assert.equal(figure.querySelectorAll("[data-trend-series]").length, 20);
      assert.equal(figure.querySelectorAll("[stroke-dasharray]").length, 0);
      assert.equal(
        figure.querySelectorAll(".trend-legend button:disabled").length,
        20,
      );
      for (const path of figure.querySelectorAll(".trend-line"))
        assert.doesNotMatch(path.getAttribute("d") ?? "", /NaN|Infinity/);
    }
    initializeTrends(document);
    for (const figure of figures) {
      const metric = figure.dataset.trend as Metric,
        periods = historyPeriods(metric);
      const plot = figure.querySelector<SVGSVGElement>(".trend-plot")!,
        tooltip = figure.querySelector<HTMLElement>("[data-trend-tooltip]")!;
      plot.dispatchEvent(new window.FocusEvent("focus"));
      assert.equal(tooltip.hidden, false);
      const selected = figure
        .querySelector(".trend-point.is-active")!
        .closest<SVGGElement>("[data-trend-series]")!.dataset.trendSeries!;
      const available = periods.filter(
        (period) => metricCounts(metric, period)[selected] != null,
      );
      assert.equal(
        tooltip.textContent,
        pointLabel(
          metric,
          selected,
          available.at(-1)!,
          metricCounts(metric, available.at(-1)!)[selected]!,
        ),
      );
      plot.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Home" }));
      assert.equal(
        tooltip.textContent,
        pointLabel(
          metric,
          selected,
          available[0]!,
          metricCounts(metric, available[0]!)[selected]!,
        ),
      );
      plot.dispatchEvent(new window.KeyboardEvent("keydown", { key: "End" }));
      plot.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape" }),
      );
      assert.equal(tooltip.hidden, true);
      const sibling = [...figures].find((other) => other !== figure);
      const before = sibling?.querySelector(
        "[data-trend-tooltip]",
      )?.textContent;
      const button = figure.querySelector<HTMLButtonElement>(
        `button[data-trend-language="${selected}"]`,
      )!;
      button.click();
      assert.equal(button.getAttribute("aria-pressed"), "false");
      assert.equal(
        figure.querySelector<SVGGElement>(`[data-trend-series="${selected}"]`)!
          .style.display,
        "none",
      );
      if (sibling)
        assert.equal(
          sibling.querySelector("[data-trend-tooltip]")?.textContent,
          before,
        );
      button.click();
      assert.equal(button.getAttribute("aria-pressed"), "true");
    }
  });
test("survey point tooltips retain the full published precision", () => {
  assert.equal(
    pointLabel("survey.usage", "Python", "2019", 41.7188),
    "Python · 2019: 41.7188%",
  );
});
