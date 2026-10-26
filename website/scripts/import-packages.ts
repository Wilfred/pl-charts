import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { readPackageSnapshot } from "./package-data.ts";
const snapshot = readPackageSnapshot(
  readFileSync(
    new URL("../../data/exports/packages.csv", import.meta.url),
    "utf8",
  ),
);
mkdirSync(new URL("../.generated/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../.generated/packages.json", import.meta.url),
  JSON.stringify(snapshot, null, 2) + "\n",
);
