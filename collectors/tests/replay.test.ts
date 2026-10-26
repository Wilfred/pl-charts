import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
for (const [category, script] of [
  ["surveys", "collect-surveys.ts"],
  ["stackoverflow", "collect-stackoverflow.ts"],
  ["hiring", "collect-hiring.ts"],
  ["releases", "collect-releases.ts"],
  ["github-health", "inspect-github-health.ts"],
  ["language-selection", "select-languages.ts"],
])
  test(`${category}: active observations replay from saved sources offline`, () => {
    const source = readFileSync(
      new URL(`../../data/exports/${category}.csv`, import.meta.url),
      "utf8",
    );
    const run = source.split("\n")[1]?.split(",")[1];
    assert.ok(run);
    const output = execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL(`../src/${script}`, import.meta.url)),
        "--replay",
        run,
      ],
      { encoding: "utf8" },
    );
    assert.match(output, /Verified/);
    assert.equal(
      source,
      readFileSync(
        new URL(
          `../../data/observations/${category}/${run}.csv`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
  });
