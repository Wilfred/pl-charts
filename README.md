# PL Charts

A static prototype of programming language popularity rankings. Current work covers site structure, design, and interactions. The long-term goal is a reliable source of popularity data.

## Scope

- Display rankings and counts in tables.
- Compare metrics in an overview and provide a detail page for each metric.
- Include GitHub repositories, packages/modules, Stack Overflow questions, annual language releases, and language mentions in Hacker News “Who's Hiring” threads.
- Use placeholder counts to develop the site structure and interactions.
- Support responsive layouts, keyboard navigation, sorting, and release-year selection.
- Use concise, factual descriptions and sentence-case headings.
- Keep the dark interface focused on tables, metric definitions, and navigation.

## Interpretation

Ranks are calculated separately for each metric. Release counts describe release frequency. Hiring counts measure language mentions in Hacker News hiring comments.

A production version should document definitions, sources, observation dates, coverage, limitations, and refresh schedules.

## Development

The site uses HTML, CSS, and JavaScript. No build step is required.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Metric pages: `github-repos.html`, `modules.html`, `stackoverflow.html`, `releases.html`, and `hiring.html`.

## Formatting

Use Node.js 22 and npm. Install the pinned Prettier dependency and enable the commit hook:

```sh
npm ci
```

The `prepare` script configures this clone to use `.githooks`. The pre-commit hook checks staged file contents, including partially staged files, and rejects unformatted changes. It does not modify files or stage changes.

```sh
npm run format
npm run format:check
```

After formatting, stage the files again before committing. GitHub Actions runs the same formatting check on pushes and pull requests when Actions is enabled.
