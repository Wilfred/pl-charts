-- UTC half-open intervals; repository language is the latest known at the cutoff.
SELECT toYear(e.created_at) AS year, toQuarter(e.created_at) AS quarter,
  if(r.language = '', 'Unknown', r.language) AS name,
  countIf(e.event_type = 'PushEvent') AS pushes,
  countIf(e.event_type = 'PullRequestEvent' AND e.action = 'opened') AS pull_requests
FROM github_events e
LEFT JOIN (
  SELECT full_name, argMax(language, tuple(snapshot_at, language)) AS language
  FROM (
    SELECT full_name, language, updated_at AS snapshot_at FROM repos
    UNION ALL
    SELECT full_name, language, time AS snapshot_at FROM github_repos_history
  ) WHERE snapshot_at < '2026-10-26 19:00:00' GROUP BY full_name
) r ON e.repo_name = r.full_name
WHERE e.event_type IN ('PushEvent', 'PullRequestEvent')
  AND e.created_at < '2026-10-26 19:00:00' AND e.file_time < '2026-10-26 19:00:00'
GROUP BY year, quarter, name ORDER BY year, quarter, name
SETTINGS max_execution_time = 60, max_memory_usage = 20000000000
FORMAT JSON
