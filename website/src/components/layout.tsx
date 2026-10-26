import type { ReactNode } from "react";
import { CATEGORIES } from "../data.ts";

function Header({ active }: { active: string }) {
  return (
    <header>
      <div className="header-inner">
        <a className="site-title" href="index.html">
          <span className="brand-mark" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              focusable="false"
            >
              <path d="M3 4h18v3H3zM3 10h13v3H3zM3 16h8v3H3z" />
            </svg>
          </span>
          PL Charts
        </a>
        <nav aria-label="Main navigation">
          <a
            href="index.html"
            aria-current={active === "overview" ? "page" : undefined}
          >
            Overview
          </a>
          {CATEGORIES.map((category) => (
            <a
              key={category.id}
              href={category.href}
              aria-current={active === category.id ? "page" : undefined}
            >
              {category.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function PageDocument({
  title,
  active,
  children,
}: {
  title: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Programming language rankings by GitHub activity, packages, Stack Overflow activity and surveys, releases, and hiring mentions."
        />
        <title>{`${title} · PL Charts`}</title>
        <link rel="stylesheet" href="css/style.css" />
        <script type="module" src="src/main.ts" />
      </head>
      <body data-page={active}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header active={active} />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
