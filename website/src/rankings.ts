import {
  DEFAULT_YEAR,
  METRICS,
  isMetric,
  isReleaseYear,
  rankLanguages,
  formatValue,
  type Language,
} from "./data.ts";
import { LANGUAGE_CLASSES } from "./languages.ts";

type Direction = "ascending" | "descending";
function languageCell(
  document: Document,
  language: Language,
): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = "row";
  const dot = document.createElement("span");
  dot.className = `language-dot ${LANGUAGE_CLASSES[language]}`;
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
    const buttons = [
      ...section.querySelectorAll<HTMLButtonElement>("button[data-sort]"),
    ];
    const year = section.querySelector<HTMLSelectElement>(".release-year");
    if (!body || !buttons.length) continue;
    let sortKey: string = overview ? METRICS[0] : "rank";
    let direction: Direction = overview ? "descending" : "ascending";
    const render = (): void => {
      const selected = overview ? sortKey : metricId;
      const metric = isMetric(selected) ? selected : "github.pushes";
      const chosenYear = Number(year?.value ?? DEFAULT_YEAR);
      const releaseYear = isReleaseYear(chosenYear) ? chosenYear : DEFAULT_YEAR;
      const rows = rankLanguages(metric, releaseYear);
      const sign = direction === "ascending" ? 1 : -1;
      rows.sort((a, b) => {
        if (sortKey === "language")
          return sign * a.language.localeCompare(b.language);
        const difference =
          sortKey === "rank" ? a.rank - b.rank : a.value - b.value;
        return sign * difference || a.language.localeCompare(b.language);
      });
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
      for (const button of buttons) {
        const header = button.closest("th");
        if (button.dataset.sort === sortKey)
          header?.setAttribute("aria-sort", direction);
        else header?.removeAttribute("aria-sort");
      }
      const caption = section.querySelector("caption");
      if (year && caption)
        caption.textContent = `Stable release rankings, ${releaseYear}`;
    };
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener("click", () => {
        const selected = button.dataset.sort;
        if (!selected) return;
        if (selected === sortKey)
          direction = direction === "ascending" ? "descending" : "ascending";
        else {
          sortKey = selected;
          direction =
            selected === "language" || selected === "rank"
              ? "ascending"
              : "descending";
        }
        render();
      });
    }
    year?.addEventListener("change", render);
    render();
    const controls = section.querySelector<HTMLElement>(".table-controls");
    if (controls) controls.hidden = false;
  }
}
