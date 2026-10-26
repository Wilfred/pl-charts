// Placeholder counts used to prototype the ranking tables.
export const LANGUAGES = [
  "JavaScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "Ruby",
] as const;
export type Language = (typeof LANGUAGES)[number];
export const METRICS = [
  "githubRepos",
  "packages",
  "stackoverflow",
  "releases",
  "hiring",
] as const;
export type Metric = (typeof METRICS)[number];
export const RELEASE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025] as const;
export type ReleaseYear = (typeof RELEASE_YEARS)[number];
export const DEFAULT_YEAR: ReleaseYear = 2025;
type Counts = Record<Language, number>;
type ReleaseCounts = readonly [number, number, number, number, number, number];
type RankingData = Record<
  Exclude<Metric, "releases">,
  { label: string; values: Counts }
> & {
  releases: {
    years: typeof RELEASE_YEARS;
    series: Record<Language, ReleaseCounts>;
  };
};
export const DATA = {
  hiring: {
    label: "Job Descriptions",
    values: {
      JavaScript: 186,
      Python: 241,
      Java: 98,
      Go: 124,
      Rust: 67,
      Ruby: 42,
    },
  },
  githubRepos: {
    label: "Repositories",
    values: {
      JavaScript: 1200000,
      Python: 1100000,
      Java: 900000,
      Go: 400000,
      Rust: 250000,
      Ruby: 300000,
    },
  },
  packages: {
    label: "Packages",
    values: {
      JavaScript: 3000000,
      Python: 550000,
      Java: 600000,
      Go: 1500000,
      Rust: 150000,
      Ruby: 180000,
    },
  },
  stackoverflow: {
    label: "SO Questions",
    values: {
      JavaScript: 2500000,
      Python: 2200000,
      Java: 1900000,
      Go: 75000,
      Rust: 45000,
      Ruby: 230000,
    },
  },
  releases: {
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
  if (metric !== "releases") return rankValues(DATA[metric].values);
  const index = RELEASE_YEARS.indexOf(year);
  const counts = {} as Counts;
  for (const language of LANGUAGES) {
    const value = DATA.releases.series[language][index];
    if (value === undefined) throw new RangeError("Missing release count");
    counts[language] = value;
  }
  return rankValues(counts);
}
