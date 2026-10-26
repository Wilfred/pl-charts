import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const pages = [
  "index",
  "github-repos",
  "packages",
  "stackoverflow",
  "surveys",
  "releases",
  "hiring",
];

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: Object.fromEntries(
        pages.map((page) => [
          page,
          fileURLToPath(new URL(`${page}.html`, import.meta.url)),
        ]),
      ),
    },
  },
});
