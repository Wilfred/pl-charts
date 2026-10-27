import assert from "node:assert/strict";
import test from "node:test";
import { parseSurvey, parseSurveyCsv } from "../src/surveys.ts";
test("modern survey parsing selects language use for all respondents, excluding desired use and other cohorts", () => {
  const result = parseSurvey(
    JSON.stringify({
      Languages: {
        meta: {
          question: "Used languages",
          slices: [
            { slice_type: "all", n: 100 },
            { slice_type: "workexp", n: 20 },
          ],
        },
        data: [
          { slice: 0, series: null, response: "Python", count: 60, pct: 0.6 },
          { slice: 1, series: null, response: "Python", count: 5, pct: 0.25 },
          {
            slice: 0,
            series: "Desired",
            response: "Python",
            count: 80,
            pct: 0.8,
          },
        ],
      },
    }),
  );
  assert.equal(result.denominator, 100);
  assert.deepEqual(result.data, [
    { response: "Python", frequency: 60, percent: 60 },
  ]);
});
test("historical survey parsing preserves the published denominator and percentage", () => {
  const result = parseSurvey(
    JSON.stringify({
      SubSections: [
        {
          GraphCollections: [
            {
              Title: "Programming Languages",
              Graphs: [
                {
                  Title: "All Respondents",
                  SubText: "1,234 responses; select all that apply",
                  Data: { Python: 41.7188 },
                },
              ],
            },
          ],
        },
      ],
    }),
  );
  assert.equal(result.denominator, 1234);
  assert.deepEqual(result.data, [{ response: "Python", percent: 41.7188 }]);
  assert.throws(() => parseSurvey("{}"), /Unrecognized/);
});

test("matrix survey exports combine language versions once per respondent", () => {
  const source =
    ",,,,\nCountry,Current Lang & Tech: C++,Current Lang & Tech: C++11,Current Lang & Tech: Python,Future Lang & Tech: Python\nX,C++,C++11,,Python\nY,,,Python,\nZ,,,,Python\n";
  const parsed = parseSurveyCsv(source, 2015);
  assert.equal(parsed.denominator, 2);
  assert.equal(parsed.data.find((row) => row.response === "C++")?.frequency, 1);
  assert.equal(
    parsed.data.find((row) => row.response === "Python")?.percent,
    50,
  );
});

test("Most Loved uses retention among existing users, excluding desired and other cohorts", async () => {
  const { parseSurveyLoved } = await import("../src/surveys.ts");
  const modern = {
    Languages: {
      meta: { question: "Use", slices: [{ slice_type: "all", n: 100 }] },
      data: [{ slice: 0, series: null, response: "Rust", pct: 0.2, count: 20 }],
    },
    DA_Language: {
      meta: { slices: [{ slice_type: "all" }, { slice_type: "workexp" }] },
      data: [
        { slice: 0, series: "Desired", response: "Rust", pct: 0.9, count: 90 },
        { slice: 0, series: "Admired", response: "Rust", pct: 0.8, count: 16 },
        { slice: 1, series: "Admired", response: "Rust", pct: 0.1, count: 1 },
      ],
    },
  };
  assert.deepEqual(parseSurveyLoved(JSON.stringify(modern), 2026).data, [
    { response: "Rust", percent: 80, frequency: 16, denominator: 20 },
  ]);
  const old = {
    Language: {
      datasets: {
        Language: {
          data: [{ response: "Rust", percent: 0.2, frequency: 20 }],
          total_respondents: 100,
        },
      },
    },
    LDW_Language: {
      datasets: {
        Language_love_dread: {
          data: [
            {
              response: "Rust",
              frequency1: 16,
              frequency2: 4,
              percent1: 0.8,
              percent2: 0.2,
            },
          ],
        },
      },
    },
  };
  assert.deepEqual(parseSurveyLoved(JSON.stringify(old), 2021).data, [
    { response: "Rust", percent: 80, frequency: 16, denominator: 20 },
  ]);
  const admired = {
    ...old,
    LDW_Language: undefined,
    DA_Language: {
      datasets: {
        Language_desire_admire: {
          data: [
            {
              response: "Rust",
              Wanted_percent: 0.9,
              Wanted_frequency: 90,
              Admired_percent: 0.8,
              Admired_frequency: 16,
            },
          ],
        },
      },
    },
  };
  assert.deepEqual(parseSurveyLoved(JSON.stringify(admired), 2023).data, [
    { response: "Rust", percent: 80, frequency: 16, denominator: 20 },
  ]);
});
test("historical Most Loved parsing stays within the language graph and preserves published precision", async () => {
  const { parseSurveyLoved } = await import("../src/surveys.ts");
  assert.deepEqual(
    parseSurveyLoved(
      JSON.stringify({
        SubSections: [
          {
            Title: "Most Loved, Dreaded, and Wanted Languages",
            Graphs: [
              { Title: "Loved", Data: { Rust: 83.4646 } },
              { Title: "Dreaded", Data: { Rust: 16.5354 } },
            ],
          },
          {
            Title: "Most Loved Databases",
            Graphs: [{ Title: "Loved", Data: { Redis: 99 } }],
          },
        ],
      }),
      2019,
    ).data,
    [{ response: "Rust", percent: 83.4646 }],
  );
  const html =
    '<div id="techSuper-loved"><div class="bar-label">Rust</div><span>73.8%</span><div id="techSuper-dreaded"><div class="bar-label">Rust</div><span>26.2%</span>';
  assert.deepEqual(parseSurveyLoved(html, 2015).data, [
    { response: "Rust", percent: 73.8 },
  ]);
  assert.throws(() => parseSurveyLoved("{}", 2025), /Unrecognized/);
});
