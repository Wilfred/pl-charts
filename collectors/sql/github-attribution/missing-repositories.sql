SELECT repo_name, count() AS pushes, uniqExact(actor_login) AS actors,
  countIf(positionCaseInsensitive(actor_login, 'bot') > 0) AS bot_named_pushes
FROM github_events
WHERE event_type = 'PushEvent' AND created_at >= '2026-07-01' AND created_at < '2026-10-01'
  AND file_time < '{{CUTOFF}}'
  AND repo_name NOT IN (
    SELECT full_name FROM repos WHERE updated_at < '{{CUTOFF}}'
    UNION ALL SELECT full_name FROM github_repos_history WHERE time < '{{CUTOFF}}'
  )
GROUP BY repo_name ORDER BY pushes DESC LIMIT 20
SETTINGS max_execution_time = 60, max_memory_usage = 20000000000
FORMAT JSON
