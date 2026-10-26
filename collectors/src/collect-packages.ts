import { collectionOptions } from "./runtime.ts";
import { collectPackages } from "./packages-collector.ts";
await collectPackages(
  collectionOptions(
    "Collect aggregate package counts from npm, PyPI, crates.io, and Maven Central.",
  ),
);
