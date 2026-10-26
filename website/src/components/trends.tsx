import {
  GITHUB_QUARTERS,
  GITHUB_COVERAGE,
  LANGUAGES,
  githubCounts,
  formatQuarter,
  METRIC_INFO,
} from "../data.ts";
import type { GithubMetric } from "../../scripts/github-data.ts";
import { LANGUAGE_CLASSES } from "../languages.ts";

function pointPosition(
  index: number,
  count: number,
  value: number,
  maximum: number,
) {
  return {
    x: 10 + (index / Math.max(count - 1, 1)) * 980,
    y: 290 - (value / maximum) * 280,
  };
}
export function trendPath(values: readonly (number | null)[], maximum: number) {
  let connected = false;
  return values
    .map((value, i) => {
      if (value === null) {
        connected = false;
        return "";
      }
      const { x, y } = pointPosition(i, values.length, value, maximum);
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
export function TrendPlot({ metric }: { metric: GithubMetric }) {
  const label = METRIC_INFO[metric].label;
  const id = metric.replaceAll(".", "-") + "-trend";
  const series = LANGUAGES.map((language) => ({
    language,
    values: GITHUB_QUARTERS.map(
      (quarter) => githubCounts(metric, quarter)[language],
    ),
  }));
  const largest = Math.max(
    1,
    ...series.flatMap((row) => row.values.map((value) => value ?? 0)),
  );
  const step = 10 ** Math.floor(Math.log10(largest / 4));
  const maximum = Math.ceil(largest / (4 * step)) * 4 * step;
  const ticks = [
    0,
    Math.round((GITHUB_QUARTERS.length - 1) / 3),
    Math.round(((GITHUB_QUARTERS.length - 1) * 2) / 3),
    GITHUB_QUARTERS.length - 1,
  ];
  const coverage = GITHUB_QUARTERS.map(
    (quarter) => GITHUB_COVERAGE[metric][quarter] ?? 0,
  );
  const percent = (value: number) => (value * 100).toFixed(1) + "%";
  return (
    <figure className="trend" data-trend={metric} aria-labelledby={id}>
      <figcaption id={id}>{label} over time</figcaption>
      <div className="trend-legend" aria-label={`${label} chart languages`}>
        {series.map(({ language }) => (
          <button
            key={language}
            type="button"
            data-trend-language={language}
            aria-pressed="true"
            disabled
          >
            <svg
              width="22"
              height="10"
              viewBox="0 0 22 10"
              aria-hidden="true"
              className={`series-${LANGUAGE_CLASSES[language]}`}
            >
              <path d="M0 5H22" stroke="currentColor" strokeWidth="2" />
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
          <title id={`${id}-title`}>
            {`${label} by language, ${formatQuarter(GITHUB_QUARTERS[0]!)} to ${formatQuarter(GITHUB_QUARTERS.at(-1)!)}`}
          </title>
          <desc id={`${id}-description`}>
            Quarterly counts for six languages. Hover or tap a point for its
            exact value. Focus the chart and use arrow keys to move between
            quarters and languages. Exact values are also available in the
            quarter selector and CSV. Language attribution covers{" "}
            {percent(Math.min(...coverage))} to {percent(Math.max(...coverage))}{" "}
            of archived events across this series.
          </desc>
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
          {series.map(({ language, values }) => {
            return (
              <g
                key={language}
                data-trend-series={language}
                className={`series-${LANGUAGE_CLASSES[language]}`}
              >
                <path
                  d={trendPath(values, maximum)}
                  className="trend-line"
                  vectorEffect="non-scaling-stroke"
                />
                {values.map((value, index) => {
                  if (value === null) return null;
                  const position = pointPosition(
                    index,
                    values.length,
                    value,
                    maximum,
                  );
                  const quarter = GITHUB_QUARTERS[index]!;
                  const pointLabel = `${language} · ${formatQuarter(quarter)}: ${value.toLocaleString("en-US")} ${METRIC_INFO[metric].unit.toLowerCase()}`;
                  return (
                    <circle
                      key={quarter}
                      cx={position.x}
                      cy={position.y}
                      r="4"
                      className="trend-point"
                      vectorEffect="non-scaling-stroke"
                      data-trend-point=""
                      data-language={language}
                      data-quarter-index={index}
                      data-quarter={quarter}
                      data-value={value}
                      data-label={pointLabel}
                    >
                      <title>{pointLabel}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
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
                left: `${1 + (index / Math.max(GITHUB_QUARTERS.length - 1, 1)) * 98}%`,
                transform:
                  position === 0
                    ? "none"
                    : position === 3
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {GITHUB_QUARTERS[index]!.replace("-", " ")}
            </span>
          ))}
        </div>
      </div>
      <p className="trend-note">
        Quarterly counts through {formatQuarter(GITHUB_QUARTERS.at(-1)!)}.
      </p>
      <p className="trend-note">
        Language attribution: {percent(Math.min(...coverage))}–
        {percent(Math.max(...coverage))} of events across quarters;{" "}
        {percent(coverage.at(-1)!)} in the latest quarter.
      </p>
    </figure>
  );
}
