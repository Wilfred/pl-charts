import { SERVICE_URLS, SERVICE_LANGUAGES } from "./package-services.ts";
import {
  defaultPeriod,
  periodOptions,
  formatPeriod,
  formatRank,
  METRIC_INFO,
  LANGUAGE_METRICS,
  isMetric,
  rankLanguages,
  formatValue,
  type Language,
} from "./data.ts";
import { LANGUAGE_CLASSES, LANGUAGE_COLORS } from "./languages.ts";

type Direction = "ascending" | "descending";
function languageCell(
  document: Document,
  language: Language,
  service = false,
): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = "row";
  if (service) {
    const link = document.createElement("a");
    link.href = SERVICE_URLS[language]!;
    link.textContent = language;
    cell.className = "package-service";
    const languages = document.createElement("span");
    languages.className = "service-languages";
    languages.textContent = SERVICE_LANGUAGES[language]!;
    cell.append(link, languages);
    return cell;
  }
  const dot = document.createElement("span");
  dot.className = `language-dot ${LANGUAGE_CLASSES[language]}`;
  dot.setAttribute("aria-hidden", "true");
  dot.style.backgroundColor = LANGUAGE_COLORS[language] ?? "";
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
    const period = section.querySelector<HTMLSelectElement>(".metric-period");
    if (!body || !buttons.length) continue;
    let sortKey: string = overview ? LANGUAGE_METRICS[0]! : "rank";
    let direction: Direction = overview ? "descending" : "ascending";
    const render = (): void => {
      const selected = overview ? sortKey : metricId;
      const metric = isMetric(selected) ? selected : "github.pushes";
      const selectedPeriod =
        period && periodOptions(metric).includes(period.value)
          ? period.value
          : defaultPeriod(metric);
      const rows = rankLanguages(metric, selectedPeriod);
      const sign = direction === "ascending" ? 1 : -1;
      rows.sort((a, b) => {
        if (sortKey === "language")
          return sign * a.language.localeCompare(b.language);
        if (a.value === null || b.value === null)
          return a.value === null && b.value === null
            ? a.language.localeCompare(b.language)
            : a.value === null
              ? 1
              : -1;
        const difference =
          sortKey === "rank"
            ? (a.rank ?? 0) - (b.rank ?? 0)
            : a.value - b.value;
        return sign * difference || a.language.localeCompare(b.language);
      });
      const ranks = new Map(
        LANGUAGE_METRICS.map((key) => [
          key,
          new Map(rankLanguages(key).map((row) => [row.language, row.rank])),
        ]),
      );
      body.replaceChildren();
      for (const row of rows) {
        const tr = document.createElement("tr");
        if (overview) {
          tr.append(languageCell(document, row.language));
          for (const key of LANGUAGE_METRICS) {
            const td = document.createElement("td");
            td.className = "numeric";
            const badge = document.createElement("span");
            const rank = ranks.get(key)?.get(row.language);
            badge.className = `rank-badge${rank === 1 ? " first" : ""}`;
            badge.textContent = formatRank(rank);
            td.append(badge);
            tr.append(td);
          }
        } else {
          const rank = document.createElement("td");
          rank.className = "numeric rank-cell";
          rank.textContent = formatRank(row.rank);
          const count = document.createElement("td");
          count.className = "numeric count-cell";
          count.textContent = formatValue(metric, row.value);
          tr.append(
            rank,
            languageCell(
              document,
              row.language,
              metric === "packages.published",
            ),
            count,
          );
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
      if (period && caption)
        caption.textContent = `${METRIC_INFO[metric].label} rankings, ${formatPeriod(selectedPeriod)}`;
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
    period?.addEventListener("change", render);
    render();
    const controls = section.querySelector<HTMLElement>(".table-controls");
    if (controls) controls.hidden = false;
  }
}
