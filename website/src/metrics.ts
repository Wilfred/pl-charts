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
export type Cadence = "quarter" | "year" | "month" | "snapshot";
export interface MetricDefinition {
  label: string;
  unit: string;
  description: string;
  file: string;
  cadence: Cadence;
  note?: string;
}
export const DEFINITIONS: Record<Metric, MetricDefinition> = {
  "github.pushes": {
    label: "Pushes",
    unit: "Pushes",
    description: "Recorded public PushEvent rows per UTC quarter.",
    file: "github",
    cadence: "quarter",
    note: "Shaded periods mark changed archive capture from 2025. Repository-language coverage also varies over time.",
  },
  "github.pull_requests": {
    label: "Pull Requests",
    unit: "Pull requests",
    description:
      "Recorded public PullRequestEvent rows with action opened per UTC quarter.",
    file: "github",
    cadence: "quarter",
    note: "Shaded periods mark changed archive capture from 2025. Repository-language coverage also varies over time.",
  },
  "packages.published": {
    label: "Published packages",
    unit: "Packages",
    description:
      "Registry totals from npm, PyPI, crates.io, and Maven Central, mapped to JavaScript, Python, Rust, and Java.",
    file: "packages",
    cadence: "snapshot",
    note: "— indicates an unmeasured ecosystem. npm and Maven serve several languages.",
  },
  "stackoverflow.questions": {
    label: "Questions",
    unit: "Questions",
    description:
      "Questions created per UTC quarter, grouped by language tag in the retained post snapshot.",
    file: "stackoverflow",
    cadence: "quarter",
    note: "Post snapshot: 31 March 2024. Tags reflect the retained snapshot; a post can contribute to several languages. Shell uses the bash tag.",
  },
  "stackoverflow.answers": {
    label: "Answers",
    unit: "Answers",
    description:
      "Answers created per UTC quarter, attributed through their parent questions’ language tags.",
    file: "stackoverflow",
    cadence: "quarter",
    note: "Post snapshot: 31 March 2024. Tags reflect the retained snapshot; a post can contribute to several languages. Shell uses the bash tag.",
  },
  "survey.usage": {
    label: "Usage",
    unit: "Respondents (%)",
    description:
      "Language-use percentages for each annual survey’s all-respondent cohort.",
    file: "surveys",
    cadence: "year",
    note: "Options and denominators vary by year. — indicates a language absent from that year’s published results.",
  },
  "releases.stable": {
    label: "Stable releases",
    unit: "Releases",
    description:
      "Stable runtime and compiler release records per calendar year, including maintenance releases.",
    file: "releases",
    cadence: "year",
    note: "Implementation histories have different starting dates. C and C++ share GCC; JavaScript uses Node.js; Shell uses GNU Bash.",
  },
  "hacker_news.job_descriptions": {
    label: "Job descriptions",
    unit: "Comments",
    description:
      "Top-level comments in official monthly hiring threads mentioning a language, counted once per comment.",
    file: "hiring",
    cadence: "month",
    note: "Case-aware aliases identify mentions. One comment can contribute to several languages; omitted months remain missing.",
  },
};
