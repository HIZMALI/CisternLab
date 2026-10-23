import { expect, it } from "vitest";
import { archiveFixture, edirne } from "../../tests/fixtures";
import { parseArchive, parseGeocoding } from "../data/openMeteo";
import { validateHistoricalComparison } from "../data/historicalComparison";
import { HISTORICAL_YEARS } from "../data/rainfall";
import { evaluateVariability } from "./variability";
import {
  ANALYSIS_SCHEMA_VERSION,
  historicalComparisonToCsv,
  historicalComparisonToJson,
} from "./variabilityExport";

const location = parseGeocoding({ results: [edirne] })[0];
function fixture() {
  const data = validateHistoricalComparison(
    HISTORICAL_YEARS.map((year) =>
      parseArchive(
        archiveFixture(year),
        { location, year },
        "2026-10-23T12:00:00.000Z",
      ),
    ),
    location,
  );
  const evaluation = evaluateVariability(
    { roofAreaM2: 120.25, collectionEfficiency: 0.815, dailyDemandL: 250.5 },
    data.years.map((y) => ({ key: String(y.year), rainfallMm: y.rainfallMm })),
  );
  return { data, evaluation };
}
/** RFC-4180 reader independent from the exporter, including quoted multiline cells. */
function csvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && ch === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && ch === "\r" && csv[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += ch;
  }
  return rows;
}
it("exports 33 parseable standard candidate/year rows with full precision and units", () => {
  const { data, evaluation } = fixture(),
    rows = csvRows(historicalComparisonToCsv(data, evaluation, 1234.5, 90));
  expect(rows).toHaveLength(34);
  expect(rows.every((r) => r.length === rows[0].length)).toBe(true);
  const records = rows
    .slice(1)
    .map((row) => Object.fromEntries(rows[0].map((key, i) => [key, row[i]])));
  expect(new Set(records.map((r) => r.year))).toEqual(
    new Set(["2023", "2024", "2025"]),
  );
  expect(records.some((r) => r.capacity_L === "1234.5")).toBe(false);
  expect(records[1].used_L).toBe(
    String(evaluation.annual[0].candidates[1].supplyL),
  );
  expect(records[1].initial_storage_each_year_L).toBe("0");
  expect(JSON.parse(records[1].provenance_json).retrievedAt).toBe(
    data.years[0].retrievedAt,
  );
  expect(JSON.parse(records[1].assumptions_json).carryoverBetweenYears).toBe(
    false,
  );
});
it.each([
  '=HYPERLINK("evil")',
  "+cmd",
  "-cmd",
  "@SUM(A1)",
  "\t=1",
  "\r=1",
  "  =1",
  'A, B\n"quoted"',
])("protects and escapes spreadsheet text %j", (name) => {
  const { data, evaluation } = fixture();
  const poisoned = { ...data, years: data.years.map((y) => ({ ...y, name })) };
  const rows = csvRows(
    historicalComparisonToCsv(poisoned, evaluation, 2000, 90),
  );
  const value = rows[1][rows[0].indexOf("location")];
  expect(value).toBe(name.startsWith("A") ? name : `'${name}`);
});
it("preserves original daily arrays, exact dates and every provenance field in deterministic JSON", () => {
  const { data, evaluation } = fixture(),
    json = historicalComparisonToJson(data, evaluation, 1234.5, 95),
    snapshot = JSON.parse(json);
  expect(json).toBe(historicalComparisonToJson(data, evaluation, 1234.5, 95));
  expect(snapshot.schemaVersion).toBe(ANALYSIS_SCHEMA_VERSION);
  expect(snapshot.datasets).toEqual(data.years);
  expect(
    snapshot.datasets.map((y: { dates: string[] }) => y.dates.length),
  ).toEqual([365, 366, 365]);
  expect(snapshot.assumptions.initialStorageEachYearL).toBe(0);
  expect(snapshot.inputs.currentTankCapacityL).toBe(1234.5);
  expect(snapshot.targetPercent).toBe(95);
  expect(
    snapshot.currentAnnualResults.every(
      (y: { candidate: { isStandard: boolean } }) => !y.candidate.isStandard,
    ),
  ).toBe(true);
});
it("recomputes the same complete analysis from the JSON without a download", () => {
  const { data, evaluation } = fixture(),
    raw = JSON.parse(historicalComparisonToJson(data, evaluation, 2000, 98));
  const reproduced = evaluateVariability(
    raw.inputs,
    raw.datasets.map((y: { year: number; rainfallMm: number[] }) => ({
      key: String(y.year),
      rainfallMm: y.rainfallMm,
    })),
    raw.standardCapacitiesL,
  );
  expect(
    historicalComparisonToJson(
      data,
      reproduced,
      raw.inputs.currentTankCapacityL,
      raw.targetPercent,
    ),
  ).toBe(historicalComparisonToJson(data, evaluation, 2000, 98));
});
it("keeps zero-demand percentages and recommendation undefined in JSON and blank in CSV", () => {
  const { data } = fixture(),
    e = evaluateVariability(
      { roofAreaM2: 1, collectionEfficiency: 1, dailyDemandL: 0 },
      data.years.map((y) => ({
        key: String(y.year),
        rainfallMm: y.rainfallMm,
      })),
    );
  const snapshot = JSON.parse(historicalComparisonToJson(data, e, 2000, 90));
  expect(snapshot.decision.capacityL).toBeNull();
  expect(snapshot.variability.coverage).toBeNull();
  const rows = csvRows(historicalComparisonToCsv(data, e, 2000, 90));
  expect(rows[1][rows[0].indexOf("demand_coverage_fraction")]).toBe("");
  expect(JSON.stringify(snapshot)).not.toMatch(/NaN|Infinity/);
});
it("rejects exports whose provenance does not match the evaluated rainfall", () => {
  const { data, evaluation } = fixture(),
    changed = {
      ...data,
      years: data.years.map((y, i) =>
        i
          ? y
          : { ...y, rainfallMm: y.rainfallMm.map((r, j) => (j ? r : r + 1)) },
      ),
    };
  expect(() =>
    historicalComparisonToCsv(changed, evaluation, 2000, 90),
  ).toThrow(/do not match/);
  expect(() =>
    historicalComparisonToJson(changed, evaluation, 2000, 90),
  ).toThrow(/do not match/);
});
