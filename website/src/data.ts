import githubSnapshot from "../.generated/github.json" with { type: "json" };
import type {
  GithubSnapshot,
  GithubCounts,
  GithubMetric,
} from "../scripts/github-data.ts";
const github: GithubSnapshot = githubSnapshot;
export const GITHUB_QUARTERS = github.quarters.filter(
  (quarter) => !isPartialGithubQuarter(quarter),
);
const latestCompleteQuarter = GITHUB_QUARTERS.at(-1);
if (!latestCompleteQuarter) throw new Error("No complete GitHub quarters");
export const DEFAULT_GITHUB_QUARTER = latestCompleteQuarter;
export const GITHUB_CUTOFF = github.cutoff;
export const GITHUB_COVERAGE = github.coverage;
export function isPartialGithubQuarter(quarter: string): boolean {
  const [year, part] = quarter.split("-Q").map(Number);
  if (year === undefined || part === undefined) return false;
  return (
    quarter === "2011-Q1" ||
    github.periodEnds[quarter] !==
      new Date(Date.UTC(year, part * 3, 1)).toISOString()
  );
}
export function isGithubQuarter(value: string | undefined): value is string {
  return value !== undefined && GITHUB_QUARTERS.includes(value);
}
export function githubCounts(
  metric: GithubMetric,
  quarter: string,
): GithubCounts {
  const counts = github.counts[metric][quarter];
  if (!counts) throw new Error(`Missing quarter ${quarter}`);
  return counts;
}
export function formatQuarter(quarter: string): string {
  return (
    quarter.replace("-Q", " Q") +
    (isPartialGithubQuarter(quarter) ? " (partial)" : "")
  );
}
import { CATEGORIES, type Category } from "./categories.ts";
export { CATEGORIES, type Category } from "./categories.ts";
import packageSnapshot from "../.generated/packages.json" with { type: "json" };
import { LANGUAGES, type Language } from "./languages.ts";
export { LANGUAGES, type Language } from "./languages.ts";

export const METRICS = [
  "github.pushes",
  "github.pull_requests",
  "packages.published",
  "stackoverflow.questions",
  "stackoverflow.answers",
  "survey.usage",
  "releases.stable",
  "hacker_news.job_descriptions",
] as const;
export type Metric = (typeof METRICS)[number];
export const RELEASE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025] as const;
export type ReleaseYear = (typeof RELEASE_YEARS)[number];
export const DEFAULT_YEAR: ReleaseYear = 2025;
type Counts = Record<Language, number | null>;
type ReleaseCounts = readonly [number, number, number, number, number, number];
type RankingData = Record<
  Exclude<Metric, "releases.stable">,
  { values: Counts }
