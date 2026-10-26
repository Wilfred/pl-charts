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
