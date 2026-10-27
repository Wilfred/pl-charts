import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { CATEGORIES } from "./src/categories.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = fileURLToPath(new URL("src/", import.meta.url));
const dataRoot = fileURLToPath(new URL("../data/", import.meta.url));
const exportRoot = fileURLToPath(new URL("../data/exports/", import.meta.url));

function renderPages(): void {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/render.tsx"], {
    cwd: root,
    stdio: "inherit",
  });
}

function staticPages(): Plugin {
  return {
    name: "static-jsx-pages",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: readFileSync(new URL("robots.txt", import.meta.url), "utf8"),
      });
    },
    configureServer(server) {
      renderPages();
      server.watcher.add([
        exportRoot,
        fileURLToPath(new URL("../data/languages.json", import.meta.url)),
        fileURLToPath(
          new URL("../data/package-services.json", import.meta.url),
        ),
      ]);
      let pending: ReturnType<typeof setTimeout> | undefined;
      const onChange = (file: string): void => {
        if (
          !(file.startsWith(sourceRoot) && /\.tsx?$/.test(file)) &&
          !(file.startsWith(exportRoot) && file.endsWith(".csv")) &&
          file !== dataRoot + "languages.json" &&
          file !== dataRoot + "package-services.json" &&
          file !== dataRoot + "implementations.json"
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
