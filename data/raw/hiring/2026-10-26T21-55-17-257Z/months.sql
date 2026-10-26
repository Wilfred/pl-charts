SELECT toStartOfMonth(t.thread_time) AS month,uniqExact(c.id) AS comments,groupUniqArray(t.id) AS thread_ids,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bpython\\b')) AS py,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bjava\\b')) AS java,
  uniqExactIf(c.id,match(clean_text,'(?:\\b[Gg]olang\\b|\\bGo(?:$|[,/|.)]|\\s+(?:engineer|developer|backend|language|experience|programming)))')) AS go,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bjavascript\\b')) AS js,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bc\\+\\+(?:$|[^+])')) AS cpp,
  uniqExactIf(c.id,match(clean_text,'(?i)\\btypescript\\b')) AS ts,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bphp\\b')) AS php,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bruby\\b')) AS ruby,
  uniqExactIf(c.id,match(clean_text,'(^|[^A-Za-z0-9_])C(?:$|[,/|.)]|\\s+(?:programming|language|code|developer|engineer))')) AS c,
  uniqExactIf(c.id,match(clean_text,'(?i)\\b(?:c#|csharp)(?:$|\\W)')) AS csharp,
  uniqExactIf(c.id,match(clean_text,'(?i)\\b(?:nix|nixos)\\b')) AS nix,
  uniqExactIf(c.id,match(clean_text,'(?i)\\b(?:bash|shell)\\b')) AS shell,
  uniqExactIf(c.id,match(clean_text,'(?i)\\brust\\b')) AS rust,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bscala\\b')) AS scala,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bkotlin\\b')) AS kotlin,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bswift\\b')) AS swift,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bdart\\b')) AS dart,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bgroovy\\b')) AS groovy,
  uniqExactIf(c.id,match(clean_text,'(?i)\\bperl\\b')) AS perl,
  uniqExactIf(c.id,match(clean_text,'(?i)\\blua\\b')) AS lua
FROM (SELECT *,replaceRegexpAll(decodeXMLComponent(extractTextFromHTML(text)),'(?i)\\bseries[ -]+c\\b','') AS clean_text FROM hackernews.hackernews) c
INNER JOIN (SELECT id,min(time) AS thread_time FROM hackernews.hackernews WHERE by='whoishiring' AND type='story' AND startsWith(lower(title),'ask hn: who is hiring?') GROUP BY id) t ON c.parent=t.id
WHERE c.type='comment' AND c.deleted=0 AND c.dead=0 AND c.time <= '2026-10-26 21:00:22' AND toYear(t.thread_time) BETWEEN 2011 AND 2026
GROUP BY month ORDER BY month SETTINGS max_execution_time=60 FORMAT JSON
