import assert from "node:assert/strict";
import test from "node:test";
import { PACKAGE_SOURCES } from "../src/packages.ts";

test("package parsers distinguish package totals from release and download totals", () => {
  const bodies = [
    "<p>1,234 projects</p><p>9,876 releases</p>",
    '{"doc_count":2345,"update_seq":9876}',
    '{"num_crates":3456,"num_downloads":999999}',
    '{"gaNumber":"4,567","gavNumber":"99,999","dateModified":"2026-06-26 20:33:56 UTC"}',
  ];
  PACKAGE_SOURCES.forEach((source, index) => {
    const body = bodies[index];
    assert.ok(body);
    const result = source.parse(body);
    assert.equal(result.value, [1234, 2345, 3456, 4567][index]);
    assert.equal(
      result.sourceUpdatedAt,
      source.id === "maven" ? "2026-06-26T20:33:56Z" : "",
    );
    assert.throws(() => source.parse("{}"));
  });
});

test("invalid numeric counts are rejected", () => {
  const source = PACKAGE_SOURCES.find((source) => source.id === "npm");
  assert.ok(source);
  for (const value of [0, -1, 1.5, "1,,234", null])
    assert.throws(() => source.parse(JSON.stringify({ doc_count: value })));
});
