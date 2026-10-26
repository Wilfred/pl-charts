-- {{KEY}} is repo_name/full_name for exact joins, or lower(...) for a case-folded comparison.
SELECT toYear(e.created_at) AS year, toQuarter(e.created_at) AS quarter,
  multiIf(r.matched = 0, 'missing_repository', r.language = '', 'empty_language', 'known_language') AS reason,
  countIf(e.event_type = 'PushEvent') AS pushes,
  countIf(e.event_type = 'PullRequestEvent' AND e.action = 'opened') AS pull_requests,
  countIf(e.event_type = 'PushEvent' AND positionCaseInsensitive(e.actor_login, 'bot') > 0) AS bot_named_pushes
FROM github_events e
LEFT JOIN (
  SELECT lower(full_name) AS repo_key, argMax(language, tuple(snapshot_at, language)) AS language, toUInt8(1) AS matched
  FROM (
    SELECT full_name, language, updated_at AS snapshot_at FROM repos
    UNION ALL
    SELECT full_name, language, time AS snapshot_at FROM github_repos_history
  ) WHERE snapshot_at < '2026-10-26 19:00:00' GROUP BY repo_key
) r ON lower(e.repo_name) = r.repo_key
WHERE (e.event_type = 'PushEvent' OR (e.event_type = 'PullRequestEvent' AND e.action = 'opened'))
  AND e.created_at >= '2024-01-01' AND e.created_at < '2026-10-26 19:00:00' AND e.file_time < '2026-10-26 19:00:00'
GROUP BY year, quarter, reason ORDER BY year, quarter, reason
SETTINGS max_execution_time = 60, max_memory_usage = 20000000000
FORMAT JSON
