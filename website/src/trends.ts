interface Point {
  element: SVGCircleElement;
  series: SVGGElement;
  language: string;
  quarter: number;
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
    const points: Point[] = [
      ...plot.querySelectorAll<SVGCircleElement>("[data-trend-point]"),
    ].map((element) => ({
      element,
      series: element.closest<SVGGElement>("[data-trend-series]")!,
      language: element.dataset.language!,
      quarter: Number(element.dataset.quarterIndex),
      x: Number(element.getAttribute("cx")),
      y: Number(element.getAttribute("cy")),
      label: element.dataset.label!,
    }));
    // The custom tooltip replaces native SVG titles when JavaScript is available.
    points.forEach((point) => point.element.querySelector("title")?.remove());
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
          point.quarter === Math.max(...available.map((item) => item.quarter)),
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
      let index = series.findIndex((point) => point.quarter >= current.quarter);
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
        button.disabled = false;
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
