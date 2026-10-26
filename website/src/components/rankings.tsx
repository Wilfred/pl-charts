import {
  CATEGORIES,
  DEFAULT_YEAR,
  METRICS,
  METRIC_INFO,
  RELEASE_YEARS,
  formatValue,
  metricCategory,
  rankLanguages,
  type Language,
  type Metric,
} from "../data.ts";
import { LANGUAGE_CLASSES } from "../languages.ts";

export function metricAnchor(metric: Metric): string {
  return metric.replaceAll(".", "-").replaceAll("_", "-");
}
function LanguageCell({ language }: { language: Language }) {
  return (
    <th scope="row">
      <span
        className={`language-dot ${LANGUAGE_CLASSES[language]}`}
        aria-hidden="true"
      />
      {language}
    </th>
  );
}
function UpdatedDate({ metric }: { metric: Metric }) {
  const date = METRIC_INFO[metric].updatedAt;
  return (
    <span className="updated-badge">
      Updated{" "}
      <time dateTime={date}>{date === "1970-01-01" ? "1970" : date}</time>
    </span>
  );
}
function TableControls({ metric }: { metric?: Metric }) {
  return (
    <div className="table-controls" hidden>
      <label>
        Order by
        <select
          className="ranking-order"
          defaultValue={metric ? "rank" : METRICS[0]}
        >
          {metric ? (
            <option value="rank">Rank</option>
          ) : (
            METRICS.map((id) => (
              <option key={id} value={id}>
                {metricCategory(id).label} · {METRIC_INFO[id].label}
              </option>
            ))
          )}
          <option value="language">Language A–Z</option>
        </select>
      </label>
      {metric === "releases.stable" && (
        <label>
          Year
          <select className="release-year" defaultValue={String(DEFAULT_YEAR)}>
            {RELEASE_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function MetricSection({ metric }: { metric: Metric }) {
  const info = METRIC_INFO[metric];
  const anchor = metricAnchor(metric);
  return (
    <section
      className="ranking-section metric-section"
      data-metric={metric}
      id={anchor}
      aria-labelledby={`heading-${anchor}`}
    >
      <div className="metric-heading">
        <h2 id={`heading-${anchor}`}>{info.label}</h2>
        <UpdatedDate metric={metric} />
        {metric === "packages.published" && (
          <a href="packages.csv" download className="data-download">
            CSV
          </a>
        )}
      </div>
      <p className="metric-description">{info.description}</p>
      <TableControls metric={metric} />
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`${info.label} rankings`}
      >
        <table className="detail-table">
          <caption className="sr-only">
            {metric === "releases.stable"
              ? `Stable release rankings, ${DEFAULT_YEAR}`
              : `${info.label} rankings`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="numeric">
                Rank
              </th>
              <th scope="col">Language</th>
              <th scope="col" className="numeric">
                {info.unit}
              </th>
            </tr>
          </thead>
          <tbody>
            {rankLanguages(metric).map((row) => (
              <tr key={row.language}>
                <td className="numeric rank-cell">#{row.rank}</td>
                <LanguageCell language={row.language} />
                <td className="numeric count-cell">
                  {formatValue(metric, row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Comparison() {
  const ranks = new Map(
    METRICS.map((metric) => [
      metric,
      new Map(rankLanguages(metric).map((row) => [row.language, row.rank])),
    ]),
  );
  return (
    <section
      className="ranking-section"
      data-overview=""
      aria-label="Metric comparison"
    >
      <p className="section-description">
        Ranks are calculated separately for each metric. Release ranks use{" "}
        {DEFAULT_YEAR} counts.
      </p>
      <TableControls />
      <div
        className="table-wrap"
        role="region"
        tabIndex={0}
        aria-label="Metric comparison"
      >
        <table>
          <caption className="sr-only">
            Language ranks by category and metric
          </caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Language
              </th>
              {CATEGORIES.map((category) => (
                <th
                  key={category.id}
                  scope="colgroup"
                  colSpan={category.metrics.length}
                  className="numeric"
                >
                  <a href={category.href}>{category.label}</a>
                </th>
              ))}
            </tr>
            <tr>
              {METRICS.map((metric) => (
                <th key={metric} scope="col" className="numeric">
                  <a
                    href={`${metricCategory(metric).href}#${metricAnchor(metric)}`}
                  >
                    {METRIC_INFO[metric].label}
                  </a>
                  <UpdatedDate metric={metric} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankLanguages(METRICS[0]).map((row) => (
              <tr key={row.language}>
                <LanguageCell language={row.language} />
                {METRICS.map((metric) => {
                  const rank = ranks.get(metric)?.get(row.language);
                  return (
                    <td key={metric} className="numeric">
                      <span
                        className={`rank-badge${rank === 1 ? " first" : ""}`}
                      >
                        #{rank}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">Ties share a rank and leave a gap: 1, 1, 3.</p>
    </section>
  );
}
