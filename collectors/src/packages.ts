export interface ParsedCount {
  value: number;
  sourceUpdatedAt: string;
}

export interface PackageSource {
  id: string;
  entity: string;
  ecosystem: string;
  url: string;
  filename: string;
  method: string;
  parse: (body: string) => ParsedCount;
}

function integer(value: unknown): number {
  const parsed =
    typeof value === "string" && /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)
      ? Number(value.replaceAll(",", ""))
      : value;
  if (
    typeof parsed !== "number" ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error("Expected a positive integer package count");
  }
  return parsed;
}

function json(body: string): Record<string, unknown> {
  const value: unknown = JSON.parse(body);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

export const PACKAGE_SOURCES: readonly PackageSource[] = [
  {
    id: "pypi",
    entity: "PyPI",
    ecosystem: "python",
    url: "https://pypi.org/",
    filename: "pypi.html",
    method: "pypi-project-count-v1",
    parse: (body) => {
      const match = body.match(/\b([\d,]+)\s+projects\b/);
      if (!match) throw new Error("PyPI project total was not found");
      return { value: integer(match[1]), sourceUpdatedAt: "" };
    },
  },
  {
    id: "npm",
    entity: "npm",
    ecosystem: "javascript-typescript",
    url: "https://replicate.npmjs.com/",
    filename: "npm.json",
    method: "npm-registry-doc-count-v1",
    parse: (body) => ({
      value: integer(json(body).doc_count),
      sourceUpdatedAt: "",
    }),
  },
  {
    id: "cargo",
    entity: "crates.io",
    ecosystem: "rust",
    url: "https://crates.io/api/v1/summary",
    filename: "cargo.json",
    method: "crates-num-crates-v1",
    parse: (body) => ({
      value: integer(json(body).num_crates),
      sourceUpdatedAt: "",
    }),
  },
  {
    id: "maven",
    entity: "Maven Central",
    ecosystem: "jvm",
    url: "https://search.maven.org/quickstats",
    filename: "maven.json",
    method: "maven-distinct-group-artifact-v1",
    parse: (body) => {
      const value = json(body);
      if (
        typeof value.dateModified !== "string" ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/.test(value.dateModified)
      ) {
        throw new Error("Maven source modification date was not found");
      }
      return {
        value: integer(value.gaNumber),
        sourceUpdatedAt: value.dateModified
          .replace(" ", "T")
          .replace(" UTC", "Z"),
      };
    },
  },
];
