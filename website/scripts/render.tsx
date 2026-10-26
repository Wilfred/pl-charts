import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readPackageSnapshot } from "./package-data.ts";

const root = new URL("../", import.meta.url);
function writeChanged(path: URL, content: string): void {
  try {
    if (readFileSync(path, "utf8") === content) return;
  } catch {
    /* New generated file. */
  }
  writeFileSync(path, content);
}

const snapshot = readPackageSnapshot(
  readFileSync(
    new URL("../../data/exports/packages.csv", import.meta.url),
    "utf8",
  ),
);
mkdirSync(new URL(".generated/", root), { recursive: true });
writeChanged(
  new URL(".generated/packages.json", root),
  JSON.stringify(snapshot, null, 2) + "\n",
);
const { renderPage, PAGE_PATHS } = await import("../src/pages.tsx");
const pages = PAGE_PATHS.map((page) => [page, renderPage(page)] as const);
for (const [page, html] of pages) writeChanged(new URL(page, root), html);
console.log(
  `Rendered ${pages.length} pages from JSX in ${fileURLToPath(root)}`,
);
