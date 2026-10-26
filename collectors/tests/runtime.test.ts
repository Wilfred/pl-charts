import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCollection, type CollectionContext } from "../src/runtime.ts";
const collect = async (context: CollectionContext) => {
  const body = JSON.parse(
    await context.request("counts.json", "https://example.test/counts"),
  ) as { count: number };
  return [
    context.observation("example.count", "Python", body.count, "counts.json"),
  ];
};
test("collection runtime saves exact responses, replays offline, and rejects changed responses", async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "pl-runtime-"));
  const result = await runCollection(
    "example",
    "test-v1",
    { dataDirectory },
    collect,
    { fetcher: async () => new Response('{"count":42}') },
  );
  const before = await readFile(
    join(dataDirectory, "exports/example.csv"),
    "utf8",
  );
  const replay = await runCollection(
    "example",
    "test-v1",
    { dataDirectory, replay: result.runId },
    collect,
    {
      fetcher: () => {
        throw new Error("Network forbidden");
      },
    },
  );
  assert.deepEqual(replay, result);
  assert.equal(
    await readFile(join(dataDirectory, "exports/example.csv"), "utf8"),
    before,
  );
  await writeFile(
    join(dataDirectory, "raw/example", result.runId, "counts.json"),
    '{"count":43}',
  );
  await assert.rejects(
    runCollection(
      "example",
      "test-v1",
      { dataDirectory, replay: result.runId },
      collect,
    ),
    /checksum/,
  );
});
test("failed collection retains evidence and preserves an existing export", async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "pl-runtime-failure-"));
  const first = await runCollection(
    "example",
    "test-v1",
    { dataDirectory },
    collect,
    {
      fetcher: async () => new Response('{"count":42}'),
      now: () => new Date("2026-01-01T00:00:00Z"),
    },
  );
  const before = await readFile(
    join(dataDirectory, "exports/example.csv"),
    "utf8",
  );
  await assert.rejects(
    runCollection("example", "test-v1", { dataDirectory }, collect, {
      fetcher: async () =>
        new Response('{"error":"unavailable"}', { status: 503 }),
      now: () => new Date("2026-01-02T00:00:00Z"),
    }),
    /503/,
  );
  assert.equal(
    await readFile(join(dataDirectory, "exports/example.csv"), "utf8"),
    before,
  );
  assert.ok(first.observations.length);
  const manifest = JSON.parse(
    await readFile(
      join(dataDirectory, "raw/example/2026-01-02T00-00-00-000Z/manifest.json"),
      "utf8",
    ),
  ) as { status: string };
  assert.equal(manifest.status, "failed");
});

test("replay verifies the body of read-only POST queries", async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "pl-runtime-post-"));
  const collectPost = (body: string) => async (context: CollectionContext) => {
    const parsed = JSON.parse(
      await context.request("query.json", "https://example.test/graphql", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
    ) as { count: number };
    return [
      context.observation(
        "example.count",
        "Python",
        parsed.count,
        "query.json",
      ),
    ];
  };
  const result = await runCollection(
    "example",
    "post-v1",
    { dataDirectory },
    collectPost('{"query":"count"}'),
    { fetcher: async () => new Response('{"count":42}') },
  );
  await runCollection(
    "example",
    "post-v1",
    { dataDirectory, replay: result.runId },
    collectPost('{"query":"count"}'),
  );
  await assert.rejects(
    runCollection(
      "example",
      "post-v1",
      { dataDirectory, replay: result.runId },
      collectPost('{"query":"different"}'),
    ),
    /mismatch/,
  );
});

test("source reuse creates an independent derived run while preserving original observation times", async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), "pl-runtime-source-"));
  const original = await runCollection(
    "example",
    "source-v1",
    { dataDirectory },
    collect,
    {
      fetcher: async () => new Response('{"count":42}'),
      now: () => new Date("2026-01-01T00:00:00Z"),
    },
  );
  const derived = await runCollection(
    "example",
    "source-v1",
    { dataDirectory, sourceRun: original.runId },
    collect,
    {
      fetcher: () => {
        throw new Error("Network forbidden");
      },
      now: () => new Date("2027-01-01T00:00:00Z"),
    },
  );
  assert.notEqual(derived.runId, original.runId);
  assert.equal(
    derived.observations[0]?.observed_at,
    original.observations[0]?.observed_at,
  );
  await runCollection(
    "example",
    "source-v1",
    { dataDirectory, replay: derived.runId },
    collect,
  );
});
