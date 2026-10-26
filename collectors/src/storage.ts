import { createHash } from "node:crypto";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGE_SOURCES } from "./packages.ts";

export const DEFAULT_DATA_DIRECTORY = fileURLToPath(
  new URL("../../data/", import.meta.url),
);
export const COLUMNS = [
  "schema_version",
  "run_id",
  "category",
  "metric",
  "entity_id",
  "entity_kind",
  "ecosystem",
  "value",
  "unit",
  "period_start",
  "period_end",
  "observed_at",
  "source_updated_at",
  "source_url",
  "method_version",
  "raw_path",
] as const;
export type Observation = Record<(typeof COLUMNS)[number], string>;

export function csv(rows: readonly Observation[]): string {
  const cell = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return (
    [
      COLUMNS.join(","),
      ...rows.map((row) =>
        COLUMNS.map((column) => cell(row[column])).join(","),
      ),
    ].join("\n") + "\n"
  );
}

interface SourceResult {
  id: string;
  entity: string;
  source_url: string;
  method_version: string;
  observed_at: string;
  status: "ok" | "error";
  http_status?: number;
  headers?: Record<string, string>;
  raw_path?: string;
  sha256?: string;
  bytes?: number;
  error?: string;
}

export async function collectPackages(
  options: {
    dataDirectory?: string;
    fetcher?: typeof fetch;
    now?: () => Date;
    gitCommit?: string;
  } = {},
): Promise<{ runId: string; observations: Observation[] }> {
  const directory = options.dataDirectory ?? DEFAULT_DATA_DIRECTORY;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const runId = now().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const runDirectory = join(directory, "raw", "packages", runId);
  await mkdir(join(directory, "raw", "packages"), { recursive: true });
  // A run is immutable; reusing its identifier fails before writing any data.
  await mkdir(runDirectory);
  const results: SourceResult[] = [];
  const observations: Observation[] = [];
  for (const source of PACKAGE_SOURCES) {
    const result: SourceResult = {
      id: source.id,
      entity: source.entity,
      source_url: source.url,
      method_version: source.method,
      observed_at: now().toISOString(),
      status: "error",
    };
    try {
      const response = await fetcher(source.url, {
        headers: {
          "User-Agent": "PL-Charts/0.1 (https://github.com/Wilfred/pl-charts)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(30_000),
      });
      result.observed_at = now().toISOString();
      result.http_status = response.status;
      result.headers = Object.fromEntries(
        ["content-type", "date", "etag", "last-modified"].flatMap((key) => {
          const value = response.headers.get(key);
          return value ? [[key, value]] : [];
        }),
      );
      const body = Buffer.from(await response.arrayBuffer());
      const rawFile = join(runDirectory, source.filename);
      await writeFile(rawFile, body);
      result.raw_path = relative(directory, rawFile).replaceAll("\\", "/");
      result.sha256 = createHash("sha256").update(body).digest("hex");
      result.bytes = body.byteLength;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = source.parse(body.toString("utf8"));
      observations.push({
        schema_version: "1",
        run_id: runId,
        category: "packages",
        metric: "packages.published",
        entity_id: source.id,
        entity_kind: "registry",
        ecosystem: source.ecosystem,
        value: String(parsed.value),
        unit: "packages",
        period_start: "",
        period_end: "",
        observed_at: result.observed_at,
        source_updated_at: parsed.sourceUpdatedAt,
        source_url: source.url,
        method_version: source.method,
        raw_path: result.raw_path,
      });
      result.status = "ok";
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    results.push(result);
  }
  await writeFile(
    join(runDirectory, "manifest.json"),
    JSON.stringify(
      {
        schema_version: 1,
        run_id: runId,
        collector: "packages-v1",
        git_commit: options.gitCommit ?? "",
        sources: results,
      },
      null,
      2,
    ) + "\n",
  );
  const errors = results.filter((result) => result.status === "error");
  if (errors.length)
    throw new Error(
      `Collection failed: ${errors.map((result) => `${result.id}: ${result.error}`).join("; ")}. Raw responses retained in ${runDirectory}`,
    );
  const output = csv(observations);
  await mkdir(join(directory, "observations", "packages"), { recursive: true });
  await writeFile(
    join(directory, "observations", "packages", `${runId}.csv`),
    output,
    { flag: "wx" },
  );
  await mkdir(join(directory, "exports"), { recursive: true });
  const temporaryExport = join(directory, "exports", `packages-${runId}.tmp`);
  await writeFile(temporaryExport, output);
  await rename(temporaryExport, join(directory, "exports", "packages.csv"));
  return { runId, observations };
}
