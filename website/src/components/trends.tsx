import {
  GITHUB_QUARTERS,
  GITHUB_CUTOFF,
  GITHUB_COVERAGE,
  LANGUAGES,
  githubCounts,
  isPartialGithubQuarter,
  formatQuarter,
  METRIC_INFO,
} from "../data.ts";
import type { GithubMetric } from "../../scripts/github-data.ts";
import { LANGUAGE_CLASSES } from "../languages.ts";

const DASHES = [undefined, "8 3", "2 3", "12 3 2 3", "6 2 2 2", "1 3"];
export function trendPaths(
  values: readonly (number | null)[],
  maximum: number,
  partial: readonly boolean[],
) {
  const x = (i: number) => 10 + (i / Math.max(values.length - 1, 1)) * 980;
  const y = (value: number) => 290 - (value / maximum) * 280;
  const complete: string[] = [],
    incomplete: string[] = [];
  values.forEach((value, i) => {
    const previous = values[i - 1];
    if (value === null || previous === null || previous === undefined) return;
    const target = partial[i] || partial[i - 1] ? incomplete : complete;
    target.push(
      `M${x(i - 1).toFixed(2)},${y(previous).toFixed(2)}L${x(i).toFixed(2)},${y(value).toFixed(2)}`,
    );
  });
  return { complete: complete.join(" "), partial: incomplete.join(" ") };
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
  const partial = GITHUB_QUARTERS.map(isPartialGithubQuarter);
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
        {series.map(({ language }, index) => (
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
              <path
                d="M0 5H22"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={DASHES[index]}
              />
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
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>
            {`${label} by language, ${formatQuarter(GITHUB_QUARTERS[0]!)} to ${formatQuarter(GITHUB_QUARTERS.at(-1)!)}`}
          </title>
          <desc id={`${id}-description`}>
            Quarterly counts for six languages. Dashed end segments indicate
            partial quarters. Exact values are available in the quarter selector
            and CSV. Language attribution covers{" "}
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
          {series.map(({ language, values }, index) => {
            const paths = trendPaths(values, maximum, partial);
            return (
              <g
                key={language}
                data-trend-series={language}
                className={`series-${LANGUAGE_CLASSES[language]}`}
              >
                <path
                  d={paths.complete}
                  className="trend-line"
                  strokeDasharray={DASHES[index]}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={paths.partial}
                  className="trend-line trend-partial"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
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
        Quarterly counts · dashed ends: partial quarters · source through{" "}
        <time dateTime={GITHUB_CUTOFF}>
          {GITHUB_CUTOFF.slice(0, 16).replace("T", " ")} UTC
        </time>
        .
      </p>
      <p className="trend-note">
        Language attribution: {percent(Math.min(...coverage))}–
        {percent(Math.max(...coverage))} of events across quarters;{" "}
        {percent(coverage.at(-1)!)} in the latest quarter.
      </p>
    </figure>
  );
}
