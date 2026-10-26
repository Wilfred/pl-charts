import { execFileSync } from "node:child_process";
import * as prettier from "prettier";

const files = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const unformatted: string[] = [];
for (const file of files) {
  const info = await prettier.getFileInfo(file, {
    ignorePath: [".gitignore", ".prettierignore"],
  });
  if (info.ignored || !info.inferredParser) continue;

  // Check the staged content so partially staged files are checked correctly.
  const source = execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const config = await prettier.resolveConfig(file);
  if (!(await prettier.check(source, { ...config, filepath: file }))) {
    unformatted.push(file);
  }
}

if (unformatted.length) {
  console.error("Unformatted staged files:\n" + unformatted.join("\n"));
  console.error("Run npm run format, then stage the formatted files.");
  process.exitCode = 1;
}
