import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectPackages } from "./storage.ts";

try {
  const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    encoding: "utf8",
  }).trim();
  const result = await collectPackages({ gitCommit });
  console.log(
    `Saved ${result.observations.length} observations for ${result.runId}`,
  );
  for (const row of result.observations)
    console.log(`${row.entity_id}: ${row.value} (${row.source_url})`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
