import { parseArgs } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULT_DATA_DIRECTORY } from "./storage.ts";
import { GITHUB_ENDPOINT } from "./github.ts";

const { values } = parseArgs({ options: { cutoff: { type: "string" } } });
const cutoff = values.cutoff;
if (
  !cutoff ||
  !Number.isFinite(Date.parse(cutoff)) ||
  new Date(cutoff).toISOString() !== cutoff
)
  throw new Error(
    "Supply --cutoff as an ISO UTC timestamp matching the collection run",
  );
const runId = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
const directory = join(DEFAULT_DATA_DIRECTORY, "raw/github-attribution", runId);
await mkdir(directory, { recursive: true });
const template = await readFile(
  new URL("../sql/github-attribution/breakdown.sql", import.meta.url),
  "utf8",
);
const queries: Record<string, string> = {
  metadata: await readFile(
    new URL("../sql/github-attribution/metadata.sql", import.meta.url),
    "utf8",
  ),
  schema: "DESCRIBE TABLE github_events FORMAT JSON",
  missing: await readFile(
    new URL(
      "../sql/github-attribution/missing-repositories.sql",
      import.meta.url,
    ),
    "utf8",
  ),
  exact: template
    .replaceAll("{{REPO_KEY}}", "full_name")
    .replaceAll("{{EVENT_KEY}}", "e.repo_name"),
  casefold: template
    .replaceAll("{{REPO_KEY}}", "lower(full_name)")
    .replaceAll("{{EVENT_KEY}}", "lower(e.repo_name)"),
};
const sources: {
  file: string;
  sha256: string;
  observed_at: string;
  http_status: number;
}[] = [];
let status = "running";
try {
  for (const [name, templateSql] of Object.entries(queries)) {
    const sql = templateSql.replaceAll(
      "{{CUTOFF}}",
      cutoff.slice(0, 19).replace("T", " "),
    );
    await writeFile(join(directory, `${name}.sql`), sql);
    const url = new URL(GITHUB_ENDPOINT);
    url.searchParams.set("user", "play");
    url.searchParams.set("query", sql);
    const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
    const body = await response.text();
    await writeFile(join(directory, `${name}.json`), body);
    sources.push({
      file: `${name}.json`,
      sha256: createHash("sha256").update(body).digest("hex"),
      observed_at: new Date().toISOString(),
      http_status: response.status,
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
    const parsed = JSON.parse(body) as { exception?: string; data: unknown[] };
    if (parsed.exception || !Array.isArray(parsed.data))
      throw new Error("Incomplete query response");
    console.log(`${name}: ${parsed.data.length} rows`);
  }
  status = "complete";
} finally {
  await writeFile(
    join(directory, "manifest.json"),
    JSON.stringify(
      { run_id: runId, cutoff, endpoint: GITHUB_ENDPOINT, status, sources },
      null,
      2,
    ) + "\n",
  );
}
console.log(`Saved diagnostics in ${directory}`);
