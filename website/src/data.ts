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
type Counts = Record<Language, number>;
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
    values: {
      JavaScript: 800000,
      Python: 1000000,
      Java: 700000,
      Go: 350000,
      Rust: 230000,
      Ruby: 200000,
    },
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
    values: {
      JavaScript: 1200000,
      Python: 1100000,
      Java: 900000,
      Go: 400000,
      Rust: 250000,
      Ruby: 300000,
    },
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
  value: number;
  rank: number;
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
  return LANGUAGES.map((language) => ({ language, value: values[language] }))
    .sort((a, b) => b.value - a.value || a.language.localeCompare(b.language))
    .map((row, index) => {
      if (row.value !== previousValue) rank = index + 1;
      previousValue = row.value;
      return { ...row, rank };
    });
}
export function rankLanguages(
  metric: Metric,
  year: ReleaseYear = DEFAULT_YEAR,
): Ranking[] {
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

export const CATEGORIES = [
  {
    id: "github",
    label: "GitHub",
    href: "github.html",
    description: "Public GitHub activity by language.",
    metrics: ["github.pushes", "github.pull_requests"],
  },
  {
    id: "packages",
    label: "Packages",
    href: "packages.html",
    description: "Published packages by registry.",
    metrics: ["packages.published"],
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow",
    href: "stackoverflow.html",
    description: "Question and answer volume by language tag.",
    metrics: ["stackoverflow.questions", "stackoverflow.answers"],
  },
  {
    id: "survey",
    label: "Stack Overflow Survey",
    href: "surveys.html",
    description: "Self-reported language use among survey respondents.",
    metrics: ["survey.usage"],
  },
  {
    id: "releases",
    label: "Releases",
    href: "releases.html",
    description: "Stable release frequency by year.",
    metrics: ["releases.stable"],
  },
  {
    id: "hacker-news",
    label: "Hacker News",
    href: "hiring.html",
    description: "Language mentions in hiring comments.",
    metrics: ["hacker_news.job_descriptions"],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  href: string;
  description: string;
  metrics: readonly Metric[];
}[];
export type Category = (typeof CATEGORIES)[number];

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
    updatedAt: "1970-01-01",
    description:
      "Counts public push events by the repository’s primary language.",
  },
  "github.pull_requests": {
    label: "Pull Requests",
    unit: "Pull requests",
    updatedAt: "1970-01-01",
    description:
      "Counts public pull-request events by the repository’s primary language. Event action filters determine whether openings or all actions contribute.",
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

export function formatValue(metric: Metric, value: number): string {
  return metric === "survey.usage"
    ? `${value}%`
    : value.toLocaleString("en-US");
}
