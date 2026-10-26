import { execFileSync } from "node:child_process";
let token: string | undefined;
let checked = false;
export function githubHeaders(url: string): Record<string, string> {
  if (new URL(url).hostname !== "api.github.com") return {};
  if (!checked) {
    checked = true;
    token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      try {
        token = execFileSync("gh", ["auth", "token"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      } catch {
        /* Public requests work without authentication until the source quota is reached. */
      }
    }
  }
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
