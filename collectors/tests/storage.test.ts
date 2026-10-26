import { PACKAGE_FIXTURES, MODULECOUNTS_FIXTURE } from "./fixtures/packages.ts";
import { PACKAGE_SELECTION } from "../src/package-selection.ts";
import { collectPackages } from "../src/packages-collector.ts";
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
import { PACKAGE_SOURCES, ORIGINAL_PACKAGE_SOURCES } from "../src/packages.ts";
import { COLUMNS, csv, type Observation } from "../src/storage.ts";

const fixtures = PACKAGE_SOURCES.map(
  (source) => PACKAGE_FIXTURES[source.id]!.body,
);
const now = () => new Date("2026-10-26T12:00:00Z");
function fetcher(fail = false): typeof fetch {
  return async (input) => {
    if (String(input) === PACKAGE_SELECTION.url)
      return new Response(MODULECOUNTS_FIXTURE);
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
    assert.equal(result.observations.length, PACKAGE_SOURCES.length);
    assert.deepEqual(
      result.observations.map((row) => Number(row.value)),
      PACKAGE_SOURCES.map((source) => PACKAGE_FIXTURES[source.id]!.value),
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
    ) as { sources: { sha256: string; path: string }[] };
    for (const source of manifest.sources) {
      const body = await readFile(
        join(directory, "raw/packages", result.runId, source.path),
      );
      assert.equal(
        createHash("sha256").update(body).digest("hex"),
        source.sha256,
      );
    }
    assert.equal(result.observations[3]?.source_updated_at, "");
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
      /HTTP 503/,
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
    ) as { status: string; sources: { http_status: number }[] };
    assert.deepEqual(
      manifest.sources.map((source) => source.http_status),
      [200, 200, 503],
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
  assert.ok(lines.length >= ORIGINAL_PACKAGE_SOURCES.length);
  for (const line of lines) {
    const values = line.split(",");
    const row = Object.fromEntries(
      COLUMNS.map((key, index) => [key, values[index]]),
    );
    const source = [...PACKAGE_SOURCES, ...ORIGINAL_PACKAGE_SOURCES].find(
      (source) =>
        source.id === row.entity_id && source.method === row.method_version,
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
