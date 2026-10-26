import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { DEFAULT_DATA_DIRECTORY, csv, type Observation } from "./storage.ts";

export interface CollectionOptions {
  dataDirectory?: string;
  replay?: string;
  from?: number;
  to?: number;
}
export function collectionOptions(
  description: string,
  history = false,
): CollectionOptions {
  const { values } = parseArgs({
    options: {
      "data-dir": { type: "string" },
      replay: { type: "string" },
      help: { type: "boolean" },
      ...(history
        ? { from: { type: "string" as const }, to: { type: "string" as const } }
        : {}),
    },
  });
  if (values.help) {
    console.log(
      `${description}\n\nOptions:\n  --data-dir PATH   Data root (default: repository data/)\n  --replay RUN      Verify saved responses and observations offline\n  --help            Show this help${history ? "\n  --from YEAR       First calendar year (inclusive)\n  --to YEAR         Last calendar year (inclusive)" : ""}`,
    );
    process.exit(0);
  }
  const year = (value: unknown): number | undefined => {
    if (value === undefined) return undefined;
    if (
      typeof value !== "string" ||
      !/^\d{4}$/.test(value) ||
      +value < 1970 ||
      +value > new Date().getUTCFullYear()
    )
      throw new Error("Years must be between 1970 and the current year");
    return +value;
  };
  if (values.replay && !/^[0-9TZ-]+$/.test(values.replay))
    throw new Error("Invalid replay run identifier");
  const options = {
    dataDirectory: values["data-dir"],
    replay: values.replay,
    from: year(values.from),
    to: year(values.to),
  };
  if (options.from && options.to && options.from > options.to)
    throw new Error("--from must not follow --to");
  return options;
}
export interface SourceResponse {
  path: string;
  url: string;
  sha256: string;
  bytes: number;
  observed_at: string;
  http_status: number;
  headers: Record<string, string>;
  query?: string;
}
export interface CollectionManifest {
  schema_version: number;
  category: string;
  method: string;
  run_id: string;
  status: string;
  options: { from?: number; to?: number };
  sources: SourceResponse[];
  metadata: Record<string, unknown>;
  error?: string;
}
export interface CollectionContext {
  runId: string;
  options: CollectionOptions;
  metadata: Record<string, unknown>;
  sources: SourceResponse[];
  get(
    path: string,
    url: string,
    headers?: Record<string, string>,
  ): Promise<string>;
  query(
    path: string,
    sql: string,
    endpoint?: string,
    user?: string,
  ): Promise<unknown[]>;
  observation(
    metric: string,
    entity: string,
    value: number,
    sourcePath: string,
    fields?: Partial<Observation>,
  ): Observation;
}
export async function runCollection(
  category: string,
  method: string,
  options: CollectionOptions,
  collect: (context: CollectionContext) => Promise<Observation[]>,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<{ runId: string; observations: Observation[] }> {
  const now = dependencies.now ?? (() => new Date());
  const root = resolve(options.dataDirectory ?? DEFAULT_DATA_DIRECTORY);
  const runId =
    options.replay ??
    now().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const directory = join(root, "raw", category, runId);
  let manifest: CollectionManifest;
  if (options.replay) {
    manifest = JSON.parse(
      await readFile(join(directory, "manifest.json"), "utf8"),
    ) as CollectionManifest;
    if (manifest.status !== "complete" || manifest.method !== method)
      throw new Error(
        "Replay requires a complete run with the same method version",
      );
    if (
      (options.from !== undefined && options.from !== manifest.options.from) ||
      (options.to !== undefined && options.to !== manifest.options.to)
    )
      throw new Error("Replay year bounds differ from saved collection");
    options = { ...options, ...manifest.options };
  } else {
    await mkdir(join(root, "raw", category), { recursive: true });
    await mkdir(directory);
    manifest = {
      schema_version: 2,
      category,
      method,
      run_id: runId,
      status: "running",
      options: { from: options.from, to: options.to },
      sources: [],
      metadata: {},
    };
  }
  const used = new Set<string>();
  const context: CollectionContext = {
    runId,
    options,
    metadata: manifest.metadata,
    sources: manifest.sources,
    async get(path, url, headers = {}) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(path) || used.has(path))
        throw new Error(`Invalid or repeated source path: ${path}`);
      used.add(path);
      const saved = manifest.sources.find((source) => source.path === path);
      if (options.replay) {
        const body = await readFile(join(directory, path));
        if (
          !saved ||
          saved.url !== url ||
          createHash("sha256").update(body).digest("hex") !== saved.sha256
        )
          throw new Error(`Source checksum or URL mismatch: ${path}`);
        return body.toString("utf8");
      }
      const response = await (dependencies.fetcher ?? fetch)(url, {
        headers: {
          "User-Agent": "PL-Charts (https://github.com/Wilfred/pl-charts)",
          ...headers,
        },
        signal: AbortSignal.timeout(90000),
      });
      const body = Buffer.from(await response.arrayBuffer());
      await writeFile(join(directory, path), body);
      manifest.sources.push({
        path,
        url,
        sha256: createHash("sha256").update(body).digest("hex"),
        bytes: body.length,
        observed_at: now().toISOString(),
        http_status: response.status,
        headers: Object.fromEntries(
          ["date", "etag", "last-modified", "content-type"].flatMap((key) =>
            response.headers.get(key)
              ? [[key, response.headers.get(key)!]]
              : [],
          ),
        ),
      });
      if (!response.ok)
        throw new Error(
          `HTTP ${response.status} for ${url}: ${body.toString("utf8").slice(0, 200)}`,
        );
      return body.toString("utf8");
    },
    async query(
      path,
      sql,
      endpoint = "https://play.clickhouse.com/",
      user = "play",
    ) {
      const url = new URL(endpoint);
      url.searchParams.set("user", user);
      url.searchParams.set("query", sql);
      const body = await context.get(path, url.href);
      const saved = manifest.sources.find((source) => source.path === path)!;
      const sqlPath = join(directory, path.replace(/\.json$/, "") + ".sql");
      if (options.replay) {
        if (
          saved.query !== sql ||
          (await readFile(sqlPath, "utf8")) !== sql + "\n"
        )
          throw new Error(`Query mismatch: ${path}`);
      } else {
        saved.query = sql;
        await writeFile(sqlPath, sql + "\n");
      }
      const parsed = JSON.parse(body) as {
        data?: unknown[];
        exception?: string;
        rows?: number;
      };
      if (
        parsed.exception ||
        !Array.isArray(parsed.data) ||
        (parsed.rows !== undefined && parsed.rows !== parsed.data.length)
      )
        throw new Error(`Invalid or incomplete SQL response: ${path}`);
      return parsed.data;
    },
    observation(metric, entity, value, sourcePath, fields = {}) {
      if (!Number.isFinite(value) || value < 0)
        throw new Error(`Invalid observation value: ${metric}/${entity}`);
      const source = manifest.sources.find((item) => item.path === sourcePath);
      if (!source) throw new Error(`Missing observation source: ${sourcePath}`);
      return {
        schema_version: "1",
        run_id: runId,
        category,
        metric,
        entity_id: entity,
        entity_kind: "language",
        ecosystem: category,
        value: String(value),
        unit: "events",
        period_start: "",
        period_end: "",
        observed_at: source.observed_at,
        source_updated_at: source.headers["last-modified"]
          ? new Date(source.headers["last-modified"]).toISOString()
          : "",
        source_url: source.query
          ? new URL(source.url).origin + new URL(source.url).pathname
          : source.url,
        method_version: method,
        raw_path: `raw/${category}/${runId}/${sourcePath}`,
        ...fields,
      };
    },
  };
  try {
    const observations = await collect(context);
    if (!observations.length)
      throw new Error("Collection produced no observations");
    if (options.replay && used.size !== manifest.sources.length)
      throw new Error("Replay omitted saved sources");
    const output = csv(observations);
    const observationPath = join(
      root,
      "observations",
      category,
      `${runId}.csv`,
    );
    if (options.replay) {
      if (output !== (await readFile(observationPath, "utf8")))
        throw new Error("Replay differs from saved observations");
      console.log(
        `Verified ${observations.length} ${category} observations offline (${runId})`,
      );
    } else {
      await mkdir(join(root, "observations", category), { recursive: true });
      await writeFile(observationPath, output, { flag: "wx" });
      await mkdir(join(root, "exports"), { recursive: true });
      const temporary = join(root, "exports", `${category}-${runId}.tmp`);
      await writeFile(temporary, output);
      manifest.status = "complete";
      await writeFile(
        join(directory, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
      );
      await rename(temporary, join(root, "exports", `${category}.csv`));
      console.log(
        `Saved ${observations.length} ${category} observations (${runId})`,
      );
    }
    return { runId, observations };
  } catch (error) {
    if (!options.replay) {
      manifest.status = "failed";
      manifest.error = String(error);
      await writeFile(
        join(directory, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
      );
    }
    throw error;
  }
}
export function yearInterval(year: number): {
  period_start: string;
  period_end: string;
} {
  return {
    period_start: new Date(Date.UTC(year, 0, 1)).toISOString(),
    period_end: new Date(Date.UTC(year + 1, 0, 1)).toISOString(),
  };
}
