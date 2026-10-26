import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { csv, type Observation } from "./storage.ts";
import { ORIGINAL_PACKAGE_SOURCES } from "./packages.ts";
import { githubObservations, parseGithubQuarterCounts } from "./github.ts";
export async function replayLegacy(
  category: "packages" | "github",
  root: string,
  runId: string,
): Promise<{ runId: string; observations: Observation[] }> {
  const directory = join(root, "raw", category, runId);
  const manifest = JSON.parse(
    await readFile(join(directory, "manifest.json"), "utf8"),
  ) as {
    status?: string;
    method?: string;
    cutoff: string;
    sources: {
      id?: string;
      path?: string;
      raw_path?: string;
      sha256: string;
      observed_at: string;
      source_url?: string;
      query?: string;
      status?: string;
    }[];
  };
  if (manifest.status && manifest.status !== "complete")
    throw new Error("Legacy replay requires a complete run");
  const bodies = new Map<string, string>();
  for (const source of manifest.sources) {
    if (source.status && source.status !== "ok")
      throw new Error("Legacy run has a failed source");
    const path = source.raw_path
      ? join(root, source.raw_path)
      : join(directory, source.path!);
    const body = await readFile(path, "utf8");
    if (createHash("sha256").update(body).digest("hex") !== source.sha256)
      throw new Error("Legacy source checksum mismatch");
    bodies.set(source.id ?? source.path!, body);
    if (
      source.query &&
      (await readFile(
        join(directory, source.path!.replace(".json", ".sql")),
        "utf8",
      )) !==
        source.query + "\n"
    )
      throw new Error("Legacy SQL differs");
  }
  let observations: Observation[];
  if (category === "packages") {
    observations = ORIGINAL_PACKAGE_SOURCES.filter((source) =>
      manifest.sources.some((row) => row.id === source.id),
    ).map((source) => {
      const metadata = manifest.sources.find((row) => row.id === source.id)!;
      const parsed = source.parse(bodies.get(source.id)!);
      return {
        schema_version: "1",
        run_id: runId,
        category,
        metric: "packages.published",
        entity_id: source.id,
        entity_kind: "registry",
        ecosystem: source.ecosystem,
        value: String(parsed.value),
        unit: "packages",
        period_start: "",
        period_end: "",
        observed_at: metadata.observed_at,
        source_updated_at: parsed.sourceUpdatedAt,
        source_url: source.url,
        method_version: source.method,
        raw_path: metadata.raw_path!,
      };
    });
  } else {
    if (manifest.method !== "gharchive-clickhouse-primary-language-v1")
      throw new Error(
        "This archived GitHub method is retired; see data/README.md",
      );
    const records = parseGithubQuarterCounts(bodies.get("quarters.json")!);
    const periods = [...new Set(records.map((row) => row.quarter))].sort();
    const languages = [...new Set(records.map((row) => row.language))].sort();
    const keys = new Set(
      records.map((row) => `${row.quarter}:${row.language}`),
    );
    for (const quarter of periods)
      for (const language of languages)
        if (!keys.has(`${quarter}:${language}`))
          records.push({ quarter, language, pushes: 0, pull_requests: 0 });
    records.sort(
      (a, b) =>
        a.quarter.localeCompare(b.quarter) ||
        a.language.localeCompare(b.language),
    );
    observations = githubObservations(records, {
      runId,
      observedAt: manifest.sources.find((row) => row.path === "quarters.json")!
        .observed_at,
      cutoff: manifest.cutoff,
      rawPath: `raw/github/${runId}/quarters.json`,
    });
    console.log(`Verified ${periods.length} quarters offline (${runId})`);
  }
  if (
    csv(observations) !==
    (await readFile(
      join(root, "observations", category, `${runId}.csv`),
      "utf8",
    ))
  )
    throw new Error("Legacy observations differ");
  return { runId, observations };
}
