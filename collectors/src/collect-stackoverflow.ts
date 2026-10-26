import { collectionOptions, runCollection } from "./runtime.ts";
import { LANGUAGE_PROFILES } from "./languages.ts";
const options = collectionOptions(
  "Collect quarterly Stack Overflow questions and answers from the public post snapshot.",
  true,
);
const endpoint = "https://sql-clickhouse.clickhouse.com/";
await runCollection(
  "stackoverflow",
  "stackoverflow-post-creation-parent-tags-v1",
  options,
  async (context) => {
    const from = context.options.from ?? 2008,
      to = context.options.to ?? Number(context.runId.slice(0, 4));
    const tags = LANGUAGE_PROFILES.map(
      (language) => `'${language.stackoverflowTag}'`,
    ).join(",");
    const bounds = (await context.query(
      "coverage.json",
      "SELECT min(CreationDate) AS first,max(CreationDate) AS last,count() AS rows FROM stackoverflow.posts FORMAT JSON",
      endpoint,
      "demo",
    )) as { first: string; last: string }[];
    const questionSql = `SELECT arrayJoin(arrayFilter(tag -> tag IN (${tags}),splitByChar('|',Tags))) AS tag,toYear(CreationDate) AS year,toQuarter(CreationDate) AS quarter,count() AS count FROM stackoverflow.posts WHERE PostTypeId='Question' AND toYear(CreationDate) BETWEEN ${from} AND ${to} GROUP BY tag,year,quarter ORDER BY year,quarter,tag SETTINGS max_execution_time=60 FORMAT JSON`;
    const answerSql = `SELECT tag,toYear(a.CreationDate) AS year,toQuarter(a.CreationDate) AS quarter,count() AS count FROM stackoverflow.posts a INNER JOIN (SELECT Id,arrayFilter(tag -> tag IN (${tags}),splitByChar('|',Tags)) AS langs FROM stackoverflow.posts WHERE PostTypeId='Question' AND notEmpty(langs)) q ON toInt32OrZero(a.ParentId)=q.Id ARRAY JOIN q.langs AS tag WHERE a.PostTypeId='Answer' AND toYear(a.CreationDate) BETWEEN ${from} AND ${to} GROUP BY tag,year,quarter ORDER BY year,quarter,tag SETTINGS max_execution_time=60,max_memory_usage=28000000000 FORMAT JSON`;
    const rows = [];
    for (const [metric, name, sql] of [
      ["stackoverflow.questions", "questions.json", questionSql],
      ["stackoverflow.answers", "answers.json", answerSql],
    ] as const) {
      const result = (await context.query(name, sql, endpoint, "demo")) as {
        tag: string;
        year: number;
        quarter: number;
        count: number;
      }[];
      if (!result.length) throw new Error("No Stack Overflow observations");
      const periods = [
        ...new Set(result.map((row) => `${row.year}-Q${row.quarter}`)),
      ].sort();
      for (const period of periods) {
        const [year, quarter] = period.split("-Q").map(Number);
        for (const language of LANGUAGE_PROFILES) {
          const row = result.find(
            (row) =>
              row.year === year &&
              row.quarter === quarter &&
              row.tag === language.stackoverflowTag,
          );
          rows.push(
            context.observation(
              metric,
              language.name,
              Number(row?.count ?? 0),
              name,
              {
                unit: "posts",
                period_start: new Date(
                  Date.UTC(year!, (quarter! - 1) * 3, 1),
                ).toISOString(),
                period_end: new Date(
                  Date.UTC(year!, quarter! * 3, 1),
                ).toISOString(),
                source_updated_at: new Date(
                  bounds[0]!.last.replace(" ", "T") + "Z",
                ).toISOString(),
              },
            ),
          );
        }
      }
    }
    context.metadata.snapshot = bounds[0];
    context.metadata.tags = Object.fromEntries(
      LANGUAGE_PROFILES.map((language) => [
        language.name,
        language.stackoverflowTag,
      ]),
    );
    return rows;
  },
);
