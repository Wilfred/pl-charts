import { historyPeriods, metricCounts, isMetric, pointLabel } from "./data.ts";
import { pointPosition } from "./plot.ts";
interface Point {
  element: SVGCircleElement;
  series: SVGGElement;
  language: string;
  index: number;
  x: number;
  y: number;
  label: string;
}
export function initializeTrends(root: Document): void {
  root.querySelectorAll<HTMLElement>("[data-trend]").forEach((figure) => {
    const plot = figure.querySelector<SVGSVGElement>(".trend-plot");
    const frame = figure.querySelector<HTMLElement>(".trend-frame");
    const tooltip = figure.querySelector<HTMLElement>("[data-trend-tooltip]");
    if (!plot || !frame || !tooltip) return;
    const metric = figure.dataset.trend;
    if (!isMetric(metric)) return;
    const sizeDots = (): void => {
      const bounds = plot.getBoundingClientRect();
      if (bounds.width && bounds.height) {
        plot.style.setProperty("--point-scale-x", String(1000 / bounds.width));
        plot.style.setProperty("--point-scale-y", String(300 / bounds.height));
      }
    };
    sizeDots();
    const Observer = root.defaultView?.ResizeObserver;
    if (Observer) new Observer(sizeDots).observe(plot);
    const periods = historyPeriods(metric);
    const maximum = Number(figure.dataset.maximum);
    const points: Point[] = [];
    for (const series of plot.querySelectorAll<SVGGElement>(
      "[data-trend-series]",
    )) {
      const language = series.dataset.trendSeries!;
      const element = series.querySelector<SVGCircleElement>(".trend-point")!;
      series.querySelector("title")?.remove();
      periods.forEach((period, index) => {
        const value = metricCounts(metric, period)[language] ?? null;
        if (value !== null)
          points.push({
            element,
            series,
            language,
            index: index,
            ...pointPosition(index, periods.length, value, maximum),
            label: pointLabel(metric, language, period, value),
          });
      });
    }
    let selected: Point | undefined;
    const visible = () =>
      points.filter((point) => point.series.style.display !== "none");
    function hide(): void {
      selected?.element.classList.remove("is-active");
      tooltip!.hidden = true;
    }
    function show(point: Point): void {
      selected?.element.classList.remove("is-active");
      selected = point;
      point.element.setAttribute("cx", String(point.x));
      point.element.setAttribute("cy", String(point.y));
      point.element.classList.add("is-active");
      tooltip!.textContent = point.label;
      tooltip!.hidden = false;
      const bounds = plot!.getBoundingClientRect();
      const container = frame!.getBoundingClientRect();
      const x = bounds.left - container.left + (point.x / 1000) * bounds.width;
      const y = bounds.top - container.top + (point.y / 300) * bounds.height;
      tooltip!.style.left = `${Math.max(0, Math.min(container.width - tooltip!.offsetWidth, x - tooltip!.offsetWidth / 2))}px`;
      tooltip!.style.top = `${y > tooltip!.offsetHeight + 12 ? y - tooltip!.offsetHeight - 12 : y + 12}px`;
    }
    function nearest(event: PointerEvent): void {
      const bounds = plot!.getBoundingClientRect();
      let candidate: Point | undefined;
      let distance = event.pointerType === "touch" ? 28 : 18;
      for (const point of visible()) {
        const dx =
          bounds.left + (point.x / 1000) * bounds.width - event.clientX;
        const dy = bounds.top + (point.y / 300) * bounds.height - event.clientY;
        const next = Math.hypot(dx, dy);
        if (next < distance) {
          candidate = point;
          distance = next;
        }
      }
      if (candidate) show(candidate);
      else hide();
    }
    plot.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "touch") nearest(event);
    });
    plot.addEventListener("pointerdown", nearest);
    plot.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch" && root.activeElement !== plot) hide();
    });
    plot.addEventListener("focus", () => {
      if (selected && !tooltip.hidden && visible().includes(selected)) return;
      const available = visible();
      const point = available.find(
        (point) =>
          point.language === available[0]?.language &&
          point.index === Math.max(...available.map((item) => item.index)),
      );
      if (point) show(point);
    });
    plot.addEventListener("blur", hide);
    plot.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hide();
        return;
      }
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const available = visible();
      if (!available.length) return;
      const current =
        selected && available.includes(selected) ? selected : available[0]!;
      const languages = [...new Set(available.map((point) => point.language))];
      let language = current.language;
      if (event.key === "ArrowUp" || event.key === "ArrowDown")
        language =
          languages[
            Math.max(
              0,
              Math.min(
                languages.length - 1,
                languages.indexOf(language) +
                  (event.key === "ArrowDown" ? 1 : -1),
              ),
            )
          ]!;
      const series = available.filter((point) => point.language === language);
      let index = series.findIndex((point) => point.index >= current.index);
      if (index < 0) index = series.length - 1;
      if (event.key === "ArrowLeft") index--;
      if (event.key === "ArrowRight") index++;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = series.length - 1;
      show(series[Math.max(0, Math.min(series.length - 1, index))]!);
    });
    root.addEventListener("pointerdown", (event) => {
      if (!figure.contains(event.target as Node)) hide();
    });
    figure
      .querySelectorAll<HTMLButtonElement>("[data-trend-language]")
      .forEach((button) => {
        button.disabled = !points.some(
          (point) => point.language === button.dataset.trendLanguage,
        );
        button.addEventListener("click", () => {
          const pressed = button.getAttribute("aria-pressed") !== "true";
          button.setAttribute("aria-pressed", String(pressed));
          figure
            .querySelectorAll<SVGGElement>("[data-trend-series]")
            .forEach((series) => {
              if (series.dataset.trendSeries === button.dataset.trendLanguage)
                series.style.display = pressed ? "" : "none";
            });
          if (selected?.language === button.dataset.trendLanguage) hide();
        });
      });
  });
}
