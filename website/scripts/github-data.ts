import { parse } from "csv-parse/sync";
import { LANGUAGES, type Language } from "../src/languages.ts";

export const GITHUB_METRICS = [
  "github.pushes",
  "github.pull_requests",
] as const;
export type GithubMetric = (typeof GITHUB_METRICS)[number];
export type GithubCounts = Record<Language, number | null>;
export interface GithubSnapshot {
  quarters: string[];
  latestQuarter: string;
  updatedAt: string;
  counts: Record<GithubMetric, Record<string, GithubCounts>>;
}
export function readGithubSnapshot(source: string): GithubSnapshot {
  const records: unknown = parse(source, {
    columns: true,
    skip_empty_lines: true,
  });
  if (!Array.isArray(records) || !records.length)
    throw new Error("Expected quarterly GitHub observations");
  const counts: GithubSnapshot["counts"] = {
    "github.pushes": {},
    "github.pull_requests": {},
  };
  const seen = new Set<string>();
  let latest = "";
  let runId: string | undefined;
  for (const record of records) {
    if (!record || typeof record !== "object")
      throw new Error("Invalid GitHub observation");
    const row = record as Record<string, unknown>;
    if (
      row.schema_version !== "1" ||
      row.category !== "github" ||
      row.entity_kind !== "language" ||
      row.unit !== "events" ||
      (row.metric !== "github.pushes" && row.metric !== "github.pull_requests")
    )
      throw new Error("Unexpected GitHub observation schema");
    if (
      typeof row.period_start !== "string" ||
      typeof row.period_end !== "string"
    )
      throw new Error("Missing GitHub period");
    const start = new Date(row.period_start);
    if (
      !Number.isFinite(start.valueOf()) ||
      start.toISOString() !== row.period_start ||
      start.getUTCDate() !== 1 ||
      start.getUTCMonth() % 3 !== 0 ||
      start.getUTCHours() !== 0 ||
      start.getUTCMinutes() !== 0 ||
      start.getUTCSeconds() !== 0 ||
      start.getUTCMilliseconds() !== 0
    )
      throw new Error("Invalid quarter start");
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1),
    );
    if (end.toISOString() !== row.period_end)
      throw new Error("Invalid quarter end");
    if (
      typeof row.entity_id !== "string" ||
      !row.entity_id ||
      typeof row.value !== "string" ||
      !/^\d+$/.test(row.value) ||
      !Number.isSafeInteger(Number(row.value))
    )
      throw new Error("Invalid GitHub language count");
    if (
      typeof row.observed_at !== "string" ||
      !Number.isFinite(Date.parse(row.observed_at))
    )
      throw new Error("Invalid GitHub observation date");
    if (
      typeof row.run_id !== "string" ||
      !row.run_id ||
      (runId && runId !== row.run_id)
    )
      throw new Error("Mixed GitHub collection runs");
    runId = row.run_id;
    const period = `${start.getUTCFullYear()}-Q${start.getUTCMonth() / 3 + 1}`;
    const key = `${row.metric}:${period}:${row.entity_id}`;
    if (seen.has(key)) throw new Error("Duplicate GitHub observation");
    seen.add(key);
    const byQuarter = counts[row.metric];
    if (!byQuarter[period])
      byQuarter[period] = Object.fromEntries(
        LANGUAGES.map((language) => [language, null]),
      ) as GithubCounts;
    if (LANGUAGES.some((language) => language === row.entity_id))
      byQuarter[period][row.entity_id as Language] = Number(row.value);
    const observed = new Date(row.observed_at).toISOString();
    if (observed > latest) latest = observed;
  }
  const quarters = Object.keys(counts["github.pushes"]).sort();
  if (
    JSON.stringify(quarters) !==
    JSON.stringify(Object.keys(counts["github.pull_requests"]).sort())
  )
    throw new Error("GitHub metric coverage differs");
  const latestQuarter = quarters.at(-1);
  if (!latestQuarter) throw new Error("Missing GitHub quarters");
  return { quarters, latestQuarter, updatedAt: latest.slice(0, 10), counts };
}
