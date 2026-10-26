import { parse } from "csv-parse/sync";
import { LANGUAGES, type LanguageCounts } from "../src/languages.ts";

export const PACKAGE_LANGUAGES = {
  npm: "JavaScript",
  pypi: "Python",
  cargo: "Rust",
  maven: "Java",
} as const;
export interface PackageSnapshot {
  counts: LanguageCounts;
  updatedAt: string;
}

export function readPackageSnapshot(source: string): PackageSnapshot {
  const records: unknown = parse(source, {
    columns: true,
    skip_empty_lines: true,
  });
  if (
    !Array.isArray(records) ||
    records.length !== Object.keys(PACKAGE_LANGUAGES).length
  ) {
    throw new Error(
      "Expected one package observation for each of the four registries",
    );
  }
  const counts = Object.fromEntries(
    LANGUAGES.map((language) => [language, null]),
  ) as LanguageCounts;
  const seen = new Set<string>();
  let latest = "";
  let runId: string | undefined;
  for (const record of records) {
    if (!record || typeof record !== "object")
      throw new Error("Invalid package observation");
    const row = record as Record<string, unknown>;
    if (
      row.schema_version !== "1" ||
      row.category !== "packages" ||
      row.metric !== "packages.published" ||
      row.entity_kind !== "registry" ||
      row.unit !== "packages"
    ) {
      throw new Error("Unexpected package observation schema");
    }
    const id = row.entity_id;
    if (
      typeof id !== "string" ||
      !Object.hasOwn(PACKAGE_LANGUAGES, id) ||
      seen.has(id)
    ) {
      throw new Error("Unexpected or duplicate package registry");
    }
    if (
      typeof row.value !== "string" ||
      !/^\d+$/.test(row.value) ||
      !Number.isSafeInteger(Number(row.value))
    ) {
      throw new Error(`Invalid package count for ${id}`);
    }
    if (
      typeof row.observed_at !== "string" ||
      !Number.isFinite(Date.parse(row.observed_at))
    ) {
      throw new Error(`Invalid observation date for ${id}`);
    }
    if (
      typeof row.run_id !== "string" ||
      !row.run_id ||
      (runId && runId !== row.run_id)
    ) {
      throw new Error(
        "Package observations must belong to a single complete run",
      );
    }
    runId = row.run_id;
    seen.add(id);
    const language = PACKAGE_LANGUAGES[id as keyof typeof PACKAGE_LANGUAGES];
    counts[language] = Number(row.value);
    const observed = new Date(row.observed_at).toISOString();
    if (observed > latest) latest = observed;
  }
  return { counts, updatedAt: latest.slice(0, 10) };
}
