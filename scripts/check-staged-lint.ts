import { execFileSync } from "node:child_process";
import { ESLint } from "eslint";

const files = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => /\.tsx?$/.test(file));

const eslint = new ESLint();
const results: ESLint.LintResult[] = [];
for (const file of files) {
  if (await eslint.isPathIgnored(file)) continue;
  // Match the committed content when only part of a file is staged.
  const source = execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  results.push(...(await eslint.lintText(source, { filePath: file })));
}

if (results.some((result) => result.errorCount || result.warningCount)) {
  const formatter = await eslint.loadFormatter("stylish");
  console.error(formatter.format(results));
  console.error(
    "Fix lint errors, then stage the corrected files. Run npm run lint:fix for automatic fixes.",
  );
  process.exitCode = 1;
}
