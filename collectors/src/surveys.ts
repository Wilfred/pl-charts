import { parse } from "csv-parse/sync";
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
export interface SurveyResult {
  data: { response: string; percent: number; frequency?: number }[];
  denominator?: number;
  definition: string;
}
export function parseSurvey(body: string): SurveyResult {
  const source = JSON.parse(body) as Record<string, unknown>;
  const modern = record(source.Languages);
  if (modern && Array.isArray(modern.data)) {
    const meta = record(modern.meta)!;
    const slices = meta.slices as { slice_type: string; n: number }[];
    const slice = slices.findIndex((row) => row.slice_type === "all");
    const data = (
      modern.data as {
        slice: number;
        series: unknown;
        response: string;
        pct: number;
        count: number;
      }[]
    )
      .filter((row) => row.slice === slice && row.series === null)
      .map((row) => ({
        response: row.response,
        percent: row.pct * 100,
        frequency: row.count,
      }));
    if (!data.length || !slices[slice]?.n)
      throw new Error("Missing all-respondent language-use slice");
    return {
      data,
      denominator: slices[slice].n,
      definition: String(meta.question),
    };
  }
  const language = record(source.Language);
  const datasets = record(language?.datasets);
  const dataset = record(datasets?.Language);
  if (dataset && Array.isArray(dataset.data)) {
    const data = (
      dataset.data as { response: string; percent: number; frequency: number }[]
    ).map((row) => ({
      response: row.response,
      percent: row.percent * 100,
      frequency: row.frequency,
    }));
    return {
      data,
      denominator: Number(dataset.total_respondents),
      definition: String(language?.question),
    };
  }
  let result: SurveyResult | undefined;
  function visit(value: unknown): void {
    if (result) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = record(value);
    if (!node) return;
    if (
      typeof node.Title === "string" &&
      /^Programming.*Languages$/i.test(node.Title) &&
      Array.isArray(node.Graphs)
    ) {
      const graph = (node.Graphs as Record<string, unknown>[]).find(
        (graph) =>
          graph.Title === "All Respondents" ||
          graph.Title === "% of All Respondents",
      );
      const data = record(graph?.Data);
      if (graph && data) {
        const count = String(graph.SubText).match(/([\d,]+) responses/);
        result = {
          data: Object.entries(data).map(([response, percent]) => ({
            response,
            percent: Number(percent),
          })),
          denominator: count
            ? Number(count[1]!.replaceAll(",", ""))
            : undefined,
          definition: String(graph.SubText),
        };
        return;
      }
    }
    Object.values(node).forEach(visit);
  }
  visit(source);
  if (!result) throw new Error("Unrecognized survey language results");
  return result;
}

export function parseSurveyCsv(body: string, year: number): SurveyResult {
  const rows = parse(body, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];
  const normalize = (value: string) => (value === "C++11" ? "C++" : value);
  const selected = (value: string | undefined) =>
    !!value?.trim() && !["NA", "0", "False"].includes(value.trim());
  const frequencies = new Map<string, number>();
  let denominator = 0;
  let definition: string;
  const choices: string[][] = [];
  if (year === 2016) {
    const index = rows[0]!.indexOf("tech_do");
    if (index < 0) throw new Error("Missing survey technology-use column");
    definition =
      "tech_do: technologies used; respondents with a nonempty answer";
    for (const row of rows.slice(1))
      if (selected(row[index]))
        choices.push(row[index]!.split(";").map((value) => value.trim()));
  } else {
    let header: string[], indices: number[], start: number;
    if (year === 2015) {
      header = rows[0]!.some((value) =>
        value.startsWith("Current Lang & Tech:"),
      )
        ? rows[0]!
        : rows[1]!;
      indices = header.flatMap((value, index) =>
        value.startsWith("Current Lang & Tech:") ? [index] : [],
      );
      start = rows.indexOf(header) + 1;
      header = header.map((value) =>
        value.replace(/^Current Lang & Tech:\s*/, ""),
      );
      definition =
        "Current Lang & Tech: respondents selecting at least one current technology";
    } else {
      const column = rows[0]!.findIndex(
        (value) =>
          value.includes("languages or technologies") &&
          value.includes("past year"),
      );
      if (column < 0)
        throw new Error("Missing past-year language-use question");
      const end = rows[0]!.findIndex(
        (value, index) => index > column && !!value,
      );
      indices = Array.from(
        { length: (end < 0 ? rows[0]!.length : end) - column },
        (_, index) => column + index,
      );
      header = rows[1]!;
      start = 2;
      definition = rows[0]![column]!;
    }
    if (!indices.length) throw new Error("Missing current technology options");
    for (const row of rows.slice(start)) {
      const values = indices
        .filter((index) => selected(row[index]))
        .map((index) => header[index]!);
      if (values.length) choices.push(values);
    }
    // Offered options with no selections are measured zeros.
    for (const index of indices) frequencies.set(normalize(header[index]!), 0);
  }
  for (const choice of choices) {
    denominator++;
    for (const option of new Set(choice.map(normalize)))
      frequencies.set(option, (frequencies.get(option) ?? 0) + 1);
  }
  if (!denominator) throw new Error("No technology-use respondents");
  return {
    denominator,
    definition:
      definition + "; C++ version options are combined once per respondent",
    data: [...frequencies].map(([response, frequency]) => ({
      response,
      frequency,
      percent: (frequency / denominator) * 100,
    })),
  };
}
