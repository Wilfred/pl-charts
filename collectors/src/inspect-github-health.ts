import { collectionOptions, runCollection } from "./runtime.ts";
const options = collectionOptions(
  "Audit monthly GitHub archive event volume, actions, and hourly-file coverage.",
  true,
);
await runCollection(
  "github-health",
  "gharchive-monthly-capture-audit-v1",
  options,
  async (context) => {
    const bounds = (await context.query(
      "coverage.json",
      "SELECT max(file_time) AS last_file FROM github_events FORMAT JSON",
    )) as { last_file: string }[];
    const cutoff = new Date(
      Date.parse(bounds[0]!.last_file.replace(" ", "T") + "Z") + 3600000,
    ).toISOString();
    const sqlCutoff = cutoff.slice(0, 19).replace("T", " ");
    const from = context.options.from ?? 2023,
      to = context.options.to ?? Number(context.runId.slice(0, 4));
    const counts = (await context.query(
      "months.json",
      `SELECT toStartOfMonth(created_at) AS month,countIf(event_type='PushEvent') AS pushes,countIf(event_type='PullRequestEvent') AS pull_request_events,countIf(event_type='PullRequestEvent' AND action='opened') AS opened_pull_requests,countIf(event_type='PullRequestEvent' AND action='none') AS missing_pr_actions FROM github_events WHERE event_type IN ('PushEvent','PullRequestEvent') AND toYear(created_at) BETWEEN ${from} AND ${to} AND created_at<'${sqlCutoff}' AND file_time<'${sqlCutoff}' GROUP BY month ORDER BY month SETTINGS max_execution_time=60 FORMAT JSON`,
    )) as Record<string, unknown>[];
    const files = (await context.query(
      "files.json",
      `SELECT toStartOfMonth(file_time) AS month,uniqExact(file_time) AS recorded_hours FROM github_events WHERE toYear(file_time) BETWEEN ${from} AND ${to} AND file_time<'${sqlCutoff}' GROUP BY month ORDER BY month SETTINGS max_execution_time=60 FORMAT JSON`,
    )) as Record<string, unknown>[];
    context.metadata.cutoff = cutoff;
    const observations = [];
    for (const row of counts) {
      const start = new Date(String(row.month) + "T00:00:00Z"),
        end = new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
        );
      const interval = {
        period_start: start.toISOString(),
        period_end: end.toISOString() < cutoff ? end.toISOString() : cutoff,
      };
      for (const field of [
        "pushes",
        "pull_request_events",
        "opened_pull_requests",
        "missing_pr_actions",
      ])
        observations.push(
          context.observation(
            `github.archive.${field}`,
            "All repositories",
            Number(row[field]),
            "months.json",
            { entity_kind: "archive", unit: "events", ...interval },
          ),
        );
      const file = files.find((file) => file.month === row.month);
      if (file)
        observations.push(
          context.observation(
            "github.archive.recorded_hours",
            "All repositories",
            Number(file.recorded_hours),
            "files.json",
            { entity_kind: "archive", unit: "hours", ...interval },
          ),
        );
    }
    return observations;
  },
);
