import { collectionOptions } from "./runtime.ts";
import { collectPackages } from "./packages-collector.ts";
await collectPackages(
  collectionOptions(
    "Collect package-host totals selected by the archived Modulecounts growth threshold.",
  ),
);
