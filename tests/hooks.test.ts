import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("commit hook checks staged formatting and lint without modifying files", () => {
  const directory = mkdtempSync(join(tmpdir(), "pl-charts-hook-"));
  const file = "sample file.ts";
  const fixture = join(directory, file);
  const valid = "export const answer = 42;\n";
  const git = (...args: string[]): string =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" });
  const hook = () =>
    spawnSync(join(root, ".githooks/pre-commit"), [], {
      cwd: directory,
      encoding: "utf8",
    });
  try {
    git("init", "--quiet");
    for (const path of [
      "scripts",
      "node_modules",
      "eslint.config.ts",
      ".prettierrc.json",
    ]) {
      symlinkSync(join(root, path), join(directory, path));
    }

    const unformatted = "export const answer=42\n";
    writeFileSync(fixture, unformatted);
    git("add", "--", file);
    writeFileSync(fixture, valid);
    const formatResult = hook();
    assert.equal(formatResult.status, 1);
    assert.match(formatResult.stderr, /Unformatted staged files/);
    assert.equal(git("show", `:${file}`), unformatted);

    writeFileSync(fixture, "debugger;\n");
    git("add", "--", file);
    writeFileSync(fixture, valid);
    const lintResult = hook();
    assert.equal(lintResult.status, 1);
    assert.match(lintResult.stderr, /no-debugger/);
    assert.equal(git("show", `:${file}`), "debugger;\n");

    git("add", "--", file);
    const validResult = hook();
    assert.equal(validResult.status, 0, validResult.stderr);
    assert.equal(git("show", `:${file}`), valid);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
