SELECT min(CreationDate) AS first,max(CreationDate) AS last,count() AS rows FROM stackoverflow.posts FORMAT JSON
