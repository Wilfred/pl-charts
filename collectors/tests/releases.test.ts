import assert from "node:assert/strict";
import test from "node:test";
import { dartReleases } from "../src/release-sources.ts";
test("release parsing excludes development and unreleased versions", () => {
  const body =
    "## 3.1.0\n\n**Released on:** Unreleased\n\n## 3.0.1-dev.1\n\n**Released on:** 2026-01-10\n\n## 3.0.0\n\n**Released on:** 2026-01-01\n\n## 2.9.9 - 2025-12-30\n";
  assert.deepEqual(
    dartReleases(body, "dart.md").map((row) => [row.version, row.date]),
    [
      ["3.0.0", "2026-01-01T00:00:00Z"],
      ["2.9.9", "2025-12-30T00:00:00Z"],
    ],
  );
});
