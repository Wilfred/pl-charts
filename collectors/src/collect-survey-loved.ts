import { collectionOptions, runCollection, yearInterval } from "./runtime.ts";
import { LANGUAGE_PROFILES } from "./languages.ts";
import { parseSurveyLoved } from "./surveys.ts";
const options = collectionOptions(
  "Collect official Most Loved/Admired language results (2015 onward).",
  true,
);
await runCollection(
  "survey-loved",
  "stackoverflow-survey-language-retention-v1",
  options,
  async (context) => {
    const revision = JSON.parse(
      await context.request(
        "revision.json",
        "https://api.github.com/repos/StackExchange/Survey/commits/main",
      ),
    ) as { sha: string };
    const rows = [];
    const details: Record<string, unknown> = {};
    for (
      let year = context.options.from ?? 2015;
      year <= (context.options.to ?? Number(context.runId.slice(0, 4)));
      year++
    ) {
      if (year < 2015) throw new Error("Most Loved results start in 2015");
      const name = `${year}.${year < 2017 ? "html" : "json"}`;
      const path = year < 2019 ? "report" : "technology";
      const url =
        year < 2017
          ? `https://media.githubusercontent.com/media/StackExchange/Survey/${revision.sha}/packages/archive/${year}/site/index.html`
          : `https://raw.githubusercontent.com/StackExchange/Survey/${revision.sha}/packages/archive/${year}/json/${path}.json`;
      const parsed = parseSurveyLoved(await context.request(name, url), year);
      const measurements: Record<string, unknown> = {};
      for (const language of LANGUAGE_PROFILES) {
        const row = parsed.data.find((row) =>
          language.surveyAliases.some(
            (alias) => alias.toLowerCase() === row.response.toLowerCase(),
          ),
        );
        if (!row) continue;
        if (
          !Number.isFinite(row.percent) ||
          row.percent < 0 ||
          row.percent > 100
        )
          throw new Error("Invalid Loved percentage");
        rows.push(
          context.observation(
            "survey.most_loved",
            language.name,
            Number(row.percent.toFixed(4)),
            name,
            { unit: "percent", ...yearInterval(year) },
          ),
        );
        measurements[language.name] = row;
      }
      details[year] = { definition: parsed.definition, measurements };
    }
    context.metadata.years = details;
    context.metadata.revision = revision.sha;
    return rows;
  },
);
