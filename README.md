# PL Charts

PL Charts is a prototype for a website about programming language popularity, viewed through several different metrics. The long-term aim is a reliable source of popularity data; the current work focuses on the site's structure, design, and usefulness rather than collecting accurate data.

## Prototype goals

- Put **rankings first**. “Charts” means ordered league tables: make language positions and comparisons easy to scan, rather than centering the experience on bar graphs.
- Show different perspectives on popularity without combining them into an unexplained overall score.
- Retain the four existing metrics: GitHub repository counts, annual language release counts, package/module counts, and Stack Overflow question counts. Add a fifth page for language mentions in Hacker News “Who's Hiring” threads, also using placeholder data.
- Provide an overview for comparing rankings across metrics, plus a dedicated page for each metric with its counts and context.
- Use illustrative data to explore the design and interactions. Label it clearly so visitors cannot mistake it for verified or current data.
- Make the site readable, responsive, and accessible, with clear navigation between the overview and metric pages.

## Data and interpretation

All numbers in this prototype are fictional sample data. Accurate collection, source verification, refresh schedules, historical coverage, and a production data pipeline are outside the current scope.

The eventual site should explain what each metric measures, its source, observation date, and limitations. Repository counts, registry sizes, question counts, release frequency, and hiring-thread mentions reflect different things. In particular, release frequency describes a language's release process and is not a direct measure of adoption. Mentions in Hacker News hiring comments are a signal of demand within that community, not a count of jobs or a representative survey of the job market. The prototype should leave room for that context without presenting a universal “most popular” ranking.

## Development

This is a static HTML, CSS, and JavaScript site. No build step is required.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Start at `index.html`; the five metric pages are `github-repos.html`, `releases.html`, `modules.html`, `stackoverflow.html`, and `hiring.html`.