> & {
  "releases.stable": {
    years: typeof RELEASE_YEARS;
    series: Record<Language, ReleaseCounts>;
  };
};
export const DATA = {
  "github.pull_requests": {
    values: githubCounts("github.pull_requests", DEFAULT_GITHUB_QUARTER),
  },
  "stackoverflow.answers": {
    values: {
      JavaScript: 3100000,
      Python: 2900000,
      Java: 2700000,
      Go: 110000,
      Rust: 65000,
      Ruby: 300000,
    },
  },
  "survey.usage": {
    values: {
      JavaScript: 64.2,
      Python: 55.6,
      Java: 31.4,
      Go: 18.3,
      Rust: 13.2,
      Ruby: 7.1,
    },
  },
  "hacker_news.job_descriptions": {
    values: {
      JavaScript: 186,
      Python: 241,
      Java: 98,
      Go: 124,
      Rust: 67,
      Ruby: 42,
    },
  },
  "github.pushes": {
    values: githubCounts("github.pushes", DEFAULT_GITHUB_QUARTER),
  },
  "packages.published": { values: packageSnapshot.counts },
  "stackoverflow.questions": {
    values: {
      JavaScript: 2500000,
      Python: 2200000,
      Java: 1900000,
      Go: 75000,
      Rust: 45000,
      Ruby: 230000,
    },
  },
  "releases.stable": {
    years: [2020, 2021, 2022, 2023, 2024, 2025],
    series: {
      JavaScript: [1, 1, 1, 1, 1, 1],
      Python: [5, 6, 7, 6, 8, 7],
      Java: [2, 2, 2, 2, 2, 2],
      Go: [6, 7, 8, 7, 9, 8],
      Rust: [12, 10, 9, 9, 9, 9],
      Ruby: [4, 5, 4, 5, 6, 5],
    },
  },
} as const satisfies RankingData;
export interface Ranking {
  language: Language;
  value: number | null;
  rank: number | null;
}
export function isMetric(value: string | undefined): value is Metric {
  return METRICS.some((metric) => metric === value);
}
export function isReleaseYear(value: number): value is ReleaseYear {
  return RELEASE_YEARS.some((year) => year === value);
}
// Competition ranking: equal counts share a rank, with gaps after ties.
export function rankValues(values: Readonly<Counts>): Ranking[] {
  let previousValue: number | undefined;
  let rank = 0;
  const available = LANGUAGES.flatMap((language) => {
    const value = values[language];
    return value === null ? [] : [{ language, value }];
  }).sort((a, b) => b.value - a.value || a.language.localeCompare(b.language));
  const ranked: Ranking[] = available.map((row, index) => {
    if (row.value !== previousValue) rank = index + 1;
    previousValue = row.value;
    return { ...row, rank };
  });
  return [
    ...ranked,
    ...LANGUAGES.filter((language) => values[language] === null)
      .sort()
      .map((language) => ({ language, value: null, rank: null })),
  ];
}
export function rankLanguages(
  metric: Metric,
  year: ReleaseYear = DEFAULT_YEAR,
  quarter: string = DEFAULT_GITHUB_QUARTER,
): Ranking[] {
  if (metric === "github.pushes" || metric === "github.pull_requests")
    return rankValues(githubCounts(metric, quarter));
  if (metric !== "releases.stable") return rankValues(DATA[metric].values);
  const index = RELEASE_YEARS.indexOf(year);
  const counts = {} as Counts;
  for (const language of LANGUAGES) {
    const value = DATA["releases.stable"].series[language][index];
    if (value === undefined) throw new RangeError("Missing release count");
    counts[language] = value;
  }
  return rankValues(counts);
}

interface MetricDefinition {
  label: string;
  unit: string;
  updatedAt: string;
  description: string;
}
export const METRIC_INFO: Record<Metric, MetricDefinition> = {
  "github.pushes": {
    label: "Pushes",
    unit: "Pushes",
    updatedAt: github.updatedAt,
    description: "Public PushEvent rows per UTC quarter.",
  },
  "github.pull_requests": {
    label: "Pull Requests",
    unit: "Pull requests",
    updatedAt: github.updatedAt,
    description:
      "Public PullRequestEvent rows with action opened per UTC quarter.",
  },
  "packages.published": {
    label: "Published packages",
    unit: "Packages",
    updatedAt: packageSnapshot.updatedAt,
    description:
      "Published package totals from npm, PyPI, crates.io, and Maven Central, attributed to JavaScript, Python, Rust, and Java respectively. npm and Maven cover shared language ecosystems.",
  },
  "stackoverflow.questions": {
    label: "Questions",
    unit: "Questions",
    updatedAt: "1970-01-01",
    description:
      "Counts questions tagged with each language. A question may have several language tags.",
  },
  "stackoverflow.answers": {
    label: "Answers",
    unit: "Answers",
    updatedAt: "1970-01-01",
    description:
      "Counts answers to questions tagged with each language. Answers inherit language attribution from the parent question.",
  },
  "survey.usage": {
    label: "Usage",
    unit: "Respondents (%)",
    updatedAt: "1970-01-01",
    description:
      "Percentage of respondents reporting language use during the past year, among those answering the language question. A respondent may select several languages.",
  },
  "releases.stable": {
    label: "Stable releases",
    unit: "Releases",
    updatedAt: "1970-01-01",
    description:
      "Counts stable releases within a calendar year. Feature releases and maintenance releases require separate classification.",
  },
  "hacker_news.job_descriptions": {
    label: "Job descriptions",
    unit: "Comments",
    updatedAt: "1970-01-01",
    description:
      "Counts top-level hiring comments mentioning each language, once per comment. One comment may contribute to several languages.",
  },
};

export function metricCategory(metric: Metric): Category {
  const category = CATEGORIES.find((category) =>
    (category.metrics as readonly Metric[]).includes(metric),
  );
  if (!category) throw new Error(`Unknown category for ${metric}`);
  return category;
}

export function formatRank(rank: number | null | undefined): string {
  return rank == null ? "—" : `#${rank}`;
}

export function formatValue(metric: Metric, value: number | null): string {
  if (value === null) return "—";
  return metric === "survey.usage"
    ? `${value}%`
    : value.toLocaleString("en-US");
}
