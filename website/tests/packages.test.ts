import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "csv-parse/sync";
import { DATA, rankLanguages } from "../src/data.ts";
import { readPackageSnapshot } from "../scripts/package-data.ts";

const source = readFileSync(
  new URL("../../data/exports/packages.csv", import.meta.url),
  "utf8",
);

test("package tables use the checked-in registry counts and zero for the remaining languages", () => {
  const observations = parse(source, {
    columns: true,
    skip_empty_lines: true,
  }) as { entity_id: string; value: string }[];
  const values = new Map(
    observations.map((row) => [row.entity_id, Number(row.value)]),
  );
  assert.deepEqual(DATA["packages.published"].values, {
    JavaScript: values.get("npm"),
    Python: values.get("pypi"),
    Java: values.get("maven"),
    Rust: values.get("cargo"),
    Go: 0,
    Ruby: 0,
  });
  const ranks = rankLanguages("packages.published");
  assert.deepEqual(
    ranks.slice(-2).map((row) => [row.language, row.rank, row.value]),
    [
      ["Go", 5, 0],
      ["Ruby", 5, 0],
    ],
  );
});

const fixture = `schema_version,category,metric,entity_kind,unit,entity_id,value,observed_at,run_id
1,packages,packages.published,registry,packages,npm,100,2026-10-25T01:00:00Z,run-1
1,packages,packages.published,registry,packages,pypi,200,2026-10-26T02:00:00Z,run-1
1,packages,packages.published,registry,packages,cargo,300,2026-10-26T03:00:00Z,run-1
1,packages,packages.published,registry,packages,maven,400,2026-10-26T04:00:00Z,run-1
`;

test("the snapshot reader preserves counts and the latest collection date", () => {
  const snapshot = readPackageSnapshot(fixture);
  assert.equal(snapshot.updatedAt, "2026-10-26");
  assert.deepEqual(snapshot.counts, {
    JavaScript: 100,
    Python: 200,
    Rust: 300,
    Java: 400,
    Go: 0,
    Ruby: 0,
  });
});

test("missing, duplicate, invalid, or mixed-run observations fail before rendering", () => {
  const lines = fixture.trim().split("\n");
  assert.throws(
    () => readPackageSnapshot(lines.slice(0, -1).join("\n")),
    /four registries/,
  );
  assert.throws(
    () => readPackageSnapshot(fixture.replace(",pypi,200", ",npm,200")),
    /duplicate/,
  );
  assert.throws(
    () => readPackageSnapshot(fixture.replace(",pypi,200", ",pypi,-1")),
    /Invalid package count/,
  );
  assert.throws(
    () => readPackageSnapshot(fixture.replace("run-1", "different-run")),
    /single complete run/,
  );
});
