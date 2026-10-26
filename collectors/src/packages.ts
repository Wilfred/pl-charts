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
  headers?: Record<string, string>;
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

export const ORIGINAL_PACKAGE_SOURCES: readonly PackageSource[] = [
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

function text(body: string): string {
  return body
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|thinsp|#160|#8201);/g, " ")
    .replace(/\s+/g, " ");
}
function matchedCount(body: string, pattern: RegExp): ParsedCount {
  const match = text(body).match(pattern);
  if (!match) throw new Error("Package total was not found");
  return {
    value: integer(match[1]!.replace(/[\s\u2009\u202f]/g, "")),
    sourceUpdatedAt: "",
  };
}
const additionalSources: readonly PackageSource[] = [
  {
    id: "nuget",
    entity: "NuGet",
    ecosystem: "dotnet",
    url: "https://azuresearch-usnc.nuget.org/query?q=&take=0&prerelease=true&semVerLevel=2.0.0",
    filename: "nuget.json",
    method: "nuget-listed-package-ids-v1",
    parse: (body) => ({
      value: integer(json(body).totalHits),
      sourceUpdatedAt: "",
    }),
  },
  {
    id: "packagist",
    entity: "Packagist",
    ecosystem: "php",
    url: "https://packagist.org/statistics",
    filename: "packagist.html",
    method: "packagist-registered-packages-v1",
    parse: (body) =>
      matchedCount(
        body,
        /Packages registered\s+([\d,\s\u2009\u202f]+)\s+Versions available/,
      ),
  },
  {
    id: "rubygems",
    entity: "RubyGems",
    ecosystem: "ruby",
    url: "https://rubygems.org/stats",
    filename: "rubygems.html",
    method: "rubygems-total-gems-v1",
    parse: (body) => matchedCount(body, /Total gems\s+([\d,]+)\s+Total users/),
  },
  {
    id: "cpan",
    entity: "CPAN",
    ecosystem: "perl",
    url: "https://fastapi.metacpan.org/v1/distribution/_count",
    filename: "cpan.json",
    method: "metacpan-indexed-distributions-v1",
    parse: (body) => {
      const value = json(body);
      const shards = value._shards as { failed?: number } | undefined;
      if (shards?.failed !== 0) throw new Error("CPAN count has failed shards");
      return { value: integer(value.count), sourceUpdatedAt: "" };
    },
  },
  {
    id: "clojars",
    entity: "Clojars",
    ecosystem: "clojure-clojurescript",
    url: "https://clojars.org/projects",
    filename: "clojars.html",
    method: "clojars-projects-total-v1",
    parse: (body) =>
      matchedCount(
        body,
        /Displaying projects\s+[\d,]+\s*-\s*[\d,]+\s+of\s+([\d,]+)/,
      ),
  },
  {
    id: "hex",
    entity: "Hex",
    ecosystem: "elixir-erlang",
    url: "https://hex.pm/",
    filename: "hex.html",
    method: "hex-available-packages-v1",
    parse: (body) => matchedCount(body, /([\d,\s]+) packages available/),
  },
  {
    id: "luarocks",
    entity: "LuaRocks",
    ecosystem: "lua",
    url: "https://luarocks.org/modules",
    filename: "luarocks.html",
    method: "luarocks-owner-package-listings-v1",
    parse: (body) => matchedCount(body, /All Modules\s*\(([\d,]+)\)/),
  },
  {
    id: "crystalshards",
    entity: "CrystalShards",
    ecosystem: "crystal",
    url: "https://crystalshards.org/",
    filename: "crystalshards.html",
    method: "crystalshards-indexed-shards-v1",
    parse: (body) => matchedCount(body, /\bShards\s+([\d,]+)\s+Stars\b/),
  },
  {
    id: "melpa",
    entity: "MELPA",
    ecosystem: "emacs-lisp",
    url: "https://melpa.org/archive.json",
    filename: "melpa.json",
    headers: { "Accept-Encoding": "identity" },
    method: "melpa-archive-package-names-v1",
    parse: (body) => {
      const entries = Object.values(json(body));
      if (
        entries.some(
          (value) =>
            !value ||
            typeof value !== "object" ||
            !Array.isArray((value as { ver?: unknown }).ver),
        )
      )
        throw new Error("Invalid MELPA archive");
      return { value: integer(entries.length), sourceUpdatedAt: "" };
    },
  },
  {
    id: "drupal",
    entity: "Drupal",
    ecosystem: "php",
    url: "https://www.drupal.org/api-d7/node.json?type=project_module&limit=1",
    filename: "drupal.json",
    method: "drupal-module-projects-pagination-v1",
    parse: (body) => {
      const value = json(body);
      if (
        typeof value.last !== "string" ||
        !Array.isArray(value.list) ||
        value.list.length !== 1
      )
        throw new Error("Invalid Drupal project listing");
      const last = new URL(value.last);
      const page = last.searchParams.get("page");
      if (
        last.origin !== "https://www.drupal.org" ||
        last.searchParams.get("limit") !== "1" ||
        last.searchParams.get("type") !== "project_module" ||
        !page ||
        !/^\d+$/.test(page)
      )
        throw new Error("Invalid Drupal pagination");
      return { value: integer(Number(page) + 1), sourceUpdatedAt: "" };
    },
  },
];
export const PACKAGE_SOURCES = [
  ...ORIGINAL_PACKAGE_SOURCES.map((source) =>
    source.id === "maven"
      ? {
          ...source,
          url: "https://search.maven.org/solrsearch/select?q=*:*&rows=0&wt=json",
          filename: "maven-search.json",
          method: "maven-search-distinct-group-artifact-v2",
          parse: (body: string): ParsedCount => {
            const value = json(body) as {
              responseHeader?: { status?: number };
              response?: { numFound?: unknown };
            };
            if (value.responseHeader?.status !== 0)
              throw new Error("Maven search failed");
            return {
              value: integer(value.response?.numFound),
              sourceUpdatedAt: "",
            };
          },
        }
      : source,
  ),
  ...additionalSources,
];
