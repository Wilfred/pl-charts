import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { CATEGORIES } from "./src/categories.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = fileURLToPath(new URL("src/", import.meta.url));
const githubCsv = fileURLToPath(
  new URL("../data/exports/github.csv", import.meta.url),
);
const packageCsv = fileURLToPath(
  new URL("../data/exports/packages.csv", import.meta.url),
);

function renderPages(): void {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/render.tsx"], {
    cwd: root,
    stdio: "inherit",
  });
}

function staticPages(): Plugin {
  return {
    name: "static-jsx-pages",
    configureServer(server) {
      renderPages();
      server.watcher.add([packageCsv, githubCsv]);
      let pending: ReturnType<typeof setTimeout> | undefined;
      const onChange = (file: string): void => {
        if (
          !(file.startsWith(sourceRoot) && /\.tsx?$/.test(file)) &&
          file !== packageCsv &&
          file !== githubCsv
        )
          return;
        clearTimeout(pending);
        pending = setTimeout(() => {
          try {
            renderPages();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            server.config.logger.error(message);
            server.ws.send({
              type: "error",
              err: { message, stack: "", plugin: "static-jsx-pages" },
            });
          }
        }, 100);
      };
      server.watcher.on("change", onChange);
      server.httpServer?.once("close", () => {
        clearTimeout(pending);
        server.watcher.off("change", onChange);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  publicDir: "../data/exports",
  plugins: [staticPages()],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(
        ["index.html", ...CATEGORIES.map((category) => category.href)].map(
          (page) => [page, fileURLToPath(new URL(page, import.meta.url))],
        ),
      ),
    },
  },
});
