import type { Observation } from "./storage.ts";

export const GITHUB_ENDPOINT = "https://play.clickhouse.com/";
export const GITHUB_METHOD = "gharchive-clickhouse-primary-language-v1";
export const GITHUB_METRICS = [
  "github.pushes",
  "github.pull_requests",
] as const;
export type GithubMetric = (typeof GITHUB_METRICS)[number];
export const COVERAGE_QUERY = `SELECT min(created_at) AS first_event, max(created_at) AS last_event,
  max(file_time) AS last_file FROM github_events FORMAT JSON`;
export function quarterInterval(year: number, quarter: number) {
  if (
    !Number.isInteger(year) ||
    year < 2011 ||
    year > 2100 ||
    !Number.isInteger(quarter) ||
    quarter < 1 ||
    quarter > 4
  )
    throw new Error("Invalid quarter");
  return {
    start: new Date(Date.UTC(year, (quarter - 1) * 3, 1)).toISOString(),
    end: new Date(Date.UTC(year, quarter * 3, 1)).toISOString(),
  };
}
export function githubQuery(cutoff: string): string {
  if (
    !Number.isFinite(Date.parse(cutoff)) ||
    new Date(cutoff).toISOString() !== cutoff
  )
    throw new Error("Invalid cutoff");
  const date = cutoff.slice(0, 19).replace("T", " ");
  return `-- UTC half-open intervals; repository language is the latest known at the cutoff.
SELECT toYear(e.created_at) AS year, toQuarter(e.created_at) AS quarter,
  if(r.language = '', 'Unknown', r.language) AS name,
  countIf(e.event_type = 'PushEvent') AS pushes,
  countIf(e.event_type = 'PullRequestEvent' AND e.action = 'opened') AS pull_requests
FROM github_events e
LEFT JOIN (
  SELECT full_name, argMax(language, tuple(snapshot_at, language)) AS language
  FROM (
    SELECT full_name, language, updated_at AS snapshot_at FROM repos
    UNION ALL
    SELECT full_name, language, time AS snapshot_at FROM github_repos_history
  ) WHERE snapshot_at < '${date}' GROUP BY full_name
) r ON e.repo_name = r.full_name
WHERE e.event_type IN ('PushEvent', 'PullRequestEvent')
  AND e.created_at < '${date}' AND e.file_time < '${date}'
GROUP BY year, quarter, name ORDER BY year, quarter, name
SETTINGS max_execution_time = 60, max_memory_usage = 20000000000
FORMAT JSON`;
}
export interface QuarterCount {
  language: string;
  quarter: string;
  pushes: number;
  pull_requests: number;
}
export function parseGithubQuarterCounts(body: string): QuarterCount[] {
  const parsed = JSON.parse(body) as { data?: unknown; exception?: string };
  if (parsed.exception || !Array.isArray(parsed.data) || !parsed.data.length)
    throw new Error("Expected nonempty quarterly GitHub records");
  const seen = new Set<string>();
  return parsed.data.map((item: unknown) => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid GitHub record");
    const row = item as Record<string, unknown>;
    if (
      typeof row.name !== "string" ||
      !row.name.trim() ||
      typeof row.year !== "number" ||
      typeof row.quarter !== "number"
    )
      throw new Error("Invalid language or quarter");
    quarterInterval(row.year, row.quarter);
    for (const field of ["pushes", "pull_requests"])
      if (
        !/^\d+$/.test(String(row[field])) ||
        !Number.isSafeInteger(Number(row[field]))
      )
        throw new Error("Invalid GitHub count");
    const quarter = `${row.year}-Q${row.quarter}`;
    const key = `${quarter}:${row.name}`;
    if (seen.has(key)) throw new Error(`Duplicate GitHub observation: ${key}`);
    seen.add(key);
    return {
      language: row.name,
      quarter,
      pushes: Number(row.pushes),
      pull_requests: Number(row.pull_requests),
    };
  });
}
export function githubObservations(
  records: readonly QuarterCount[],
  context: {
    runId: string;
    observedAt: string;
    rawPath: string;
    cutoff: string;
  },
): Observation[] {
  const cutoff = new Date(context.cutoff);
  if (!Number.isFinite(cutoff.valueOf())) throw new Error("Invalid cutoff");
  return records.flatMap((row) => {
    const [year, quarter] = row.quarter.split("-Q").map(Number);
    if (year === undefined || quarter === undefined)
      throw new Error("Invalid quarter");
    const interval = quarterInterval(year, quarter);
    if (interval.start >= context.cutoff)
      throw new Error("Quarter beyond cutoff");
    return GITHUB_METRICS.map((metric) => ({
      schema_version: "1",
      run_id: context.runId,
      category: "github",
      metric,
      entity_id: row.language,
      entity_kind: "language",
      ecosystem: "github-public",
      value: String(
        row[metric === "github.pushes" ? "pushes" : "pull_requests"],
      ),
      unit: "events",
      period_start: interval.start,
      period_end: interval.end < context.cutoff ? interval.end : context.cutoff,
      observed_at: context.observedAt,
      source_updated_at: context.cutoff,
      source_url: GITHUB_ENDPOINT,
      method_version: GITHUB_METHOD,
      raw_path: context.rawPath,
    }));
  });
}
