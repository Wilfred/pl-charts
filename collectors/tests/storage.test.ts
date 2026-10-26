import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PACKAGE_SOURCES } from "../src/packages.ts";
import {
  collectPackages,
  COLUMNS,
  csv,
  type Observation,
} from "../src/storage.ts";

const fixtures = [
  "<p>1,234 projects</p><p>9,876 releases</p>",
  '{"doc_count":2345}',
  '{"num_crates":3456,"num_downloads":999999}',
  '{"gaNumber":"4,567","gavNumber":"99,999","dateModified":"2026-06-26 20:33:56 UTC"}',
];
const now = () => new Date("2026-10-26T12:00:00Z");
function fetcher(fail = false): typeof fetch {
  return async (input) => {
    const index = PACKAGE_SOURCES.findIndex(
      (source) => source.url === String(input),
    );
    assert.ok(index >= 0);
    const body = fixtures[index];
    assert.ok(body);
    return new Response(fail && index === 1 ? "Service unavailable" : body, {
      status: fail && index === 1 ? 503 : 200,
      headers: {
        "content-type": index === 0 ? "text/html" : "application/json",
      },
    });
  };
}

test("successful collection saves exact raw responses, provenance, observations, and export", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pl-charts-collection-"));
  try {
    const result = await collectPackages({
      dataDirectory: directory,
      fetcher: fetcher(),
      now,
    });
    assert.equal(result.observations.length, 4);
    assert.deepEqual(
      result.observations.map((row) => Number(row.value)),
      [1234, 2345, 3456, 4567],
    );
    const output = await readFile(
      join(directory, "exports/packages.csv"),
      "utf8",
    );
    assert.equal(output, csv(result.observations));
    assert.equal(
      output,
      await readFile(
        join(directory, "observations/packages", `${result.runId}.csv`),
        "utf8",
      ),
    );
    for (const [index, row] of result.observations.entries())
      assert.equal(
        await readFile(join(directory, row.raw_path), "utf8"),
        fixtures[index],
      );
    const manifest = JSON.parse(
      await readFile(
        join(directory, "raw/packages", result.runId, "manifest.json"),
        "utf8",
      ),
    ) as { sources: { sha256: string; raw_path: string }[] };
    for (const source of manifest.sources) {
      const body = await readFile(join(directory, source.raw_path));
      assert.equal(
        createHash("sha256").update(body).digest("hex"),
        source.sha256,
      );
    }
    assert.equal(
      result.observations[3]?.source_updated_at,
      "2026-06-26T20:33:56Z",
    );
    await assert.rejects(
      collectPackages({ dataDirectory: directory, fetcher: fetcher(), now }),
      /EEXIST/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed collection preserves the previous export and saves failure evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pl-charts-collection-"));
  try {
    await mkdir(join(directory, "exports"));
    await writeFile(
      join(directory, "exports/packages.csv"),
      "previous export\n",
    );
    await assert.rejects(
      collectPackages({
        dataDirectory: directory,
        fetcher: fetcher(true),
        now,
      }),
      /npm: HTTP 503/,
    );
    assert.equal(
      await readFile(join(directory, "exports/packages.csv"), "utf8"),
      "previous export\n",
    );
    const [run] = await readdir(join(directory, "raw/packages"));
    assert.ok(run);
    assert.equal(
      await readFile(join(directory, "raw/packages", run, "npm.json"), "utf8"),
      "Service unavailable",
    );
    const manifest = JSON.parse(
      await readFile(
        join(directory, "raw/packages", run, "manifest.json"),
        "utf8",
      ),
    ) as { sources: { status: string }[] };
    assert.deepEqual(
      manifest.sources.map((source) => source.status),
      ["ok", "error", "ok", "ok"],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CSV quotes commas, newlines, and quote characters", () => {
  const row = Object.fromEntries(
    COLUMNS.map((column) => [column, ""]),
  ) as Observation;
  row.source_url = 'https://example.test/?q="a,b"\n';
  assert.ok(csv([row]).includes('"https://example.test/?q=""a,b""\n"'));
});

test("checked-in observations can be recomputed from the saved source bodies", async () => {
  const root = new URL("../../data/", import.meta.url);
  const output = await readFile(new URL("exports/packages.csv", root), "utf8");
  const [header, ...lines] = output.trim().split("\n");
  assert.equal(header, COLUMNS.join(","));
  assert.equal(lines.length, 4);
  for (const line of lines) {
    const values = line.split(",");
    const row = Object.fromEntries(
      COLUMNS.map((key, index) => [key, values[index]]),
    );
    const source = PACKAGE_SOURCES.find(
      (source) => source.id === row.entity_id,
    );
    assert.ok(source);
    assert.ok(row.raw_path);
    const body = await readFile(new URL(row.raw_path, root), "utf8");
    const parsed = source.parse(body);
    assert.equal(String(parsed.value), row.value);
    assert.equal(parsed.sourceUpdatedAt, row.source_updated_at);
    assert.ok(row.observed_at && Number.isFinite(Date.parse(row.observed_at)));
  }
});
