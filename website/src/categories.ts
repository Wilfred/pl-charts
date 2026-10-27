import type { Metric } from "./metrics.ts";

export const CATEGORIES = [
  {
    id: "github",
    label: "GitHub",
    href: "github.html",
    description: "Quarterly public GitHub activity by language.",
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
    description: "Language use and willingness to continue using a language.",
    metrics: ["survey.usage", "survey.most_loved"],
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
    label: "HN Who's Hiring",
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
