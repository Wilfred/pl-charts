import { entityDetails } from "../entities.ts";
import { TrendPlot } from "./trends.tsx";
import {
  CATEGORIES,
  defaultPeriod,
  periodOptions,
  formatPeriod,
  formatMetricPeriod,
  formatRank,
  LANGUAGE_METRICS,
  METRIC_INFO,
  formatValue,
  rankLanguages,
  type Language,
  type Metric,
} from "../data.ts";
import { LANGUAGE_CLASSES, LANGUAGE_COLORS } from "../languages.ts";

export function metricAnchor(metric: Metric): string {
  return metric.replaceAll(".", "-").replaceAll("_", "-");
}
function LanguageCell({
  language,
  metric,
}: {
  language: Language;
  metric?: Metric;
}) {
  const details = metric ? entityDetails(metric, language) : undefined;
  if (details)
    return (
      <th scope="row" className="described-entity">
        <a href={details.url}>{language}</a>
        <span className="entity-languages">{details.languages}</span>
      </th>
    );
  return (
    <th scope="row">
      <span
        className={`language-dot ${LANGUAGE_CLASSES[language]}`}
        aria-hidden="true"
        style={{ background: LANGUAGE_COLORS[language] }}
      />
      {language}
    </th>
  );
}
function UpdatedDate({ metric }: { metric: Metric }) {
  const date = METRIC_INFO[metric].updatedAt;
  return (
    <span className="updated-badge">
      Updated <time dateTime={date}>{date}</time>
    </span>
  );
}
function SortHeader({
  sortKey,
  label,
  numeric = false,
  initial,
  rowSpan,
}: {
  sortKey: string;
  label: string;
  numeric?: boolean;
  initial?: "ascending" | "descending";
  rowSpan?: number;
}) {
  return (
    <th
      scope="col"
      className={numeric ? "numeric" : undefined}
      aria-sort={initial}
      rowSpan={rowSpan}
    >
      <button
        type="button"
        className="sort-button"
        data-sort={sortKey}
        aria-label={`Sort by ${label}`}
        disabled
      >
        {label}
        <svg
          className="sort-indicator"
          width="8"
          height="14"
          viewBox="0 0 8 14"
          aria-hidden="true"
          focusable="false"
        >
          <path className="sort-up" d="M4 1 8 6H0Z" fill="currentColor" />
          <path className="sort-down" d="m4 13 4-5H0Z" fill="currentColor" />
        </svg>
      </button>
    </th>
  );
}

function PeriodFilter({ metric }: { metric: Metric }) {
  const options = periodOptions(metric);
  if (!options.length) return null;
  const cadence = METRIC_INFO[metric].cadence;
  return (
    <div className="table-controls" hidden>
      <label>
        {cadence === "year"
          ? "Year"
          : cadence === "month"
            ? "Month"
            : "Quarter"}
        <select className="metric-period" defaultValue={defaultPeriod(metric)}>
          {[...options].reverse().map((period) => (
            <option key={period} value={period}>
              {formatMetricPeriod(metric, period)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function MetricSection({
  metric,
  showNote = true,
}: {
  metric: Metric;
  showNote?: boolean;
}) {
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
        <a href={`${info.file}.csv`} download className="data-download">
          CSV
        </a>
      </div>
      <p className="metric-description">{info.description}</p>
      {showNote && info.note && (
        <p className="metric-description source-note">{info.note}</p>
      )}
      <PeriodFilter metric={metric} />
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label={`${info.label} rankings`}
      >
        <table className="detail-table">
          <caption className="sr-only">
            {`${info.label} rankings${defaultPeriod(metric) ? ", " + formatMetricPeriod(metric, defaultPeriod(metric)) : ""}`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="numeric">
                Rank
              </th>
              <SortHeader
                sortKey="language"
                label={
                  metric === "packages.published"
                    ? "Service"
                    : metric === "releases.stable"
                      ? "Implementation"
                      : "Language"
                }
              />
              <SortHeader
                sortKey="value"
                label={info.unit}
                numeric
                initial="descending"
              />
            </tr>
          </thead>
          <tbody>
            {rankLanguages(metric).map((row) => (
              <tr key={row.language}>
                <td className="numeric rank-cell">{formatRank(row.rank)}</td>
                <LanguageCell language={row.language} metric={metric} />
                <td className="numeric count-cell">
                  {formatValue(metric, row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {periodOptions(metric).length > 1 && <TrendPlot metric={metric} />}
    </section>
  );
}

export function Comparison() {
  const ranks = new Map(
    LANGUAGE_METRICS.map((metric) => [
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
        GitHub: {formatPeriod(defaultPeriod("github.pushes"))}. Stack Overflow:{" "}
        {formatPeriod(defaultPeriod("stackoverflow.questions"))}. Survey:{" "}
        {formatPeriod(defaultPeriod("survey.usage"))}. Job descriptions:{" "}
        {formatPeriod(defaultPeriod("hacker_news.job_descriptions"))}.
      </p>
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
              <SortHeader sortKey="language" label="Language" rowSpan={2} />
              {CATEGORIES.filter((category) =>
                category.metrics.some((metric) =>
                  LANGUAGE_METRICS.includes(
                    metric as (typeof LANGUAGE_METRICS)[number],
                  ),
                ),
              ).map((category) => (
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
              {LANGUAGE_METRICS.map((metric) => (
                <SortHeader
                  key={metric}
                  sortKey={metric}
                  label={METRIC_INFO[metric].label}
                  numeric
                  initial={
                    metric === LANGUAGE_METRICS[0] ? "descending" : undefined
                  }
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rankLanguages(LANGUAGE_METRICS[0]!).map((row) => (
              <tr key={row.language}>
                <LanguageCell language={row.language} />
                {LANGUAGE_METRICS.map((metric) => {
                  const rank = ranks.get(metric)?.get(row.language);
                  return (
                    <td key={metric} className="numeric">
                      <span
                        className={`rank-badge${rank === 1 ? " first" : ""}`}
                      >
                        {formatRank(rank)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
