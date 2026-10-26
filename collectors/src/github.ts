import type { Observation } from "./storage.ts";

export const GITHUT_REVISION = "401c43b4c206088b7a8a46ce3840d369c6b6e850";
export const GITHUB_SOURCES = [
  {
    metric: "github.pushes",
    file: "src/data/gh-push-event.json",
    name: "pushes.json",
  },
  {
    metric: "github.pull_requests",
    file: "src/data/gh-pull-request.json",
    name: "pull-requests.json",
  },
] as const;
export type GithubMetric = (typeof GITHUB_SOURCES)[number]["metric"];
export interface QuarterCount {
  language: string;
  quarter: string;
  value: number;
}

export function quarterInterval(
  year: number,
  quarter: number,
): { start: string; end: string } {
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
export function parseGithubQuarterCounts(body: string): QuarterCount[] {
  const parsed: unknown = JSON.parse(body);
  if (!Array.isArray(parsed) || !parsed.length)
    throw new Error("Expected nonempty quarterly GitHub records");
  const seen = new Set<string>();
  return parsed
    .map((item: unknown) => {
      if (!item || typeof item !== "object")
        throw new Error("Invalid GitHub record");
      const row = item as Record<string, unknown>;
      if (
        typeof row.name !== "string" ||
        !row.name.trim() ||
        typeof row.count !== "string" ||
        !/^\d+$/.test(row.count)
      )
        throw new Error("Invalid language or count");
      if (
        typeof row.year !== "string" ||
        !/^\d{4}$/.test(row.year) ||
        typeof row.quarter !== "string" ||
        !/^\d$/.test(row.quarter)
      )
        throw new Error("Invalid GitHub quarter");
      const year = Number(row.year),
        quarter = Number(row.quarter);
      quarterInterval(year, quarter);
      const value = Number(row.count);
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("Invalid GitHub count");
      const period = `${year}-Q${quarter}`;
      const key = `${period}:${row.name}`;
      if (seen.has(key))
        throw new Error(`Duplicate GitHub observation: ${key}`);
      seen.add(key);
      return { language: row.name, quarter: period, value };
    })
    .sort(
      (a, b) =>
        a.quarter.localeCompare(b.quarter) ||
        a.language.localeCompare(b.language),
    );
}

export function githubObservations(
  records: readonly QuarterCount[],
  context: {
    metric: GithubMetric;
    runId: string;
    observedAt: string;
    sourceUrl: string;
    rawPath: string;
    revision: string;
  },
): Observation[] {
  return records.map((row) => {
    const [year, quarter] = row.quarter.split("-Q").map(Number);
    if (year === undefined || quarter === undefined)
      throw new Error("Invalid quarter");
    const interval = quarterInterval(year, quarter);
    return {
      schema_version: "1",
      run_id: context.runId,
      category: "github",
      metric: context.metric,
      entity_id: row.language,
      entity_kind: "language",
      ecosystem: "github-public",
      value: String(row.value),
      unit: "events",
      period_start: interval.start,
      period_end: interval.end,
      observed_at: context.observedAt,
      source_updated_at: "",
      source_url: context.sourceUrl,
      method_version: `githut-quarterly-${context.revision}`,
      raw_path: context.rawPath,
    };
  });
}
