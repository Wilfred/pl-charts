SELECT min(created_at) AS first_event, max(created_at) AS last_event,
  max(file_time) AS last_file FROM github_events FORMAT JSON
