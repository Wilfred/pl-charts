SELECT 'repos' AS source, count() AS rows, uniqExact(full_name) AS repositories,
  min(updated_at) AS first_snapshot, max(updated_at) AS last_snapshot,
  uniqExactIf(full_name, language != '') AS repositories_with_language
FROM repos
UNION ALL
SELECT 'github_repos_history' AS source, count() AS rows, uniqExact(full_name) AS repositories,
  min(time) AS first_snapshot, max(time) AS last_snapshot,
  uniqExactIf(full_name, language != '') AS repositories_with_language
FROM github_repos_history
FORMAT JSON
