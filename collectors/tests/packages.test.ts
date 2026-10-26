import assert from "node:assert/strict";
import test from "node:test";
import { PACKAGE_FIXTURES, MODULECOUNTS_FIXTURE } from "./fixtures/packages.ts";
import { modulecountsSelection } from "../src/package-selection.ts";
import { PACKAGE_SOURCES, ORIGINAL_PACKAGE_SOURCES } from "../src/packages.ts";

test("package parsers distinguish package totals from release and download totals", () => {
  PACKAGE_SOURCES.forEach((source) => {
    const { body, value } = PACKAGE_FIXTURES[source.id]!;
    assert.ok(body);
    const result = source.parse(body);
    assert.equal(result.value, value);
    assert.equal(result.sourceUpdatedAt, "");
    assert.throws(() => source.parse("{}"));
  });
});

test("invalid numeric counts are rejected", () => {
  const source = PACKAGE_SOURCES.find((source) => source.id === "npm");
  assert.ok(source);
  for (const value of [0, -1, 1.5, "1,,234", null])
    assert.throws(() => source.parse(JSON.stringify({ doc_count: value })));
});

test("Modulecounts selection includes the two-per-day boundary and deduplicates CPAN", () => {
  const selection = modulecountsSelection(MODULECOUNTS_FIXTURE);
  assert.equal(selection.hosts.length, 14);
  assert.equal(selection.hosts.filter((id) => id === "cpan").length, 1);
  assert.ok(selection.hosts.includes("melpa"));
  assert.ok(!selection.hosts.includes("hackage"));
  assert.throws(
    () =>
      modulecountsSelection(
        MODULECOUNTS_FIXTURE.replace("MELPA (Emacs)", "New host"),
      ),
    /Unreviewed/,
  );
  assert.throws(
    () =>
      modulecountsSelection(
        MODULECOUNTS_FIXTURE.replace("<td>2/day</td>", "<td>1/day</td>"),
      ),
    /threshold/,
  );
});
test("host totals reject incomplete and ambiguous source results", () => {
  assert.throws(() =>
    PACKAGE_SOURCES.find((s) => s.id === "cpan")!.parse(
      '{"_shards":{"failed":1},"count":100}',
    ),
  );
  assert.throws(() =>
    PACKAGE_SOURCES.find((s) => s.id === "melpa")!.parse('{"downloads":100}'),
  );
  assert.throws(() =>
    PACKAGE_SOURCES.find((s) => s.id === "drupal")!.parse(
      '{"last":"https://www.drupal.org/api-d7/node?type=project_module&limit=25&page=100","list":[{}]}',
    ),
  );
});

test("the original Maven parser preserves the source-reported freshness for legacy replay", () => {
  const source = ORIGINAL_PACKAGE_SOURCES.find(
    (source) => source.id === "maven",
  )!;
  assert.deepEqual(
    source.parse(
      '{"gaNumber":"4,567","gavNumber":"99,999","dateModified":"2026-06-26 20:33:56 UTC"}',
    ),
    { value: 4567, sourceUpdatedAt: "2026-06-26T20:33:56Z" },
  );
});
