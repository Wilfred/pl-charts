import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { collectionOptions, runCollection } from "./runtime.ts";
import { DEFAULT_DATA_DIRECTORY } from "./storage.ts";
import {
  COVERAGE_QUERY,
  GITHUB_METHOD,
  githubQuery,
  githubObservations,
  parseGithubQuarterCounts,
} from "./github.ts";
import { replayLegacy } from "./legacy-replay.ts";
const options = collectionOptions(
  "Query quarterly public GitHub events with explicit repository-language coverage.",
  true,
);
let legacy = false;
if (options.replay) {
  const root = resolve(options.dataDirectory ?? DEFAULT_DATA_DIRECTORY);
  const manifest = JSON.parse(
    await readFile(
      join(root, "raw/github", options.replay, "manifest.json"),
      "utf8",
    ),
  ) as { schema_version?: number };
  if (manifest.schema_version !== 2) {
    await replayLegacy("github", root, options.replay);
    legacy = true;
  }
}
if (!legacy)
  await runCollection("github", GITHUB_METHOD, options, async (context) => {
    const coverage = (await context.query("coverage.json", COVERAGE_QUERY)) as {
      first_event: string;
      last_file: string;
    }[];
    const range = coverage[0];
    if (!range) throw new Error("Missing archive coverage");
    const cutoff = new Date(
      Date.parse(range.last_file.replace(" ", "T") + "Z") + 3600000,
    ).toISOString();
    context.metadata.cutoff = cutoff;
    context.metadata.first_event = new Date(
      range.first_event.replace(" ", "T") + "Z",
    ).toISOString();
    const from = context.options.from ?? 2011,
      to = context.options.to ?? Number(context.runId.slice(0, 4));
    const sql = githubQuery(cutoff).replace(
      "WHERE e.event_type IN",
      `WHERE toYear(e.created_at) BETWEEN ${from} AND ${to} AND e.event_type IN`,
    );
    const result = await context.query("quarters.json", sql);
    const records = parseGithubQuarterCounts(JSON.stringify({ data: result }));
    const periods = [...new Set(records.map((row) => row.quarter))].sort();
    const languages = [...new Set(records.map((row) => row.language))].sort();
    const keys = new Set(
      records.map((row) => `${row.quarter}:${row.language}`),
    );
    for (let i = 1; i < periods.length; i++) {
      const previous = periods[i - 1]!.split("-Q").map(Number),
        current = periods[i]!.split("-Q").map(Number);
      if (current[0]! * 4 + current[1]! !== previous[0]! * 4 + previous[1]! + 1)
        throw new Error("Gap in GitHub archive quarters");
    }
    for (const quarter of periods)
      for (const language of languages)
        if (!keys.has(`${quarter}:${language}`))
          records.push({ quarter, language, pushes: 0, pull_requests: 0 });
    records.sort(
      (a, b) =>
        a.quarter.localeCompare(b.quarter) ||
        a.language.localeCompare(b.language),
    );
    return githubObservations(records, {
      runId: context.runId,
      observedAt: context.sources.find(
        (source) => source.path === "quarters.json",
      )!.observed_at,
      cutoff,
      rawPath: `raw/github/${context.runId}/quarters.json`,
    });
  });
