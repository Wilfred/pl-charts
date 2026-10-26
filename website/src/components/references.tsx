import type { Category } from "../data.ts";
import { REFERENCES } from "../references.ts";

export function CategoryReferences({ category }: { category: Category }) {
  const content = REFERENCES[category.id];
  return (
    <>
      {content.preliminaryAnalysis && (
        <section className="metric-context">
          <h2>Preliminary analysis</h2>
          <p>{content.preliminaryAnalysis}</p>
        </section>
      )}
      <section className="references" aria-labelledby="references-heading">
        <h2 id="references-heading">References</h2>
        <ul>
          {content.items.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.title}</a>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
        <p className="reference-notes">{content.notes}</p>
      </section>
    </>
  );
}
