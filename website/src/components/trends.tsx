import {
  historyPeriods,
  metricCounts,
  metricSnapshot,
  formatMetricPeriod,
  METRIC_INFO,
  rankLanguages,
  type Metric,
} from "../data.ts";
import { seriesStyle } from "../entities.ts";
import { trendPath, plotMaximum, pointPosition } from "../plot.ts";
export function TrendPlot({ metric }: { metric: Metric }) {
  const periods = historyPeriods(metric),
    info = METRIC_INFO[metric];
  const id = metric.replaceAll(".", "-") + "-trend";
  const series = rankLanguages(metric).map(({ language }) => ({
    language,
    style: seriesStyle(metric, language),
    values: periods.map(
      (period) => metricCounts(metric, period)[language] ?? null,
    ),
  }));
  const visible = new Set(
    rankLanguages(metric)
      .filter((row) => row.value !== null)
      .slice(0, 5)
      .map((row) => row.language),
  );
  const maximum = plotMaximum(series.flatMap((row) => row.values));
  const ticks = [
    ...new Set([
      0,
      Math.round((periods.length - 1) / 3),
      Math.round(((periods.length - 1) * 2) / 3),
      periods.length - 1,
    ]),
  ];
  const coverageBreak = metric.startsWith("github.")
    ? periods.indexOf("2025-Q1")
    : -1;
  const coverage = periods.map(
    (period) => metricSnapshot(metric).coverage[period] ?? 0,
  );
  const percent = (value: number) => (value * 100).toFixed(1) + "%";
  return (
    <figure
      className="trend"
      data-trend={metric}
      data-maximum={maximum}
      aria-labelledby={id}
    >
      <figcaption id={id}>{info.label} over time</figcaption>
      <div className="trend-legend" aria-label={`${info.label} chart series`}>
        {series.map(({ language, values, style }) => (
          <button
            key={language}
            type="button"
            data-trend-language={language}
            aria-pressed={visible.has(language)}
            disabled
            title={
              values.every((value) => value === null)
                ? "No observations"
                : undefined
            }
          >
            <svg
              width="22"
              height="10"
              viewBox="0 0 22 10"
              aria-hidden="true"
              style={{ color: style.color }}
            >
              <path d="M0 5H22" stroke="currentColor" strokeWidth="2" />
              <circle cx="11" cy="5" r="2.5" fill="currentColor" />
            </svg>
            {language}
          </button>
        ))}
      </div>
      <div className="trend-frame">
        <div className="trend-y-axis" aria-hidden="true">
          {[4, 3, 2, 1, 0].map((n) => (
            <span key={n} style={{ top: `${(10 + ((4 - n) / 4) * 280) / 3}%` }}>
              {new Intl.NumberFormat("en", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format((maximum * n) / 4)}
              {metric.startsWith("survey.") ? "%" : ""}
            </span>
          ))}
        </div>
        <svg
          className="trend-plot"
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          role="img"
          tabIndex={0}
          aria-describedby={`${id}-tooltip`}
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title
            id={`${id}-title`}
          >{`${info.label} by ${metric === "releases.stable" ? "implementation" : "language"}, ${formatMetricPeriod(metric, periods[0]!)} to ${formatMetricPeriod(metric, periods.at(-1)!)}`}</title>
          <desc id={`${id}-description`}>
            Hover or tap a dot for its exact value. Focus the chart and use
            arrow keys to move between periods and series. Series buttons select
            the visible series. Missing observations break the line. Exact
            values are available in the period selector and CSV.
          </desc>
          {coverageBreak >= 0 && (
            <rect
              className="trend-coverage-break"
              x={pointPosition(coverageBreak, periods.length, 0, maximum).x}
              y="10"
              width={
                990 - pointPosition(coverageBreak, periods.length, 0, maximum).x
              }
              height="280"
            />
          )}
          {[0, 1, 2, 3, 4].map((n) => (
            <line
              key={n}
              x1="10"
              x2="990"
              y1={10 + n * 70}
              y2={10 + n * 70}
              className="trend-grid"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map(({ language, values, style }) => (
            <g
              key={language}
              data-trend-series={language}
              className={`series-${style.id}`}
              style={{
                color: style.color,
                display: visible.has(language) ? undefined : "none",
              }}
            >
              <title>{language}</title>
              <path
                d={trendPath(values, maximum)}
                className="trend-line"
                vectorEffect="non-scaling-stroke"
              />
              {values.map((value, index) => {
                if (value === null) return null;
                const { x, y } = pointPosition(
                  index,
                  periods.length,
                  value,
                  maximum,
                );
                return (
                  <circle
                    key={periods[index]}
                    cx={x}
                    cy={y}
                    r="3"
                    className="trend-dot"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              <circle
                r="5"
                className="trend-point"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        <div
          className="trend-tooltip"
          id={`${id}-tooltip`}
          data-trend-tooltip=""
          role="tooltip"
          aria-live="polite"
          aria-atomic="true"
          hidden
        />
        <div className="trend-x-axis" aria-hidden="true">
          {ticks.map((index, position) => (
            <span
              key={index}
              style={{
                left: `${1 + (index / Math.max(periods.length - 1, 1)) * 98}%`,
                transform:
                  position === 0
                    ? "none"
                    : position === ticks.length - 1
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {formatMetricPeriod(metric, periods[index]!)}
            </span>
          ))}
        </div>
      </div>
      {metric.startsWith("github.") && (
        <p className="trend-note">
          Language attribution: {percent(Math.min(...coverage))}–
          {percent(Math.max(...coverage))} of events across quarters;{" "}
          {percent(coverage.at(-1)!)} in the latest quarter.
        </p>
      )}
    </figure>
  );
}
