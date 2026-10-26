import { LANGUAGE_SELECTION } from "./languages.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { CATEGORIES, METRIC_INFO } from "./data.ts";
import { PageDocument } from "./components/layout.tsx";
import { Comparison, MetricSection } from "./components/rankings.tsx";
import { CategoryReferences } from "./components/references.tsx";

export const PAGE_PATHS = [
  "index.html",
  ...CATEGORIES.map((category) => category.href),
];

export function renderPage(path: string): string {
  if (path === "index.html") {
    return (
      "<!doctype html>\n" +
      renderToStaticMarkup(
        <PageDocument title="Rankings" active="overview">
          <section className="intro">
            <h1>Rankings</h1>
            <p className="section-description">
              20 languages from GitHut 2.0’s{" "}
              {LANGUAGE_SELECTION.period.replace("-Q", " Q")} pull-request
              ranking.
            </p>
          </section>
          <section className="categories">
            <h2>Categories</h2>
            <div className="metric-grid">
              {CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  className="metric-card"
                  href={category.href}
                >
                  <h3>
                    {category.label}
                    <span aria-hidden="true">↗</span>
                  </h3>
                  <p>{category.description}</p>
                </a>
              ))}
            </div>
          </section>
          <Comparison />
        </PageDocument>,
      )
    );
  }
  const category = CATEGORIES.find((category) => category.href === path);
  if (!category) throw new Error(`Unknown page: ${path}`);
  const note = METRIC_INFO[category.metrics[0]].note;
  const commonNote =
    category.metrics.length > 1 &&
    category.metrics.every((metric) => METRIC_INFO[metric].note === note)
      ? note
      : undefined;
  return (
    "<!doctype html>\n" +
    renderToStaticMarkup(
      <PageDocument title={category.label} active={category.id}>
        <section className="detail-intro">
          <h1>{category.label}</h1>
          {commonNote && <p className="section-description">{commonNote}</p>}
        </section>
        {category.metrics.map((metric) => (
          <MetricSection key={metric} metric={metric} showNote={!commonNote} />
        ))}
        <CategoryReferences category={category} />
      </PageDocument>,
    )
  );
}
