import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  GITHUT_REVISION,
  GITHUB_SOURCES,
  parseGithubQuarterCounts,
  githubObservations,
} from "./github.ts";
import { DEFAULT_DATA_DIRECTORY, csv, type Observation } from "./storage.ts";

const { values } = parseArgs({
  options: { ref: { type: "string" }, replay: { type: "string" } },
});
const revision = values.ref ?? GITHUT_REVISION;
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("--ref requires a complete Git commit SHA");
const replay = values.replay;
if (replay && !/^[0-9TZ-]+$/.test(replay))
  throw new Error("Invalid replay run identifier");

const runId =
  replay ?? new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const directory = join(DEFAULT_DATA_DIRECTORY, "raw/github", runId);
const manifestPath = join(directory, "manifest.json");
interface Source {
  path: string;
  url: string;
  sha256: string;
  bytes: number;
  observed_at: string;
  http_status: number;
  headers?: Record<string, string>;
}
interface Manifest {
  status: "running" | "complete" | "failed";
  error?: string;
  schema_version: number;
  run_id: string;
  upstream_revision: string;
  method: string;
  coverage: string[];
  sources: Source[];
}
let manifest: Manifest;
const observations: Observation[] = [];
if (replay) {
  manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  if (manifest.status !== "complete")
    throw new Error("Replay requires a complete collection");
  if (manifest.upstream_revision !== revision)
    throw new Error("Replay revision does not match --ref");
} else {
  await mkdir(join(DEFAULT_DATA_DIRECTORY, "raw/github"), { recursive: true });
  await mkdir(directory);
  manifest = {
    status: "running",
    schema_version: 1,
    run_id: runId,
    upstream_revision: revision,
    method: "githut-quarterly-v1",
    coverage: [],
    sources: [],
  };
}
try {
  for (const file of [
    ...GITHUB_SOURCES.map((source) => ({
      file: source.file,
      name: source.name,
    })),
    { file: "scripts/query.js", name: "upstream-query.js" },
    { file: "LICENSE", name: "upstream-LICENSE.txt" },
  ]) {
    const url = `https://raw.githubusercontent.com/madnight/githut/${revision}/${file.file}`;
    let body: Buffer;
    let observedAt: string;
    if (replay) {
      const metadata = manifest.sources.find(
        (source) => source.path === file.name,
      );
      if (!metadata) throw new Error(`Missing replay source ${file.name}`);
      body = await readFile(join(directory, file.name));
      observedAt = metadata.observed_at;
      if (createHash("sha256").update(body).digest("hex") !== metadata.sha256)
        throw new Error(`Checksum mismatch for ${file.name}`);
    } else {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "PL-Charts/0.1 (https://github.com/Wilfred/pl-charts)",
        },
        signal: AbortSignal.timeout(30000),
      });
      body = Buffer.from(await response.arrayBuffer());
      observedAt = new Date().toISOString();
      await writeFile(join(directory, file.name), body);
      manifest.sources.push({
        path: file.name,
        url,
        sha256: createHash("sha256").update(body).digest("hex"),
        bytes: body.length,
        observed_at: observedAt,
        http_status: response.status,
        headers: Object.fromEntries(
          ["date", "etag", "last-modified", "content-type"].flatMap((key) => {
            const value = response.headers.get(key);
            return value ? [[key, value]] : [];
          }),
        ),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const metric = GITHUB_SOURCES.find(
      (source) => source.name === file.name,
    )?.metric;
    if (metric)
      observations.push(
        ...githubObservations(parseGithubQuarterCounts(body.toString("utf8")), {
          metric,
          runId,
          observedAt,
          sourceUrl: url,
          rawPath: `raw/github/${runId}/${file.name}`,
          revision,
        }),
      );
  }
  const sets = GITHUB_SOURCES.map(
    (source) =>
      new Set(
        observations
          .filter((row) => row.metric === source.metric)
          .map((row) => row.period_start),
      ),
  );
  if (
    !sets[0] ||
    !sets[1] ||
    sets[0].size !== sets[1].size ||
    [...sets[0]].some((period) => !sets[1]?.has(period))
  )
    throw new Error("Push and pull-request quarter coverage differs");
  manifest.coverage = [...sets[0]].sort();
  const output = csv(observations);
  if (replay) {
    const saved = await readFile(
      join(DEFAULT_DATA_DIRECTORY, "observations/github", `${runId}.csv`),
      "utf8",
    );
    if (output !== saved)
      throw new Error("Replay differs from saved observations");
    console.log(
      `Replayed ${observations.length} observations across ${manifest.coverage.length} quarters`,
    );
  } else {
    manifest.status = "complete";
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await mkdir(join(DEFAULT_DATA_DIRECTORY, "observations/github"), {
      recursive: true,
    });
    await writeFile(
      join(DEFAULT_DATA_DIRECTORY, "observations/github", `${runId}.csv`),
      output,
      { flag: "wx" },
    );
    await mkdir(join(DEFAULT_DATA_DIRECTORY, "exports"), { recursive: true });
    const temporary = join(
      DEFAULT_DATA_DIRECTORY,
      "exports",
      `github-${runId}.tmp`,
    );
    await writeFile(temporary, output);
    await rename(temporary, join(DEFAULT_DATA_DIRECTORY, "exports/github.csv"));
    console.log(
      `Saved ${observations.length} observations across ${manifest.coverage.length} quarters (${runId})`,
    );
  }
} catch (error) {
  if (!replay) {
    manifest.status = "failed";
    manifest.error = error instanceof Error ? error.message : String(error);
  }
  throw error;
} finally {
  if (!replay)
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
