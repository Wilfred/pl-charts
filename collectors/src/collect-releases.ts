import { collectionOptions, runCollection, yearInterval } from "./runtime.ts";
import { LANGUAGE_PROFILES } from "./languages.ts";
import {
  githubReleases,
  githubTags,
  htmlReleases,
  dartReleases,
  type ReleaseEvent,
} from "./release-sources.ts";
const options = collectionOptions(
  "Collect dated stable implementation releases from official publication histories.",
  true,
);
await runCollection(
  "releases",
  "official-stable-implementation-publications-v1",
  options,
  async (context) => {
    const all: Record<
      string,
      { implementation: string; dateBasis: string; events: ReleaseEvent[] }
    > = {};
    const add = (
      language: string,
      implementation: string,
      dateBasis: string,
      events: ReleaseEvent[],
    ) => {
      if (!events.length) throw new Error(`No stable releases for ${language}`);
      all[language] = { implementation, dateBasis, events };
    };
    const get = async (name: string, url: string) => context.request(name, url);
    const python = JSON.parse(
      await get(
        "python.json",
        "https://www.python.org/api/v2/downloads/release/?is_published=true&limit=0",
      ),
    ) as {
      name: string;
      release_date: string;
      pre_release: boolean;
      is_published: boolean;
    }[];
    add(
      "Python",
      "CPython",
      "Official release date",
      python
        .filter((row) => row.is_published && !row.pre_release)
        .map((row) => ({
          version: row.name,
          date: row.release_date,
          source: "python.json",
        })),
    );
    const gcc = htmlReleases(
      await get("gcc.html", "https://gcc.gnu.org/releases.html"),
      /GCC (\d+(?:\.\d+){1,2})<\/a><\/td>\s*<td>([A-Za-z]+ \d{1,2}, \d{4})/g,
      "gcc.html",
    );
    for (const language of ["C", "C++"])
      add(language, "GCC", "Official release date", gcc);
    add(
      "Go",
      "Go toolchain",
      "Official release date",
      htmlReleases(
        await get("go.html", "https://go.dev/doc/devel/release"),
        /\bgo(\d+(?:\.\d+){1,2})\s*\(released (\d{4}-\d{2}-\d{2})\)/g,
        "go.html",
      ),
    );
    add(
      "Ruby",
      "CRuby",
      "Official release date",
      htmlReleases(
        await get(
          "ruby.html",
          "https://www.ruby-lang.org/en/downloads/releases/",
        ),
        /<td>Ruby (\d+(?:\.\d+){1,2}(?:-p\d+)?)<\/td>\s*<td>(\d{4}-\d{2}-\d{2})<\/td>/g,
        "ruby.html",
      ),
    );
    add(
      "Lua",
      "Lua",
      "Official source archive date",
      htmlReleases(
        await get("lua.html", "https://www.lua.org/ftp/"),
        /HREF="lua-(\d+(?:\.\d+){1,2})\.tar\.gz">[^<]*<\/A><\/TD>\s*<TD CLASS="date">(\d{4}-\d{2}-\d{2})/g,
        "lua.html",
      ),
    );
    const bashRoot = await get("bash.html", "https://ftp.gnu.org/gnu/bash/");
    const bashEvents = htmlReleases(
      bashRoot,
      /href="bash-(\d+(?:\.\d+)+(?:[a-z])?)\.tar\.gz">[^<]*<\/a><\/td><td[^>]*>(\d{4}-\d{2}-\d{2})/g,
      "bash.html",
    );
    for (const match of bashRoot.matchAll(
      /href="(bash-(\d+(?:\.\d+)+(?:[a-z])?)-patches\/)"/g,
    )) {
      const directory = match[1]!,
        base = match[2]!,
        path = `bash-${base}-patches.html`;
      const body = await get(path, `https://ftp.gnu.org/gnu/bash/${directory}`);
      for (const patch of body.matchAll(
        /href="bash[0-9a-z]+-(\d+)">[^<]*<\/a><\/td><td[^>]*>(\d{4}-\d{2}-\d{2})/g,
      ))
        bashEvents.push({
          version: `${base}.${Number(patch[1])}`,
          date: patch[2] + "T00:00:00Z",
          source: path,
        });
    }
    add(
      "Shell",
      "GNU Bash source archives and numbered patches",
      "Source archive or patch modification date",
      bashEvents,
    );
    const perl = JSON.parse(
      await get(
        "perl.json",
        "https://fastapi.metacpan.org/v1/release/_search?q=distribution:perl%20AND%20maturity:released&size=1000&_source=name,version,date,maturity,distribution",
      ),
    ) as {
      hits: {
        total: number;
        hits: { _source: { name: string; date: string; maturity: string } }[];
      };
    };
    if (perl.hits.total > perl.hits.hits.length)
      throw new Error("Perl release response is truncated");
    add(
      "Perl",
      "Perl 5",
      "CPAN publication timestamp",
      perl.hits.hits
        .filter((row) => row._source.maturity === "released")
        .map(({ _source: row }) => ({
          version: row.name,
          date: row.date.endsWith("Z") ? row.date : row.date + "Z",
          source: "perl.json",
        })),
    );
    const dart = await get(
      "dart.md",
      "https://raw.githubusercontent.com/dart-lang/sdk/main/CHANGELOG.md",
    );
    const dartEvents = dartReleases(dart, "dart.md");
    add("Dart", "Dart SDK", "Dated stable changelog entry", dartEvents);
    const phpOld = await get(
      "php-old.inc",
      "https://raw.githubusercontent.com/php/web-php/master/include/releases.inc",
    );
    const php = htmlReleases(
      phpOld,
      /'(\d+\.\d+\.\d+)'\s*=>\s*array\s*\([\s\S]*?'date'\s*=>\s*'([^']+)'/g,
      "php-old.inc",
    );
    const latestMajor = Math.max(
      ...php.map((row) => Number(row.version.split(".")[0])),
    );
    const latestMinor = Math.max(
      ...php
        .filter((row) => row.version.startsWith(`${latestMajor}.`))
        .map((row) => Number(row.version.split(".")[1])),
    );
    for (let minor = 0; minor <= latestMinor; minor++) {
      const path = `php-${latestMajor}-${minor}.json`;
      const body = JSON.parse(
        await get(
          path,
          `https://www.php.net/releases/?json&version=${latestMajor}.${minor}`,
        ),
      ) as { version: string; date: string };
      if (!body.version || !body.date)
        throw new Error(`Invalid PHP branch release: ${latestMajor}.${minor}`);
      php.push({
        version: body.version,
        date: new Date(body.date + " UTC").toISOString(),
        source: path,
      });
    }
    add("PHP", "PHP", "Official release date", php);
    const groovy = JSON.parse(
      await get(
        "groovy.json",
        "https://issues.apache.org/jira/rest/api/2/project/GROOVY/versions",
      ),
    ) as { name: string; releaseDate?: string; released: boolean }[];
    add(
      "Groovy",
      "Apache Groovy",
      "Official issue-tracker release date",
      groovy
        .filter(
          (row) =>
            row.released &&
            row.releaseDate &&
            /^\d+\.\d+(?:\.\d+)?$/.test(row.name),
        )
        .map((row) => ({
          version:
            row.name.split(".").length === 2 ? row.name + ".0" : row.name,
          date: row.releaseDate! + "T00:00:00Z",
          source: "groovy.json",
        })),
    );
    const node = JSON.parse(
      await get("node.json", "https://nodejs.org/dist/index.json"),
    ) as { version: string; date: string }[];
    add(
      "JavaScript",
      "Node.js",
      "Official distribution-index date",
      node
        .filter(
          (row) =>
            !/^v0\.\d+\./.test(row.version) ||
            Number(row.version.split(".")[1]) % 2 === 0,
        )
        .map((row) => ({
          version: row.version,
          date: row.date + "T00:00:00Z",
          source: "node.json",
        })),
    );
    const rust = await get(
      "rust.md",
      "https://raw.githubusercontent.com/rust-lang/rust/stable/RELEASES.md",
    );
    add(
      "Rust",
      "Rust compiler",
      "Official dated changelog",
      htmlReleases(
        rust,
        /Version (1\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)/g,
        "rust.md",
      ),
    );
    for (const [language, repository, implementation] of [
      ["TypeScript", "microsoft/TypeScript", "TypeScript compiler"],
      ["Kotlin", "JetBrains/kotlin", "Kotlin compiler"],
      ["Swift", "swiftlang/swift", "Swift compiler"],
    ]) {
      let events = await githubReleases(context, repository!);
      if (language === "JavaScript")
        events = events.filter(
          (row) =>
            !/^v0\.\d+\./.test(row.version) ||
            Number(row.version.split(".")[1]) % 2 === 0,
        );
      add(
        language!,
        implementation!,
        "GitHub release publication timestamp",
        events,
      );
    }
    add(
      "Nix",
      "Nix",
      "Version-tag timestamp; commit timestamp for lightweight tags",
      await githubTags(context, "NixOS/nix"),
    );
    add(
      "Scala",
      "Scala 2 and Scala 3 compilers",
      "GitHub release publication timestamp",
      [
        ...(await githubReleases(context, "scala/scala")),
        ...(await githubReleases(context, "scala/scala3")),
      ],
    );
    const java: ReleaseEvent[] = [];
    const features = [
      8,
      11,
      ...Array.from(
        {
          length: Math.max(
            0,
            2 * (context.options.to ?? Number(context.runId.slice(0, 4))) -
              4025 -
              15,
          ),
        },
        (_, i) => i + 16,
      ),
    ];
    for (const feature of features)
      for (let page = 0; page < 100; page++) {
        const path = `java-${feature}-${page}.json`;
        const releases = JSON.parse(
          await get(
            path,
            `https://api.adoptium.net/v3/assets/feature_releases/${feature}/ga?architecture=x64&image_type=jdk&os=linux&page_size=100&page=${page}`,
          ),
        ) as {
          release_name: string;
          release_type: string;
          timestamp: string;
        }[];
        for (const row of releases) {
          if (row.release_type !== "ga")
            throw new Error("Non-GA Java release in GA response");
          java.push({
            version: row.release_name,
            date: row.timestamp,
            source: path,
          });
        }
        if (releases.length < 100) break;
        if (page === 99)
          throw new Error("Java release pagination exceeded its safety bound");
      }
    add(
      "Java",
      "Eclipse Temurin OpenJDK",
      "GA release publication timestamp",
      java,
    );
    const index = JSON.parse(
      await get(
        "dotnet-index.json",
        "https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/releases-index.json",
      ),
    ) as {
      "releases-index": {
        "channel-version": string;
        "releases.json": string;
      }[];
    };
    const dotnet: ReleaseEvent[] = [];
    for (const channel of index["releases-index"]) {
      const path = `dotnet-${channel["channel-version"]}.json`;
      const body = JSON.parse(await get(path, channel["releases.json"])) as {
        releases: { "release-version": string; "release-date": string }[];
      };
      for (const row of body.releases)
        if (/^\d+\.\d+\.\d+$/.test(row["release-version"]))
          dotnet.push({
            version: row["release-version"],
            date: row["release-date"] + "T00:00:00Z",
            source: path,
          });
    }
    add("C#", ".NET runtime", "Official .NET release date", dotnet);
    const observations = [];
    const metadata: Record<string, unknown> = {};
    for (const language of LANGUAGE_PROFILES) {
      const record = all[language.name];
      if (!record) throw new Error(`Missing release source: ${language.name}`);
      const unique = new Map<string, ReleaseEvent>();
      for (const event of record.events) {
        const date = new Date(event.date);
        if (!Number.isFinite(date.valueOf()))
          throw new Error(
            `Invalid release date: ${language.name}/${event.version}`,
          );
        const source = context.sources.find(
          (source) => source.path === event.source,
        )!;
        if (date.toISOString() > source.observed_at) continue;
        const canonical = { ...event, date: date.toISOString() };
        const previous = unique.get(event.version);
        if (!previous || canonical.date < previous.date)
          unique.set(event.version, canonical);
      }
      const events = [...unique.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      if (!events.length)
        throw new Error(`No dated stable releases for ${language.name}`);
      const firstFullYear = Number(events[0]!.date.slice(0, 4)) + 1;
      const through = context.options.to ?? Number(context.runId.slice(0, 4));
      for (
        let year = Math.max(context.options.from ?? 1970, firstFullYear);
        year <= through;
        year++
      ) {
        const selected = events.filter(
          (event) => Number(event.date.slice(0, 4)) === year,
        );
        const source = selected[0]?.source ?? events[0]!.source;
        const observed = context.sources.find(
          (row) => row.path === source,
        )!.observed_at;
        const interval = yearInterval(year);
        if (interval.period_end > observed) interval.period_end = observed;
        observations.push(
          context.observation(
            "releases.stable",
            language.name,
            selected.length,
            source,
            { unit: "releases", ecosystem: record.implementation, ...interval },
          ),
        );
      }
      metadata[language.name] = {
        implementation: record.implementation,
        date_basis: record.dateBasis,
        first_recorded_release: events[0]!.date,
        first_complete_year: firstFullYear,
        versions: events,
      };
    }
    context.metadata.implementations = metadata;
    return observations;
  },
);
