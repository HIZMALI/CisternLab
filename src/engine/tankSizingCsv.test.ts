import { describe, expect, it } from "vitest";
import { tankSizingToCsv } from "./tankSizingCsv";
import { evaluateTankSizes } from "./tankSizing";
import { syntheticDataset } from "../data/rainfall";
import { DEFAULT_SCENARIO } from "../data/demo";
import { archiveFixture, edirne } from "../../tests/fixtures";
import { parseArchive, parseGeocoding } from "../data/openMeteo";

describe("tank-sizing CSV", () => {
  it("exports the independent fixture, rule, standard metrics, raw rain and separate current row", () => {
    const dataset = { ...syntheticDataset(0), rainfallMm: [10, 0, 10] };
    const evaluation = evaluateTankSizes(
      {
        roofAreaM2: 1,
        collectionEfficiency: 1,
        dailyDemandL: 5,
        rainfallMm: dataset.rainfallMm,
      },
      [0, 5, 10, 20],
    );
    const csv = tankSizingToCsv(dataset, evaluation, 7, 90);
    expect(csv).toContain('"Comparison initial storage (L)","0"');
    expect(csv).toContain('"Standard candidates (L)","0","5","10","20"');
    expect(csv).toContain(
      '"Current capacity (L)","7","In standard recommendation pool","No — comparison only"',
    );
    expect(csv).toContain(
      '"Target (%)","90","Maximum standard tested supply (L)","15","Target supply (L)","13.5"',
    );
    expect(csv).toContain(
      '"Recommended tested capacity (L)","10","Recommended supply (L)","15"',
    );
    expect(csv).toContain('"7","Current only","Yes","No","12"');
    expect(csv).toContain(
      '"10","Standard","No","Yes","15","100","0","0","5","3","3","100","5","5","5","1000"',
    );
    expect(csv).toContain('"Day 1","10"\r\n"Day 2","0"\r\n"Day 3","10"');
    expect(csv).toContain("not measured savings");
    expect(csv).toContain("not a financial return");
  });
  it.each([2024, 2025] as const)(
    "preserves full provenance and original %s rainfall without changing source metadata",
    (year) => {
      const dataset = parseArchive(
        archiveFixture(year),
        { location: parseGeocoding({ results: [edirne] })[0], year },
        "2026-10-23T18:00:00.000Z",
      );
      const before = JSON.stringify(dataset);
      const evaluation = evaluateTankSizes({
        ...DEFAULT_SCENARIO,
        rainfallMm: dataset.rainfallMm,
      });
      const csv = tankSizingToCsv(dataset, evaluation, 2000, 95);
      for (const value of [
        "HISTORICAL REANALYSIS — ERA5 MODEL",
        "Open-Meteo",
        "ERA5",
        "rain_sum",
        "41.67719",
        "41.75",
        "Europe/Istanbul",
        `${year}-01-01`,
        `${year}-12-31`,
        "2026-10-23T18:00:00.000Z",
        "CC BY 4.0",
        "no preceding-year carryover",
      ])
        expect(csv).toContain(value);
      expect(
        csv.split("\r\n").filter((row) => /^"20\d{2}-\d{2}-\d{2}",/.test(row)),
      ).toHaveLength(year === 2024 ? 366 : 365);
      expect(JSON.stringify(dataset)).toBe(before);
    },
  );
  it("escapes quotes, commas and formula-leading text cells with the established approach", () => {
    const dataset = {
      ...syntheticDataset(0),
      name: '=HYPERLINK("bad", "city")',
      provider: "+cmd",
      sourceUrl: "@SUM(1,2)",
    };
    const csv = tankSizingToCsv(
      dataset,
      evaluateTankSizes({
        ...DEFAULT_SCENARIO,
        rainfallMm: dataset.rainfallMm,
      }),
      2000,
      90,
    );
    expect(csv).toContain('"\'=HYPERLINK(""bad"", ""city"")"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'@SUM(1,2)"');
  });
  it("rejects mismatched provenance", () => {
    const dataset = syntheticDataset(0);
    expect(() =>
      tankSizingToCsv(
        dataset,
        evaluateTankSizes({ ...DEFAULT_SCENARIO, rainfallMm: [1] }),
        2000,
        90,
      ),
    ).toThrow(/provenance/);
  });
  it("exports explicit undefined percentages and no recommendation for zero demand", () => {
    const dataset = syntheticDataset(0);
    const csv = tankSizingToCsv(
      dataset,
      evaluateTankSizes({
        ...DEFAULT_SCENARIO,
        dailyDemandL: 0,
        rainfallMm: dataset.rainfallMm,
      }),
      2000,
      90,
    );
    expect(csv).toContain('"Recommended tested capacity (L)","None"');
    expect(csv).toContain("Undefined — zero demand");
    expect(csv).not.toMatch(/NaN|Infinity/);
  });
});
