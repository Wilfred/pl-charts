export const PACKAGE_FIXTURES: Record<string, { body: string; value: number }> =
  {
    pypi: { body: "<p>1,234 projects</p><p>9,876 releases</p>", value: 1234 },
    npm: { body: '{"doc_count":2345,"update_seq":9876}', value: 2345 },
    cargo: { body: '{"num_crates":3456,"num_downloads":999999}', value: 3456 },
    maven: {
      body: '{"responseHeader":{"status":0},"response":{"numFound":4567,"docs":[]}}',
      value: 4567,
    },
    nuget: { body: '{"totalHits":5678,"data":[]}', value: 5678 },
    packagist: {
      body: "<dt>Packages registered</dt><dd>6\u2009789</dd><dt>Versions available</dt><dd>987654</dd>",
      value: 6789,
    },
    rubygems: {
      body: "<span>Total gems</span><span>7,890</span><span>Total users</span><span>98765</span>",
      value: 7890,
    },
    cpan: { body: '{"_shards":{"failed":0},"count":8901}', value: 8901 },
    clojars: {
      body: "<p>Displaying projects <b>1 - 20</b> of <b>9,012</b></p>",
      value: 9012,
    },
    hex: {
      body: "<span>10 123</span><span>packages available</span><span>123 456</span><span>package versions</span>",
      value: 10123,
    },
    luarocks: {
      body: "<h1>All Modules <span>(11,234)</span></h1><p>Page 1 of 225</p>",
      value: 11234,
    },
    crystalshards: {
      body: "<dt>Shards</dt><dd>12,345</dd><dt>Stars</dt><dd>999,999</dd>",
      value: 12345,
    },
    melpa: {
      body: '{"one":{"ver":[2026,1]},"two":{"ver":[2026,2]}}',
      value: 2,
    },
    drupal: {
      body: '{"last":"https://www.drupal.org/api-d7/node?type=project_module&limit=1&page=12344","list":[{"nid":1}]}',
      value: 12345,
    },
  };
export const MODULECOUNTS_FIXTURE = [
  ["Clojars (Clojure)", 2],
  ["CPAN", 2],
  ["CPAN (search)", 5],
  ["CRAN (R)", -2],
  ["Crates.io (Rust)", 119],
  ["Crystal Shards", 2],
  ["Drupal (php)", 3],
  ["DUB (dlang)", 0],
  ["Hackage (Haskell)", 1],
  ["Hex.pm (Elixir/Erlang)", 4],
  ["LuaRocks (Lua)", 2],
  ["Maven Central (Java)", 242],
  ["MELPA (Emacs)", 2],
  ["npm (node.js)", 843],
  ["nuget (.NET)", 140],
  ["Packagist (PHP)", 76],
  ["PyPI", 201],
  ["Rubygems.org", 15],
]
  .map(
    ([name, rate]) =>
      `<tr><td><a href="https://example.test">${name}</a></td><td>${rate}/day</td></tr>`,
  )
  .join("\n");
