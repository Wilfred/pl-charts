import { collectionOptions, runCollection } from "./runtime.ts";
import { LANGUAGE_PROFILES } from "./languages.ts";
const options = collectionOptions(
  "Count language mentions in official monthly Hacker News hiring threads.",
  true,
);
const fundingPattern = String.raw`(?i)\bseries[ -]+c\b`;
const endpoint = "https://sql-clickhouse.clickhouse.com/";
const literal = (text: string) =>
  "'" + text.replaceAll("\\", "\\\\").replaceAll("'", "\\'") + "'";
await runCollection(
  "hiring",
  "hn-hiring-top-level-aliases-v1",
  options,
  async (context) => {
    const bounds = (await context.query(
      "coverage.json",
      "SELECT max(time) AS cutoff FROM hackernews.hackernews FORMAT JSON",
      endpoint,
      "demo",
    )) as { cutoff: string }[];
    const cutoff = bounds[0]!.cutoff;
    const from = context.options.from ?? 2011,
      to = context.options.to ?? Number(context.runId.slice(0, 4));
    const tests = LANGUAGE_PROFILES.map(
      (language) =>
        `uniqExactIf(c.id,match(clean_text,${literal((language.mentionFlags.includes("i") ? "(?i)" : "") + language.mentionPattern)})) AS ${language.id}`,
    ).join(",\n  ");
    const sql = `SELECT toStartOfMonth(t.thread_time) AS month,uniqExact(c.id) AS comments,groupUniqArray(t.id) AS thread_ids,\n  ${tests}\nFROM (SELECT *,replaceRegexpAll(decodeXMLComponent(extractTextFromHTML(text)),${literal(fundingPattern)},'') AS clean_text FROM hackernews.hackernews) c\nINNER JOIN (SELECT id,min(time) AS thread_time FROM hackernews.hackernews WHERE by='whoishiring' AND type='story' AND startsWith(lower(title),'ask hn: who is hiring?') GROUP BY id) t ON c.parent=t.id\nWHERE c.type='comment' AND c.deleted=0 AND c.dead=0 AND c.time <= '${cutoff}' AND toYear(t.thread_time) BETWEEN ${from} AND ${to}\nGROUP BY month ORDER BY month SETTINGS max_execution_time=60 FORMAT JSON`;
    const result = (await context.query(
      "months.json",
      sql,
      endpoint,
      "demo",
    )) as Record<string, unknown>[];
    if (!result.length) throw new Error("No hiring threads found");
    const observations = [];
    for (const row of result) {
      const date = new Date(String(row.month) + "T00:00:00Z");
      const end = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
      );
      for (const language of LANGUAGE_PROFILES)
        observations.push(
          context.observation(
            "hacker_news.job_descriptions",
            language.name,
            Number(row[language.id]),
            "months.json",
            {
              unit: "comments",
              period_start: date.toISOString(),
              period_end:
                end.toISOString() <
                new Date(cutoff.replace(" ", "T") + "Z").toISOString()
                  ? end.toISOString()
                  : new Date(
                      Date.parse(cutoff.replace(" ", "T") + "Z") + 1000,
                    ).toISOString(),
              source_updated_at: new Date(
                cutoff.replace(" ", "T") + "Z",
              ).toISOString(),
            },
          ),
        );
    }
    context.metadata.cutoff = cutoff;
    context.metadata.threads = result.map((row) => ({
      month: row.month,
      thread_ids: row.thread_ids,
      comments: row.comments,
    }));
    context.metadata.preprocessing =
      "Strip HTML, decode entities, and remove Series C funding phrases.";
    context.metadata.aliases = LANGUAGE_PROFILES.map(
      ({ name, mentionPattern, mentionFlags }) => ({
        name,
        mentionPattern,
        mentionFlags,
      }),
    );
    return observations;
  },
);
