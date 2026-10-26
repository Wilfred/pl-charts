import { collectionOptions, runCollection, yearInterval } from "./runtime.ts";
import { LANGUAGE_PROFILES } from "./languages.ts";
import { parseSurvey, parseSurveyCsv } from "./surveys.ts";
const options = collectionOptions(
  "Collect official annual Stack Overflow language-use results (2013 onward).",
  true,
);
await runCollection(
  "surveys",
  "stackoverflow-survey-all-respondents-v1",
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
      let year = context.options.from ?? 2013;
      year <= (context.options.to ?? Number(context.runId.slice(0, 4)));
      year++
    ) {
      const name = `${year}.${year < 2017 ? "csv" : "json"}`;
      const path = year < 2019 ? "report" : "technology";
      const url =
        year < 2017
          ? `https://media.githubusercontent.com/media/StackExchange/Survey/${revision.sha}/packages/archive/${year}/results.csv`
          : `https://raw.githubusercontent.com/StackExchange/Survey/${revision.sha}/packages/archive/${year}/json/${path}.json`;
      const body = await context.request(name, url);
      const parsed =
        year < 2017 ? parseSurveyCsv(body, year) : parseSurvey(body);
      const numerators: Record<string, number> = {};
      const responses: Record<string, string> = {};
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
          throw new Error("Invalid survey percentage");
        rows.push(
          context.observation(
            "survey.usage",
            language.name,
            Number(row.percent.toFixed(4)),
            name,
            { unit: "percent", ...yearInterval(year) },
          ),
        );
        if (row.frequency !== undefined)
          numerators[language.name] = row.frequency;
        responses[language.name] = row.response;
      }
      details[year] = {
        denominator: parsed.denominator,
        numerators,
        responses,
        definition: parsed.definition,
      };
    }
    context.metadata.years = details;
    context.metadata.revision = revision.sha;
    return rows;
  },
);
