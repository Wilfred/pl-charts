export function initializeTrends(root: Document): void {
  root.querySelectorAll<HTMLElement>("[data-trend]").forEach((figure) => {
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
        });
      });
  });
}
