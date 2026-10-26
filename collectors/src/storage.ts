import { fileURLToPath } from "node:url";

export const DEFAULT_DATA_DIRECTORY = fileURLToPath(
  new URL("../../data/", import.meta.url),
);
export const COLUMNS = [
  "schema_version",
  "run_id",
  "category",
  "metric",
  "entity_id",
  "entity_kind",
  "ecosystem",
  "value",
  "unit",
  "period_start",
  "period_end",
  "observed_at",
  "source_updated_at",
  "source_url",
  "method_version",
  "raw_path",
] as const;
export type Observation = Record<(typeof COLUMNS)[number], string>;

export function csv(rows: readonly Observation[]): string {
  const cell = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return (
    [
      COLUMNS.join(","),
      ...rows.map((row) =>
        COLUMNS.map((column) => cell(row[column])).join(","),
      ),
    ].join("\n") + "\n"
  );
}
