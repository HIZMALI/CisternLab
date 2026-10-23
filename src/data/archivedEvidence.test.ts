import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  ARCHIVE_SHA256,
  ARCHIVE_ORIGINAL_PATH,
  readArchivedBytes,
  validateArchivedSnapshot,
} from "./archivedEvidence";
import {
  buildImpactView,
  comparisonImpactSource,
  currentImpactMetrics,
  evaluateImpactEvidence,
  impactKeyFindings,
} from "../engine/impactEvidence";

// Actual recorded ERA5 response. Distinct from authored/mocked transport fixtures.
const original = readFileSync(ARCHIVE_ORIGINAL_PATH),
  snapshot = JSON.parse(original.toString("utf8"));
it("verifies the documented original digest and identical browser-copy bytes", () => {
  expect(createHash("sha256").update(original).digest("hex")).toBe(
    ARCHIVE_SHA256,
  );
  expect(
    readFileSync("src/assets/archived-edirne.snapshot.json").equals(original),
  ).toBe(true);
});
it("validates the archive schema and all 1096 dated rainfall values without alteration", async () => {
  const archive = await readArchivedBytes(original);
  expect(archive.sha256).toBe(ARCHIVE_SHA256);
  expect(archive.originalText).toBe(original.toString("utf8"));
  expect(archive.comparison.years.map((d) => d.rainfallMm.length)).toEqual([
    365, 366, 365,
  ]);
  expect(archive.comparison.years).toEqual(snapshot.datasets);
  expect(archive.comparison.years[1].dates[59]).toBe("2024-02-29");
});
it("rejects corrupted or invalid JSON bytes before any result is used", async () => {
  const changed = new Uint8Array(original);
  changed[10] ^= 1;
  await expect(readArchivedBytes(changed)).rejects.toThrow(/SHA-256/);
  await expect(
    readArchivedBytes(new TextEncoder().encode("{broken")),
  ).rejects.toThrow(/integrity/);
});
it.each([
  null,
  {},
  { schemaVersion: "wrong", datasets: [] },
  { ...snapshot, datasets: snapshot.datasets.slice(1) },
])("rejects a malformed or incomplete archive schema", (payload) =>
  expect(() => validateArchivedSnapshot(payload)).toThrow(),
);
it.each([
  "null rain",
  "missing dates",
  "duplicated date",
  "wrong model",
  "wrong unit",
  "wrong city",
  "wrong grid",
  "missing metadata",
])("rejects archive corruption: %s", (kind) => {
  const p = structuredClone(snapshot),
    d = p.datasets[1];
  switch (kind) {
    case "null rain":
      d.rainfallMm[0] = null;
      break;
    case "missing dates":
      d.dates.pop();
      break;
    case "duplicated date":
      d.dates[1] = d.dates[0];
      break;
    case "wrong model":
      d.model = "ERA5-Land";
      break;
    case "wrong unit":
      d.units = "inch";
      break;
    case "wrong city":
      d.location.id = 1;
      break;
    case "wrong grid":
      d.returnedCoordinates.latitude = 0;
      break;
    case "missing metadata":
      delete d.requestedCoordinates;
      break;
  }
  expect(() => validateArchivedSnapshot(p)).toThrow();
});
it("preserves original provenance and ignores saved precomputed outputs", () => {
  const p = structuredClone(snapshot);
  p.decision.capacityL = 99999;
  p.currentAnnualResults[0].candidate.supplyL = 99999;
  const data = validateArchivedSnapshot(p);
  expect(data.years).toEqual(snapshot.datasets);
  const e = evaluateImpactEvidence(comparisonImpactSource(data, true), {
    roofAreaM2: 120,
    collectionEfficiency: 0.8,
    dailyDemandL: 250,
    currentCapacityL: 2000,
  });
  const v = buildImpactView(e, currentImpactMetrics(e), 90, 3000);
  expect(v.decision.capacityL).toBe(3000);
  expect(v.periods[0].current.deliveredL).not.toBe(99999);
});
it("reproduces the genuine archived Edirne reference case from original rainfall", () => {
  const e = evaluateImpactEvidence(
    comparisonImpactSource(validateArchivedSnapshot(snapshot), true),
    {
      roofAreaM2: 120,
      collectionEfficiency: 0.8,
      dailyDemandL: 250,
      currentCapacityL: 2000,
    },
  );
  const c = currentImpactMetrics(e),
    v = buildImpactView(e, c, 90, 3000);
  const expected = [
    { rain: 460.3, supply: 39030.8, coverage: 42.77 },
    { rain: 519.5, supply: 41299.2, coverage: 45.14 },
    { rain: 417.5, supply: 34261.6, coverage: 37.55 },
  ];
  c.forEach((m, i) => {
    expect(m.rainfallMm).toBeCloseTo(expected[i].rain, 6);
    expect(m.deliveredL).toBeCloseTo(expected[i].supply, 6);
    expect(m.coverage! * 100).toBeCloseTo(expected[i].coverage, 2);
    expect(m.incomingL).toBeCloseTo(
      m.deliveredL + m.overflowL + m.unusedStorageL,
      7,
    );
  });
  expect(v.decision.capacityL).toBe(3000);
  expect(v.periods[2].selected.deliveredL).toBeCloseTo(36144, 6);
  expect(v.totals.deliveredL).toBeCloseTo(
    v.periods.reduce((sum, p) => sum + p.selected.deliveredL, 0),
    9,
  );
  expect(impactKeyFindings(e, v)).toContain(ARCHIVE_SHA256);
});
it("does not mutate the original archive through deterministic recomputation", () => {
  const before = JSON.stringify(snapshot),
    data = validateArchivedSnapshot(snapshot),
    inputs = {
      roofAreaM2: 120,
      collectionEfficiency: 0.8,
      dailyDemandL: 250,
      currentCapacityL: 2000,
    };
  expect(
    evaluateImpactEvidence(comparisonImpactSource(data, true), inputs),
  ).toEqual(evaluateImpactEvidence(comparisonImpactSource(data, true), inputs));
  expect(JSON.stringify(snapshot)).toBe(before);
});
