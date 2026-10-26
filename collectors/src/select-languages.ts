import { collectionOptions, runCollection } from "./runtime.ts";
import { LANGUAGE_MODEL, LANGUAGE_PROFILES } from "./languages.ts";
const revision = LANGUAGE_MODEL.selection.revision;
const options = collectionOptions(
  "Verify the reviewed GitHut 2.0 top 20 and retain its source ranking.",
);
await runCollection(
  "language-selection",
  "githut-top20-pull-requests-v1",
  options,
  async (context) => {
    const base = `https://raw.githubusercontent.com/madnight/githut/${revision}`;
    const rows = JSON.parse(
      await context.request(
        "pull-requests.json",
        `${base}/src/data/gh-pull-request.json`,
      ),
    ) as { name: string; year: string; quarter: string; count: string }[];
    const source = await context.request(
      "excluded-languages.js",
      `${base}/src/common/NoLanguages.js`,
    );
    const excluded = JSON.parse(
      source.slice(source.indexOf("[", source.indexOf("export default"))),
    ) as string[];
    const latest = rows
      .map((row) => `${row.year}-Q${row.quarter}`)
      .sort()
      .at(-1)!;
    const selected = rows
      .filter(
        (row) =>
          `${row.year}-Q${row.quarter}` === latest &&
          !excluded.includes(row.name),
      )
      .sort((a, b) => Number(b.count) - Number(a.count))
      .slice(0, 20);
    if (
      latest !== LANGUAGE_MODEL.selection.period ||
      JSON.stringify(selected.map((row) => row.name)) !==
        JSON.stringify(LANGUAGE_PROFILES.map((row) => row.name))
    )
      throw new Error(
        "The source ranking differs from the reviewed language profiles",
      );
    context.metadata.selection = LANGUAGE_MODEL.selection;
    return selected.map((row) =>
      context.observation(
        "languages.selection",
        row.name,
        Number(row.count),
        "pull-requests.json",
        { unit: "events" },
      ),
    );
  },
);
