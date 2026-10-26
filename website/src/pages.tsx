import { renderToStaticMarkup } from "react-dom/server";
import { CATEGORIES } from "./data.ts";
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
  return (
    "<!doctype html>\n" +
    renderToStaticMarkup(
      <PageDocument title={category.label} active={category.id}>
        <section className="detail-intro">
          <h1>{category.label}</h1>
        </section>
        {category.metrics.map((metric) => (
          <MetricSection key={metric} metric={metric} />
        ))}
        <CategoryReferences category={category} />
      </PageDocument>,
    )
  );
}
