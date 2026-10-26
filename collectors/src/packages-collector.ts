import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runCollection, type CollectionOptions } from "./runtime.ts";
import {
  modulecountsSelection,
  PACKAGE_SELECTION,
} from "./package-selection.ts";
import { PACKAGE_SOURCES } from "./packages.ts";
import { DEFAULT_DATA_DIRECTORY } from "./storage.ts";
import { replayLegacy } from "./legacy-replay.ts";
export async function collectPackages(
  options: CollectionOptions & {
    fetcher?: typeof fetch;
    now?: () => Date;
  } = {},
) {
  if (options.replay) {
    const root = resolve(options.dataDirectory ?? DEFAULT_DATA_DIRECTORY);
    const manifest = JSON.parse(
      await readFile(
        join(root, "raw/packages", options.replay, "manifest.json"),
        "utf8",
      ),
    ) as { schema_version: number };
    if (manifest.schema_version !== 2)
      return replayLegacy("packages", root, options.replay);
  }
  return runCollection(
    "packages",
    "package-host-snapshots-v3",
    options,
    async (context) => {
      context.metadata.selection = modulecountsSelection(
        await context.request("modulecounts.html", PACKAGE_SELECTION.url),
      );
      const rows = [];
      for (const source of PACKAGE_SOURCES) {
        const parsed = source.parse(
          await context.request(source.filename, source.url, {
            headers: source.headers,
          }),
        );
        rows.push(
          context.observation(
            "packages.published",
            source.id,
            parsed.value,
            source.filename,
            {
              entity_kind: "registry",
              unit: "packages",
              ecosystem: source.ecosystem,
              source_updated_at: parsed.sourceUpdatedAt,
              method_version: source.method,
            },
          ),
        );
      }
      context.metadata.methods = Object.fromEntries(
        PACKAGE_SOURCES.map((source) => [source.id, source.method]),
      );
      return rows;
    },
    { fetcher: options.fetcher, now: options.now },
  );
}
