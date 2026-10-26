import snapshotsJson from "../.generated/metrics.json" with { type: "json" };
import packageSnapshot from "../.generated/packages.json" with { type: "json" };
import type { MetricSnapshot } from "../scripts/metric-data.ts";
import { LANGUAGES, type Language, type LanguageCounts } from "./languages.ts";
import { HOST_NAMES } from "./package-hosts.ts";
import { METRICS, DEFINITIONS, type Metric } from "./metrics.ts";
export { LANGUAGES, type Language } from "./languages.ts";
export { METRICS, LANGUAGE_METRICS, type Metric } from "./metrics.ts";
export { CATEGORIES, type Category } from "./categories.ts";
const snapshots: Partial<Record<Metric, MetricSnapshot>> = snapshotsJson;
export function metricSnapshot(metric: Metric): MetricSnapshot {
  const snapshot = snapshots[metric];
  if (!snapshot) throw new Error(`Missing metric history: ${metric}`);
  return snapshot;
}
export function historyPeriods(metric: Metric): string[] {
  return metric === "packages.published" ? [] : metricSnapshot(metric).periods;
}
export function periodOptions(metric: Metric): string[] {
  return metric === "packages.published"
    ? []
    : metricSnapshot(metric).periodOptions;
}
export function defaultPeriod(metric: Metric): string {
  return metric === "packages.published"
    ? ""
    : metricSnapshot(metric).latestPeriod;
}
export function metricCounts(
  metric: Metric,
  period = defaultPeriod(metric),
): LanguageCounts {
  if (metric === "packages.published") return packageSnapshot.counts;
  const counts = metricSnapshot(metric).counts[period];
  if (!counts) throw new Error(`Missing period ${period}: ${metric}`);
  return counts;
}
const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const exactFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});
export function formatPeriod(period: string): string {
  if (/^\d{4}-Q\d$/.test(period)) return period.replace("-Q", " Q");
  if (/^\d{4}-\d{2}$/.test(period))
    return monthFormatter.format(new Date(period + "-01T00:00:00Z"));
  return period;
}
export const METRIC_INFO = Object.fromEntries(
  METRICS.map((metric) => [
    metric,
    {
      ...DEFINITIONS[metric],
      updatedAt:
        metric === "packages.published"
          ? packageSnapshot.updatedAt
          : metricSnapshot(metric).updatedAt,
    },
  ]),
) as Record<Metric, (typeof DEFINITIONS)[Metric] & { updatedAt: string }>;
export interface Ranking {
  language: Language;
  value: number | null;
  rank: number | null;
}
export function metricEntities(metric: Metric): string[] {
  return metric === "packages.published" ? HOST_NAMES : LANGUAGES;
}
export function rankValues(
  values: Readonly<LanguageCounts>,
  entities: readonly string[] = LANGUAGES,
): Ranking[] {
  let previous: number | undefined;
  let rank = 0;
  const available = entities
    .flatMap((language) => {
      const value = values[language] ?? null;
      return value === null ? [] : [{ language, value }];
    })
    .sort((a, b) => b.value - a.value || a.language.localeCompare(b.language));
  return [
    ...available.map((row, index) => {
      if (row.value !== previous) rank = index + 1;
      previous = row.value;
      return { ...row, rank };
    }),
    ...entities
      .filter((language) => values[language] == null)
      .sort((a, b) => a.localeCompare(b))
      .map((language) => ({ language, value: null, rank: null })),
  ];
}
export function rankLanguages(
  metric: Metric,
  period = defaultPeriod(metric),
): Ranking[] {
  return rankValues(metricCounts(metric, period), metricEntities(metric));
}
export function isMetric(value: string | undefined): value is Metric {
  return METRICS.some((metric) => metric === value);
}
export function formatRank(rank: number | null | undefined): string {
  return rank == null ? "—" : `#${rank}`;
}
export function formatValue(metric: Metric, value: number | null): string {
  if (value === null) return "—";
  const formatted = (
    metric === "survey.usage" ? percentFormatter : countFormatter
  ).format(value);
  return metric === "survey.usage" ? formatted + "%" : formatted;
}
export function pointLabel(
  metric: Metric,
  language: Language,
  period: string,
  value: number,
): string {
  const exact = exactFormatter.format(value);
  return `${language} · ${formatPeriod(period)}: ${exact}${metric === "survey.usage" ? "%" : " " + METRIC_INFO[metric].unit.toLowerCase()}`;
}
