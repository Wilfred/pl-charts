import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  COVERAGE_QUERY,
  GITHUB_ENDPOINT,
  GITHUB_METHOD,
  githubQuery,
  parseGithubQuarterCounts,
  githubObservations,
} from "./github.ts";
import { DEFAULT_DATA_DIRECTORY, csv } from "./storage.ts";

const { values } = parseArgs({ options: { replay: { type: "string" } } });
const replay = values.replay;
if (replay && !/^[0-9TZ-]+$/.test(replay))
  throw new Error("Invalid run identifier");
const runId =
  replay ?? new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const directory = join(DEFAULT_DATA_DIRECTORY, "raw/github", runId);
interface Source {
  path: string;
  sha256: string;
  bytes: number;
  observed_at: string;
  query: string;
}
interface Manifest {
  status: string;
  method: string;
  run_id: string;
  cutoff: string;
  first_event: string;
  sources: Source[];
  error?: string;
}
const manifestPath = join(directory, "manifest.json");
const manifest: Manifest = replay
  ? (JSON.parse(await readFile(manifestPath, "utf8")) as Manifest)
  : {
      status: "running",
      method: GITHUB_METHOD,
      run_id: runId,
      cutoff: "",
      first_event: "",
      sources: [],
    };
if (
  replay &&
  (manifest.status !== "complete" || manifest.method !== GITHUB_METHOD)
)
  throw new Error("Replay requires a complete direct-query run");
if (!replay) {
  await mkdir(join(DEFAULT_DATA_DIRECTORY, "raw/github"), { recursive: true });
  await mkdir(directory);
}
async function query(name: string, sql: string): Promise<string> {
  const metadata = manifest.sources.find((source) => source.path === name);
  if (replay) {
    const body = await readFile(join(directory, name), "utf8");
    if (
      !metadata ||
      metadata.query !== sql ||
      createHash("sha256").update(body).digest("hex") !== metadata.sha256
    )
      throw new Error(`Replay checksum or query mismatch: ${name}`);
    return body;
  }
  const url = new URL(GITHUB_ENDPOINT);
  url.searchParams.set("user", "play");
  url.searchParams.set("query", sql);
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const body = await response.text();
  await writeFile(join(directory, name), body);
  await writeFile(join(directory, name.replace(".json", ".sql")), sql + "\n");
  manifest.sources.push({
    path: name,
    sha256: createHash("sha256").update(body).digest("hex"),
    bytes: Buffer.byteLength(body),
    observed_at: new Date().toISOString(),
    query: sql,
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
  return body;
}
try {
  const coverage = JSON.parse(await query("coverage.json", COVERAGE_QUERY)) as {
    data: { first_event: string; last_event: string; last_file: string }[];
  };
  const range = coverage.data[0];
  if (!range) throw new Error("Missing source coverage");
  if (!replay) {
    manifest.cutoff = new Date(
      Date.parse(range.last_file.replace(" ", "T") + "Z") + 3600000,
    ).toISOString();
    manifest.first_event = new Date(
      range.first_event.replace(" ", "T") + "Z",
    ).toISOString();
    if (Date.parse(manifest.cutoff) > Date.now())
      throw new Error("Source hour is incomplete");
  }
  const body = await query("quarters.json", githubQuery(manifest.cutoff));
  const records = parseGithubQuarterCounts(body);
  const periods = [...new Set(records.map((row) => row.quarter))].sort();
  for (let i = 1; i < periods.length; i++) {
    const previous = periods[i - 1]!.split("-Q").map(Number),
      current = periods[i]!.split("-Q").map(Number);
    if (current[0]! * 4 + current[1]! !== previous[0]! * 4 + previous[1]! + 1)
      throw new Error("Gap in quarterly coverage");
  }
  // Absent language groups in a covered quarter represent zero events.
  const languages = [...new Set(records.map((row) => row.language))].sort();
  const keys = new Set(records.map((row) => `${row.quarter}:${row.language}`));
  for (const quarter of periods)
    for (const language of languages)
      if (!keys.has(`${quarter}:${language}`))
        records.push({ quarter, language, pushes: 0, pull_requests: 0 });
  records.sort(
    (a, b) =>
      a.quarter.localeCompare(b.quarter) ||
      a.language.localeCompare(b.language),
  );
  const observedAt = manifest.sources.find(
    (source) => source.path === "quarters.json",
  )!.observed_at;
  const output = csv(
    githubObservations(records, {
      runId,
      observedAt,
      cutoff: manifest.cutoff,
      rawPath: `raw/github/${runId}/quarters.json`,
    }),
  );
  const observations = join(
    DEFAULT_DATA_DIRECTORY,
    "observations/github",
    `${runId}.csv`,
  );
  if (replay) {
    if (output !== (await readFile(observations, "utf8")))
      throw new Error("Replay differs from saved observations");
    console.log(`Verified ${periods.length} quarters offline (${runId})`);
  } else {
    await mkdir(join(DEFAULT_DATA_DIRECTORY, "observations/github"), {
      recursive: true,
    });
    await writeFile(observations, output, { flag: "wx" });
    await mkdir(join(DEFAULT_DATA_DIRECTORY, "exports"), { recursive: true });
    const temporary = join(
      DEFAULT_DATA_DIRECTORY,
      "exports",
      `github-${runId}.tmp`,
    );
    await writeFile(temporary, output);
    await rename(temporary, join(DEFAULT_DATA_DIRECTORY, "exports/github.csv"));
    manifest.status = "complete";
    console.log(
      `Saved ${records.length * 2} observations, ${periods.length} quarters through ${manifest.cutoff} (${runId})`,
    );
  }
} catch (error) {
  if (!replay) {
    manifest.status = "failed";
    manifest.error = String(error);
  }
  throw error;
} finally {
  if (!replay)
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
