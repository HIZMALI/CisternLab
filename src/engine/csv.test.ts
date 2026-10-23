import { expect, it } from "vitest";
import { resultsToCsv } from "./csv";
import { simulate } from "./simulation";

it("exports inputs, provenance, model, units, and unrounded daily values", () => {
  const input = {
    roofAreaM2: 1.3,
    rainfallMm: [0.7],
    collectionEfficiency: 0.8,
    tankCapacityL: 2,
    dailyDemandL: 0.1,
    initialStorageL: 0,
  };
  const csv = resultsToCsv(input, simulate(input), 'Synthetic "test"');
  expect(csv).toContain('"DEMO DATA","ESTIMATED RESULT"');
  expect(csv).toContain('"Synthetic ""test"""');
  expect(csv).toContain("Daily rain before demand; no sub-daily precision");
  expect(csv).toContain('"Initial storage (L)","0"');
  expect(csv).toContain('"Unmet demand (L)"');
  expect(csv).toContain('"0.728","0","0.1","0.628"');
  expect(csv.split("\r\n")).toHaveLength(11);
});
