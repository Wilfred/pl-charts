const page = document.body.dataset.page;
const body = document.getElementById("ranking-body");
const search = document.getElementById("language-search");
const order = document.getElementById("ranking-order");
const year = document.getElementById("release-year");
const metrics = [
  "githubRepos",
  "modules",
  "stackoverflow",
  "releases",
  "hiring",
];
const dots = {
  JavaScript: "js",
  Python: "py",
  Java: "java",
  Go: "go",
  Rust: "rust",
  Ruby: "ruby",
};

function languageCell(language) {
  const cell = document.createElement("th");
  cell.scope = "row";
  const dot = document.createElement("span");
  dot.className = `language-dot ${dots[language]}`;
  dot.setAttribute("aria-hidden", "true");
  cell.append(dot, language);
  return cell;
}

function renderRankings() {
  const overview = page === "overview";
  const metric = overview
    ? order.value === "language"
      ? "githubRepos"
      : order.value
    : page;
  let rows = rankLanguages(metric, year ? year.value : 2025);
  const ranks = Object.fromEntries(
    metrics.map((key) => [
      key,
      Object.fromEntries(
        rankLanguages(key).map((row) => [row.language, row.rank]),
      ),
    ]),
  );
  if (order.value === "language")
    rows.sort((a, b) => a.language.localeCompare(b.language));
  rows = rows.filter((row) =>
    row.language.toLowerCase().includes(search.value.trim().toLowerCase()),
  );
  body.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (overview) {
      tr.append(languageCell(row.language));
      for (const key of metrics) {
        const td = document.createElement("td");
        td.className = "numeric";
        const badge = document.createElement("span");
        const rank = ranks[key][row.language];
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
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = overview ? 6 : 3;
    cell.className = "empty-state";
    cell.textContent =
      "No matching languages. Try another name or clear your search.";
    row.append(cell);
    body.append(row);
  }
  document.getElementById("result-count").textContent =
    `${rows.length} ${rows.length === 1 ? "language" : "languages"} shown`;
  if (year)
    document.getElementById("year-heading").textContent = `/ ${year.value}`;
}

if (body && search && order) {
  document.querySelector(".table-controls").hidden = false;
  search.addEventListener("input", renderRankings);
  order.addEventListener("change", renderRankings);
  if (year) year.addEventListener("change", renderRankings);
  renderRankings();
}
