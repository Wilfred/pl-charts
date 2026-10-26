import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const directory = new URL(
  "../../data/raw/github-attribution/",
  import.meta.url,
);
interface Breakdown {
  year: number;
  quarter: number;
  reason: string;
  pushes: number;
  pull_requests: number;
}
function read<T>(url: URL): T {
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

test("saved attribution diagnostics have intact raw responses and consistent denominators", () => {
  for (const run of readdirSync(directory)) {
    const root = new URL(`${run}/`, directory);
    const manifest = read<{
      status: string;
      sources: { file: string; sha256: string; http_status: number }[];
    }>(new URL("manifest.json", root));
    assert.equal(manifest.status, "complete");
    for (const source of manifest.sources) {
      assert.equal(source.http_status, 200);
      assert.equal(
        createHash("sha256")
          .update(readFileSync(new URL(source.file, root)))
          .digest("hex"),
        source.sha256,
      );
    }
    const exact = read<{ data: Breakdown[] }>(new URL("exact.json", root)).data;
    const folded = read<{ data: Breakdown[] }>(
      new URL("casefold.json", root),
    ).data;
    const totals = (rows: Breakdown[]) => {
      const result: Record<string, { pushes: number; pull_requests: number }> =
        {};
      for (const row of rows) {
        const key = `${row.year}-Q${row.quarter}`;
        const group = (result[key] ??= { pushes: 0, pull_requests: 0 });
        group.pushes += Number(row.pushes);
        group.pull_requests += Number(row.pull_requests);
      }
      return result;
    };
    assert.deepEqual(totals(exact), totals(folded));
    const raw = read<{
      data: {
        name: string;
        year: number;
        quarter: number;
        pushes: number;
        pull_requests: number;
      }[];
    }>(
      new URL(
        "../../data/raw/github/2026-10-26T19-48-52-758Z/quarters.json",
        import.meta.url,
      ),
    ).data;
    for (const metric of ["pushes", "pull_requests"] as const) {
      const quarter = raw.filter(
        (row) => row.year === 2026 && row.quarter === 3,
      );
      const diagnostic = exact.filter(
        (row) => row.year === 2026 && row.quarter === 3,
      );
      const sum = (rows: { [key in typeof metric]: number }[]) =>
        rows.reduce((total, row) => total + Number(row[metric]), 0);
      assert.equal(
        sum(quarter.filter((row) => row.name !== "Unknown")),
        sum(diagnostic.filter((row) => row.reason === "known_language")),
      );
      assert.equal(
        sum(quarter.filter((row) => row.name === "Unknown")),
        sum(diagnostic.filter((row) => row.reason !== "known_language")),
      );
    }
  }
});
