import type { CollectionContext } from "./runtime.ts";
export interface ReleaseEvent {
  version: string;
  date: string;
  source: string;
}
export async function githubReleases(
  context: CollectionContext,
  repository: string,
): Promise<ReleaseEvent[]> {
  const [owner, name] = repository.split("/");
  const result: ReleaseEvent[] = [];
  let after: string | null = null;
  for (let page = 1; page <= 100; page++) {
    const query =
      "query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){releases(first:100,after:$after,orderBy:{field:CREATED_AT,direction:DESC}){totalCount nodes{tagName publishedAt isPrerelease isDraft url} pageInfo{endCursor hasNextPage}}}}";
    const path = `${owner}-${name}-${page}.json`;
    const body = await context.request(path, "https://api.github.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { owner, name, after } }),
    });
    interface Page {
      errors?: unknown[];
      data: {
        repository: {
          releases: {
            totalCount: number;
            nodes: {
              tagName: string;
              publishedAt: string | null;
              isPrerelease: boolean;
              isDraft: boolean;
              url: string;
            }[];
            pageInfo: { endCursor: string; hasNextPage: boolean };
          } | null;
        };
      };
    }
    const parsed = JSON.parse(body) as Page;
    if (parsed.errors?.length || !parsed.data.repository?.releases)
      throw new Error(
        `Release API failed for ${repository}: ${JSON.stringify(parsed.errors)}`,
      );
    const releases = parsed.data.repository.releases;
    for (const row of releases.nodes)
      if (
        !row.isPrerelease &&
        !row.isDraft &&
        row.publishedAt &&
        !/(?:alpha|beta|preview|nightly|[._-]rc\d*|[._-]m\d+|[._-]dev)/i.test(
          row.tagName,
        )
      )
        result.push({
          version: row.tagName,
          date: row.publishedAt,
          source: path,
        });
    if (!releases.pageInfo.hasNextPage) return result;
    after = releases.pageInfo.endCursor;
  }
  throw new Error(
    `Release pagination exceeded its safety bound for ${repository}`,
  );
}
export function htmlReleases(
  body: string,
  pattern: RegExp,
  source: string,
  versionIndex = 1,
  dateIndex = 2,
): ReleaseEvent[] {
  return [...body.matchAll(pattern)].map((match) => ({
    version: match[versionIndex]!,
    date: new Date(
      match[dateIndex]!.trim() +
        (/\d{4}-\d{2}-\d{2}/.test(match[dateIndex]!) ? "T00:00:00Z" : " UTC"),
    ).toISOString(),
    source,
  }));
}

export async function githubTags(
  context: CollectionContext,
  repository: string,
): Promise<ReleaseEvent[]> {
  const [owner, name] = repository.split("/");
  const events: ReleaseEvent[] = [];
  let after: string | null = null;
  for (let page = 1; page <= 100; page++) {
    const query =
      'query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){refs(refPrefix:"refs/tags/",first:100,after:$after,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name target{__typename ... on Tag{tagger{date}} ... on Commit{committedDate}}} pageInfo{endCursor hasNextPage}}}}';
    const source = `${owner}-${name}-tags-${page}.json`;
    const parsed = JSON.parse(
      await context.request(source, "https://api.github.com/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { owner, name, after } }),
      }),
    ) as {
      errors?: unknown[];
      data: {
        repository: {
          refs: {
            nodes: {
              name: string;
              target: {
                __typename: string;
                tagger?: { date: string };
                committedDate?: string;
              };
            }[];
            pageInfo: { endCursor: string; hasNextPage: boolean };
          };
        };
      };
    };
    if (parsed.errors?.length)
      throw new Error(`Tag API failed: ${JSON.stringify(parsed.errors)}`);
    for (const node of parsed.data.repository.refs.nodes)
      if (/^\d+(?:\.\d+){1,2}$/.test(node.name)) {
        if (!node.target.tagger?.date && !node.target.committedDate)
          throw new Error(
            `Stable tag has no publication timestamp: ${repository}/${node.name}`,
          );
        events.push({
          version: node.name,
          date: node.target.tagger?.date ?? node.target.committedDate!,
          source,
        });
      }
    if (!parsed.data.repository.refs.pageInfo.hasNextPage) return events;
    after = parsed.data.repository.refs.pageInfo.endCursor;
  }
  throw new Error("Tag pagination exceeded its safety bound");
}

export function dartReleases(body: string, source: string): ReleaseEvent[] {
  const events: ReleaseEvent[] = [];
  for (const match of body.matchAll(/^## (\S+)([^\n]*)\n/gm)) {
    if (!/^\d+(?:\.\d+){1,2}$/.test(match[1]!)) continue;
    const headerDate = match[2]!.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const following = body.slice(match.index! + match[0].length);
    const date =
      headerDate ??
      following.match(/^\s*\*\*Released on:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    if (date)
      events.push({ version: match[1]!, date: date + "T00:00:00Z", source });
  }
  return events;
}
