import {
  DEFAULT_YEAR,
  METRICS,
  isMetric,
  isReleaseYear,
  rankLanguages,
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

export function initializeRankings(document: Document): void {
  const page = document.body.dataset.page;
  const body = document.querySelector<HTMLTableSectionElement>("#ranking-body");
  const order = document.querySelector<HTMLSelectElement>("#ranking-order");
  const year = document.querySelector<HTMLSelectElement>("#release-year");
  const controls = document.querySelector<HTMLElement>(".table-controls");
  if (!body || !order || !controls || (page !== "overview" && !isMetric(page)))
    return;

  function languageCell(language: Language): HTMLTableCellElement {
    const cell = document.createElement("th");
    cell.scope = "row";
    const dot = document.createElement("span");
    dot.className = `language-dot ${dots[language]}`;
    dot.setAttribute("aria-hidden", "true");
    cell.append(dot, language);
    return cell;
  }

  const render = (): void => {
    const overview = page === "overview";
    const selectedMetric = overview ? order.value : page;
    const metric = isMetric(selectedMetric) ? selectedMetric : "githubRepos";
    const selectedYear = Number(year?.value ?? DEFAULT_YEAR);
    const releaseYear = isReleaseYear(selectedYear)
      ? selectedYear
      : DEFAULT_YEAR;
    const rows = rankLanguages(metric, releaseYear);
    const ranks = new Map(
      METRICS.map((key) => [
        key,
        new Map(rankLanguages(key).map((row) => [row.language, row.rank])),
      ]),
    );
    if (order.value === "language")
      rows.sort((a, b) => a.language.localeCompare(b.language));
    body.replaceChildren();
    for (const row of rows) {
      const tr = document.createElement("tr");
      if (overview) {
        tr.append(languageCell(row.language));
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
        count.textContent = row.value.toLocaleString("en-US");
        tr.append(rank, languageCell(row.language), count);
      }
      body.append(tr);
    }
    const caption = document.querySelector("caption");
    if (year && caption)
      caption.textContent = `Release rankings, ${releaseYear}`;
  };

  order.addEventListener("change", render);
  year?.addEventListener("change", render);
  render();
  controls.hidden = false;
}
