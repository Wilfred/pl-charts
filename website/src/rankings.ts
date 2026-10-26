import {
  DEFAULT_YEAR,
  METRICS,
  isMetric,
  isReleaseYear,
  rankLanguages,
  formatValue,
  type Language,
} from "./data.ts";

const dots: Record<Language, string> = {
  JavaScript: "js",
  Python: "py",
  Java: "java",
  Go: "go",
  Rust: "rust",
  Ruby: "ruby",
};

function languageCell(
  document: Document,
  language: Language,
): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = "row";
  const dot = document.createElement("span");
  dot.className = `language-dot ${dots[language]}`;
  dot.setAttribute("aria-hidden", "true");
  cell.append(dot, language);
  return cell;
}

export function initializeRankings(document: Document): void {
  for (const section of document.querySelectorAll<HTMLElement>(
    "[data-metric], [data-overview]",
  )) {
    const metricId = section.dataset.metric;
    const overview = section.hasAttribute("data-overview");
    if (!overview && !isMetric(metricId)) continue;
    const body = section.querySelector<HTMLTableSectionElement>("tbody");
    const order = section.querySelector<HTMLSelectElement>(".ranking-order");
    const year = section.querySelector<HTMLSelectElement>(".release-year");
    const controls = section.querySelector<HTMLElement>(".table-controls");
    if (!body || !order || !controls) continue;
    const render = (): void => {
      const selected = overview ? order.value : metricId;
      const metric = isMetric(selected) ? selected : "github.pushes";
      const chosenYear = Number(year?.value ?? DEFAULT_YEAR);
      const releaseYear = isReleaseYear(chosenYear) ? chosenYear : DEFAULT_YEAR;
      const rows = rankLanguages(metric, releaseYear);
      if (order.value === "language")
        rows.sort((a, b) => a.language.localeCompare(b.language));
      const ranks = new Map(
        METRICS.map((key) => [
          key,
          new Map(rankLanguages(key).map((row) => [row.language, row.rank])),
        ]),
      );
      body.replaceChildren();
      for (const row of rows) {
        const tr = document.createElement("tr");
        if (overview) {
          tr.append(languageCell(document, row.language));
          for (const key of METRICS) {
            const td = document.createElement("td");
            td.className = "numeric";
            const badge = document.createElement("span");
            const rank = ranks.get(key)?.get(row.language);
            badge.className = `rank-badge${rank === 1 ? " first" : ""}`;
            badge.textContent = `#${rank}`;
            td.append(badge);
            tr.append(td);
          }
        } else {
          const rank = document.createElement("td");
          rank.className = "numeric rank-cell";
          rank.textContent = `#${row.rank}`;
          const count = document.createElement("td");
          count.className = "numeric count-cell";
          count.textContent = formatValue(metric, row.value);
          tr.append(rank, languageCell(document, row.language), count);
        }
        body.append(tr);
      }
      const caption = section.querySelector("caption");
      if (year && caption)
        caption.textContent = `Stable release rankings, ${releaseYear}`;
    };
    order.addEventListener("change", render);
    year?.addEventListener("change", render);
    render();
    controls.hidden = false;
  }
}
