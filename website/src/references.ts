import type { Category } from "./data.ts";
export interface ReferenceContent {
  items: readonly { href: string; title: string; description: string }[];
  notes: string;
  preliminaryAnalysis?: string;
}
export const REFERENCES: Record<Category["id"], ReferenceContent> = {
  github: {
    items: [
      {
        href: "https://www.gharchive.org/",
        title: "GH Archive",
        description:
          "Hourly archives of public GitHub events. The archive starts on 12 February 2011 and changed from the Timeline API to the Events API in 2015.",
      },
      {
        href: "https://clickhouse.com/docs/get-started/sample-datasets/github-events",
        title: "ClickHouse GitHub event dataset",
        description:
          "Public SQL access to archived events and repository metadata. Our collector executes the SQL saved alongside each raw response.",
      },
      {
        href: "https://madnight.github.io/githut/",
        title: "GitHut 2.0",
        description:
          "An independent approach to quarterly language rankings, with separate views for pushes, pull requests, stars, and issues. Its query joins events to languages from pull-request payloads, omits unmatched repositories, and filters actors. Percentages use retained language counts.",
      },
    ],
    notes:
      "Events use the latest known repository primary language at collection time. Repository metadata covers a subset of public activity; unmatched repositories and empty languages appear as Unknown in the CSV. Coverage varies over time. Bots and forks are included. Rankings and plots use complete quarters.",
  },
  packages: {
    items: [
      {
        href: "https://web.archive.org/web/20240115115215/http://www.modulecounts.com/",
        title: "Modulecounts.com — 15 January 2024 archive",
        description:
          "Daily registry totals with growth averaged over the preceding week. Package names count once across versions. The archive documents missing observations, changes to registry sites, and comparability problems with the Go index.",
      },
      {
        href: "https://github.com/edebill/modulecounts",
        title: "Modulecounts source",
        description:
          "Erik DeBill’s implementation polls registries nightly. Registry-specific collectors provide a starting point for reviewing counting rules and historical changes.",
      },
      {
        href: "https://github.com/mikeal/modulecounts-metrics",
        title: "Modulecounts metrics",
        description:
          "A separate analysis tool consumes the published CSV and generates derived metric files.",
      },
    ],
    notes:
      "Comparison variables: distinct package names, registry coverage, observation date, and collector changes. Preserve gaps and source changes when comparing historical growth.",
  },
  stackoverflow: {
    items: [
      {
        href: "https://api.stackexchange.com/docs/tags",
        title: "Stack Exchange tags API",
        description:
          "The popular sort orders tags by question count. Tag totals provide a cumulative measure; a question can contribute to several language tags.",
      },
      {
        href: "https://stackoverflow.blog/2017/09/06/incredible-growth-python/",
        title: "David Robinson — The Incredible Growth of Python (2017)",
        description:
          "Compares language-tag traffic over time, segments high-income countries, and models seasonality. Its principal measure is question visits; it also discusses the question-count approach used by Stack Overflow Trends.",
      },
      {
        href: "https://survey.stackoverflow.co/",
        title: "Stack Overflow Developer Survey archive",
        description:
          "Annual reports provide a separate, respondent-based measure of language use. The Stack Overflow Survey category covers that approach.",
      },
    ],
    notes:
      "Comparison variables: cumulative totals or questions per month, tag aliases, version-specific tags, and the denominator used for monthly shares.",
  },
  survey: {
    items: [
      {
        href: "https://survey.stackoverflow.co/2026/technology/",
        title: "2026 Developer Survey — technology",
        description:
          "Reports language usage, desired usage, and related technology rankings. Usage percentages and respondent counts allow comparisons within a specified respondent group.",
      },
      {
        href: "https://survey.stackoverflow.co/2025/methodology",
        title: "2025 Developer Survey — methodology",
        description:
          "Documents recruitment through Stack Overflow channels, response screening, and changes to multi-select denominators. These details affect comparisons between years and respondent groups.",
      },
      {
        href: "https://survey.stackoverflow.co/",
        title: "Survey archive and data downloads",
        description:
          "Provides annual reports and data files. Question wording, language options, and respondent cohorts should be aligned before calculating historical ranks.",
      },
    ],
    notes:
      "Comparison variables: survey year, respondent group, question wording, and the number answering the language question. Multi-select responses allow a respondent to contribute to several languages.",
  },
  releases: {
    items: [
      {
        href: "https://peps.python.org/pep-0602/",
        title: "Python — PEP 602",
        description:
          "Specifies an annual feature-release cycle. Maintenance releases and security releases form separate series.",
      },
      {
        href: "https://go.dev/doc/devel/release",
        title: "Go — release history",
        description:
          "Lists dated stable versions and their changes. Feature releases and patch releases can be classified from the version history.",
      },
      {
        href: "https://doc.rust-lang.org/book/appendix-07-nightly-rust.html",
        title: "Rust — release channels",
        description:
          "Describes the six-week stable release train and the nightly and beta channels. Channel selection substantially changes the event count.",
      },
    ],
    notes: "",
    preliminaryAnalysis:
      "Release frequency depends on release policy. An initial comparison could count feature releases and maintenance releases separately, group events by calendar year, and record the implementation being measured. Python’s annual cycle and Rust’s six-week train illustrate how schedules influence the resulting ranks.",
  },
  "hacker-news": {
    items: [
      {
        href: "https://hackernewstrends.com/who-is-hiring",
        title: "Hacker News Trends — Who Is Hiring?",
        description:
          "Compares terms in top-level hiring comments since 2011. Provides monthly counts and shares, alias groups joined with OR, and links back to matching posts.",
      },
      {
        href: "https://engineeringrates.com/research/hiring-trends/",
        title: "Engineering Rates — HN hiring trends",
        description:
          "Matches technology keywords and aliases across 36 sampled threads between July 2015 and February 2025. The documented sample is discontinuous, which matters when comparing periods.",
      },
      {
        href: "https://exxa.notion.site/Hacker-News-analysis-Ask-HN-Who-is-hiring-1099f6be204280b7b909c08634441563",
        title: "EXXA — Who is hiring analysis, 2011–2024",
        description:
          "Uses Llama 3.1 70B to extract structured information from hiring comments. Offers a contrasting approach to lexical matching, with extraction accuracy as a separate validation requirement.",
      },
    ],
    notes:
      "Comparison variables: top-level employer comments, thread coverage, language aliases, and monthly comment totals. Monthly mention shares help account for changes in thread volume; ambiguous terms such as Go need explicit matching rules.",
  },
};
