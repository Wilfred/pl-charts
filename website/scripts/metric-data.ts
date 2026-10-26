import { parse } from "csv-parse/sync";
import { LANGUAGES, type LanguageCounts } from "../src/languages.ts";
import { DEFINITIONS, type Metric, type Cadence } from "../src/metrics.ts";
export interface MetricSnapshot {
  periods: string[];
  periodOptions: string[];
  latestPeriod: string;
  counts: Record<string, LanguageCounts>;
  updatedAt: string;
  sourceUpdatedAt: string;
  coverage: Record<string, number>;
  partialPeriods: string[];
}
export function periodKey(date: Date, cadence: Cadence): string {
  const year = date.getUTCFullYear();
  return cadence === "year"
    ? String(year)
    : cadence === "quarter"
      ? `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
      : `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function emptyCounts(): LanguageCounts {
  return Object.fromEntries(LANGUAGES.map((language) => [language, null]));
}
export function readMetricHistory(
  source: string,
  metrics: readonly Metric[],
): Partial<Record<Metric, MetricSnapshot>> {
  const records: unknown = parse(source, {
    columns: true,
    skip_empty_lines: true,
  });
  if (!Array.isArray(records) || !records.length)
    throw new Error("Expected nonempty metric observations");
  const result: Partial<Record<Metric, MetricSnapshot>> = {};
  const totals: Record<string, { known: number; total: number }> = {};
  const seen = new Set<string>();
  const present: Record<string, Set<string>> = {};
  let run: string | undefined;
  for (const record of records) {
    if (!record || typeof record !== "object")
      throw new Error("Invalid observation");
    const row = record as Record<string, unknown>;
    if (
      row.schema_version !== "1" ||
      row.entity_kind !== "language" ||
      !metrics.includes(row.metric as Metric) ||
      typeof row.entity_id !== "string" ||
      !row.entity_id
    )
      throw new Error("Unexpected observation schema");
    const metric = row.metric as Metric;
    const cadence = DEFINITIONS[metric].cadence;
    const units: Record<string, string> = {
      github: "events",
      stackoverflow: "posts",
      surveys: "percent",
      releases: "releases",
      hiring: "comments",
    };
    if (
      row.category !== DEFINITIONS[metric].file ||
      row.unit !== units[DEFINITIONS[metric].file]
    )
      throw new Error("Unexpected observation category or unit");
    if (
      typeof row.run_id !== "string" ||
      !row.run_id ||
      (run && run !== row.run_id)
    )
      throw new Error("Mixed or missing collection runs");
    run = row.run_id;
    if (
      typeof row.value !== "string" ||
      !/^\d+(?:\.\d+)?$/.test(row.value) ||
      !Number.isFinite(Number(row.value)) ||
      Number(row.value) < 0 ||
      (metric === "survey.usage"
        ? Number(row.value) > 100
        : !Number.isSafeInteger(Number(row.value)))
    )
      throw new Error("Invalid metric count");
    if (
      typeof row.observed_at !== "string" ||
      !Number.isFinite(Date.parse(row.observed_at))
    )
      throw new Error("Invalid observation date");
    if (
      typeof row.period_start !== "string" ||
      typeof row.period_end !== "string"
    )
      throw new Error("Missing metric period");
    const start = new Date(row.period_start),
      end = new Date(row.period_end);
    if (
      !Number.isFinite(start.valueOf()) ||
      start.toISOString() !== row.period_start ||
      start.getUTCDate() !== 1 ||
      start.getUTCHours() ||
      start.getUTCMinutes() ||
      start.getUTCSeconds() ||
      start.getUTCMilliseconds() ||
      (cadence === "quarter" && start.getUTCMonth() % 3 !== 0) ||
      (cadence === "year" && start.getUTCMonth() !== 0)
    )
      throw new Error("Invalid period start");
    const months = cadence === "year" ? 12 : cadence === "quarter" ? 3 : 1;
    const expectedEnd = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1),
    );
    if (
      !Number.isFinite(end.valueOf()) ||
      end.toISOString() !== row.period_end ||
      end <= start ||
      end > expectedEnd
    )
      throw new Error("Invalid period end");
    const period = periodKey(start, cadence);
    const key = `${metric}:${period}:${row.entity_id}`;
    if (seen.has(key)) throw new Error("Duplicate metric observation");
    seen.add(key);
    const snapshot = (result[metric] ??= {
      periods: [],
      periodOptions: [],
      latestPeriod: "",
      counts: {},
      updatedAt: "",
      sourceUpdatedAt: "",
      coverage: {},
      partialPeriods: [],
    });
    snapshot.counts[period] ??= emptyCounts();
    if (LANGUAGES.includes(row.entity_id))
      snapshot.counts[period][row.entity_id] = Number(row.value);
    if (
      (end < expectedEnd ||
        (metric.startsWith("github.") && period === "2011-Q1")) &&
      !snapshot.partialPeriods.includes(period)
    )
      snapshot.partialPeriods.push(period);
    const dates = (present[metric] ??= new Set<string>());
    dates.add(row.period_start);
    if (row.observed_at > snapshot.updatedAt)
      snapshot.updatedAt = row.observed_at;
    if (
      typeof row.source_updated_at === "string" &&
      row.source_updated_at > snapshot.sourceUpdatedAt
    )
      snapshot.sourceUpdatedAt = row.source_updated_at;
    const total = (totals[`${metric}:${period}`] ??= { known: 0, total: 0 });
    total.total += Number(row.value);
    if (row.entity_id !== "Unknown") total.known += Number(row.value);
  }
  for (const metric of metrics) {
    const snapshot = result[metric];
    if (!snapshot) throw new Error(`Missing metric: ${metric}`);
    const cadence = DEFINITIONS[metric].cadence;
    const dates = [...present[metric]!].sort();
    const current = new Date(dates[0]!);
    const last = new Date(dates.at(-1)!);
    const months = cadence === "year" ? 12 : cadence === "quarter" ? 3 : 1;
    while (current <= last) {
      const period = periodKey(current, cadence);
      const actual = snapshot.counts[period] !== undefined;
      snapshot.counts[period] ??= emptyCounts();
      const total = totals[`${metric}:${period}`];
      snapshot.coverage[period] = total?.total ? total.known / total.total : 0;
      if (!snapshot.partialPeriods.includes(period)) {
        snapshot.periods.push(period);
        if (actual) snapshot.periodOptions.push(period);
      }
      current.setUTCMonth(current.getUTCMonth() + months);
    }
    const latest = snapshot.periodOptions.at(-1);
    if (!latest) throw new Error(`No complete periods: ${metric}`);
    snapshot.latestPeriod = latest;
    snapshot.updatedAt = snapshot.updatedAt.slice(0, 10);
  }
  return result;
}
