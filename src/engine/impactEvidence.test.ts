import { describe, expect, it, vi } from "vitest";
import { syntheticDataset } from "../data/rainfall";
import {
  activeImpactSource,
  buildImpactView,
  comparisonImpactSource,
  currentImpactMetrics,
  evaluateImpactEvidence,
  evidenceBriefData,
  impactCapacityDecision,
  impactDifference,
  impactKeyFindings,
} from "./impactEvidence";
import { archiveFixture, edirne } from "../../tests/fixtures";
import { parseArchive, parseGeocoding } from "../data/openMeteo";
import { validateHistoricalComparison } from "../data/historicalComparison";
import { simulate } from "./simulation";
import * as simulation from "./simulation";
import { SIZING_TARGETS } from "./tankSizing";

const inputs = {
  roofAreaM2: 1,
  collectionEfficiency: 1,
  dailyDemandL: 5,
  currentCapacityL: 5,
};
// Short authored synthetic fixture. Not real or full-year historical rainfall.
const source = activeImpactSource({
  ...syntheticDataset(0),
  name: "Short synthetic fixture",
  rainfallMm: [10, 0, 10],
});
const fixture = () => evaluateImpactEvidence(source, inputs, [0, 5, 10, 20]);
const fixtureView = () => {
  const e = fixture();
  return { e, v: buildImpactView(e, currentImpactMetrics(e), 90, 10) };
};
describe("conditional impact evidence", () => {
  it("uses the exact zero-capacity simulation as its no-harvesting baseline", () => {
    const { v } = fixtureView(),
      b = v.periods[0].baseline;
    expect(b).toMatchObject({
      capacityL: 0,
      deliveredL: 0,
      potentialFreshwaterDisplacementL: 0,
      demandL: 15,
      unmetL: 15,
      overflowL: 20,
      coverage: 0,
      unusedStorageL: 0,
      shortageDays: 3,
    });
    expect(b.incomingL).toBe(
      simulate({
        ...inputs,
        rainfallMm: [10, 0, 10],
        tankCapacityL: 0,
        initialStorageL: 0,
      }).totals.incomingL,
    );
  });
  it("counts only delivered water, excludes ending water and converts L to m³", () => {
    const { v } = fixtureView(),
      s = v.periods[0].selected;
    expect(s.deliveredL).toBe(15);
    expect(s.unusedStorageL).toBe(5);
    expect(s.potentialFreshwaterDisplacementL).toBe(15);
    expect(s.potentialFreshwaterDisplacementM3).toBe(0.015);
    expect(s.potentialFreshwaterDisplacementL).not.toBe(
      s.deliveredL + s.unusedStorageL,
    );
  });
  it("forces zero starting water even with extra runtime dashboard properties", () => {
    const runtimeInputs = { ...inputs, initialStorageL: 999 };
    expect(
      evaluateImpactEvidence(source, runtimeInputs, [0, 5, 10, 20]),
    ).toEqual(fixture());
  });
  it("compares baseline, current, selected and the original recommendation", () => {
    const { v } = fixtureView(),
      p = v.periods[0];
    expect(v.decision.capacityL).toBe(10);
    expect(p.recommended!.capacityL).toBe(10);
    expect(p.current.deliveredL).toBe(10);
    expect(p.selected.deliveredL).toBe(15);
    expect(p.currentToSelected).toMatchObject({
      additionalDeliveredL: 5,
      unmetReductionL: 5,
      overflowChangeL: -10,
      capacityChangeL: 5,
    });
    expect(p.currentToSelected.coverageChangePp).toBeCloseTo(100 / 3, 10);
    expect(p.currentToRecommended).toEqual(p.currentToSelected);
  });
  it("retains negative signed differences for a tank below the recommendation", () => {
    const e = evaluateImpactEvidence(
        source,
        { ...inputs, currentCapacityL: 10 },
        [0, 5, 10, 20],
      ),
      v = buildImpactView(e, currentImpactMetrics(e), 90, 5),
      d = v.periods[0].currentToSelected;
    expect(d.additionalDeliveredL).toBe(-5);
    expect(d.unmetReductionL).toBe(-5);
    expect(d.overflowChangeL).toBe(10);
    expect(d.coverageChangePp).toBeCloseTo(-100 / 3);
  });
  it("shows identical capacity differences as zero and larger plateau tanks without invented benefits", () => {
    const { e } = fixtureView(),
      c = currentImpactMetrics(e),
      identical = buildImpactView(e, c, 90, 5),
      above = buildImpactView(e, c, 90, 20);
    expect(
      Object.values(identical.periods[0].currentToSelected).every(
        (v) => v === 0,
      ),
    ).toBe(true);
    expect(above.periods[0].selected.deliveredL).toBe(
      above.periods[0].recommended!.deliveredL,
    );
  });
  it.each([
    { dailyDemandL: 0 },
    { roofAreaM2: 0 },
    { collectionEfficiency: 0 },
  ])("handles no-benefit inputs %j", (change) => {
    const e = evaluateImpactEvidence(
        source,
        { ...inputs, ...change },
        [0, 5, 10, 20],
      ),
      v = buildImpactView(e, currentImpactMetrics(e), 90, 10);
    expect(v.decision.capacityL).toBeNull();
    expect(v.decision.reason).toBeTruthy();
    expect(v.totals.deliveredL).toBe(0);
    expect(impactKeyFindings(e, v)).not.toMatch(/NaN|Infinity/);
    if (change.dailyDemandL === 0) {
      expect(v.periods[0].selected.coverage).toBeNull();
      expect(v.periods[0].currentToSelected.coverageChangePp).toBeNull();
    }
  });
  it("handles no rainfall with unchanged total demand", () => {
    const e = evaluateImpactEvidence(
      {
        ...source,
        datasets: [{ ...source.datasets[0], rainfallMm: [0, 0, 0] }],
      },
      inputs,
      [0, 5, 10],
    );
    const v = buildImpactView(e, currentImpactMetrics(e), 90, 10);
    expect(v.totals.unmetL).toBe(15);
    expect(v.decision.reason).toContain("zero rainfall");
  });
  it("handles the current tank at zero capacity", () => {
    const e = evaluateImpactEvidence(
        source,
        { ...inputs, currentCapacityL: 0 },
        [0, 5, 10, 20],
      ),
      v = buildImpactView(e, currentImpactMetrics(e), 90, 10);
    expect(v.periods[0].current).toEqual(v.periods[0].baseline);
  });
  it("never puts an additional current-only capacity in the standard decision pool", () => {
    const e = evaluateImpactEvidence(
      source,
      { ...inputs, currentCapacityL: 7 },
      [0, 5, 10, 20],
    );
    expect(e.capacitiesL).not.toContain(7);
    expect(currentImpactMetrics(e)[0].capacityL).toBe(7);
    expect(impactCapacityDecision(e).capacityL).toBe(10);
  });
  it("maintains conservation and demand balances with fractional inputs", () => {
    const e = evaluateImpactEvidence(
      source,
      {
        roofAreaM2: 1.325,
        collectionEfficiency: 0.795,
        dailyDemandL: 3.125,
        currentCapacityL: 7.625,
      },
      [0, 3.75, 7.625, 20],
    );
    e.periods.forEach((p) =>
      p.standard.forEach((c) => {
        expect(c.incomingL).toBeCloseTo(
          c.deliveredL + c.overflowL + c.unusedStorageL,
          10,
        );
        expect(c.demandL).toBeCloseTo(c.deliveredL + c.unmetL, 10);
        expect(c.fullDemandDays + c.shortageDays).toBe(c.days);
      }),
    );
  });
  it("retains deterministic results and never mutates rainfall inputs", () => {
    const before = JSON.stringify(source);
    expect(fixture()).toEqual(fixture());
    expect(JSON.stringify(source)).toBe(before);
  });
  it("selects all targets and creates copy/print models without new simulations", () => {
    const e = fixture(),
      c = currentImpactMetrics(e),
      spy = vi.spyOn(simulation, "simulate");
    for (const t of SIZING_TARGETS) {
      const v = buildImpactView(e, c, t, 10);
      impactKeyFindings(e, v);
      evidenceBriefData(e, v);
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("copies source identity, period, units, assumptions, signed percentage points and caveats", () => {
    const { e, v } = fixtureView(),
      text = impactKeyFindings(e, v);
    expect(text).toContain("Short synthetic fixture");
    expect(text).toContain("3-day synthetic period (not annual)");
    expect(text).toContain("15 L (0.02 m³)");
    expect(text).toContain("0 L starting storage");
    expect(text).toContain("percentage points");
    expect(text).toContain("ONLY IF");
    expect(text).toContain("not measured savings");
    expect(text).toContain("No-harvesting baseline");
  });
  it("feeds print from the exact selected view without changing results", () => {
    const { e, v } = fixtureView(),
      brief = evidenceBriefData(e, v);
    expect(brief.analysis).toBe(v);
    expect(brief.source).toBe(e.source);
    expect(brief.startingStorageEachPeriodL).toBe(0);
    expect(brief.inputs.currentCapacityL).toBe(5);
    expect(brief.conditionalWarning).toContain("ONLY IF");
    expect(brief.decisionMethod).toContain("1e-10");
  });
  it("rejects invalid capacities, incomplete periods and untested alternatives", () => {
    expect(() =>
      evaluateImpactEvidence(source, { ...inputs, currentCapacityL: Infinity }),
    ).toThrow();
    expect(() =>
      evaluateImpactEvidence({ ...source, datasets: [] }, inputs),
    ).toThrow();
    const e = fixture();
    expect(() => buildImpactView(e, currentImpactMetrics(e), 90, 7)).toThrow(
      /standard/,
    );
  });
});
describe("independent complete-year impact outputs with SYNTHETIC transport fixtures", () => {
  const location = parseGeocoding({ results: [edirne] })[0];
  const data = validateHistoricalComparison(
    ([2023, 2024, 2025] as const).map((year) => {
      const f = archiveFixture(year);
      const rain: number[] = f.daily.rain_sum.map(() => 0);
      if (year === 2023) rain[rain.length - 1] = 20;
      Object.assign(f.daily, { rain_sum: rain });
      return parseArchive(f, { location, year }, "2026-10-23T12:00:00.000Z");
    }),
    location,
  );
  const e = evaluateImpactEvidence(
    comparisonImpactSource(data),
    inputs,
    [0, 5, 10, 20],
  );
  it("resets storage at each annual boundary and handles leap-year demand", () => {
    const c = currentImpactMetrics(e);
    expect(c.map((m) => m.demandL)).toEqual([1825, 1830, 1825]);
    expect(c.map((m) => m.deliveredL)).toEqual([5, 0, 0]);
    const v = buildImpactView(e, c, 90, 20);
    expect(v.periods.map((p) => p.selected.unusedStorageL)).toEqual([15, 0, 0]);
    expect(v.periods.map((p) => p.selected.deliveredL)).toEqual([5, 0, 0]);
  });
  it("distinguishes sums of independent annual outputs and maximum within-year streak", () => {
    const v = buildImpactView(e, currentImpactMetrics(e), 90, 20);
    expect(v.totals.deliveredL).toBe(5);
    expect(v.totals.demandL).toBe(5480);
    expect(v.totals.days).toBe(1096);
    expect(v.totals.longestWithinYearShortageStreak).toBe(366);
    expect(v.totals.coverage).toBe(5 / 5480);
    expect(v.totals.independentEndingStorageSumL).toBe(15);
  });
  it("leaves no cross-year recommendation when any year has zero yield", () => {
    const v = buildImpactView(e, currentImpactMetrics(e), 90, 20);
    expect(v.decision.capacityL).toBeNull();
    expect(v.decision.reason).toContain("2024");
    expect(impactKeyFindings(e, v)).toContain(
      "SUM of independent annual outputs",
    );
  });
  it("labels zero-demand percentage-point changes undefined", () => {
    const z = evaluateImpactEvidence(
      comparisonImpactSource(data),
      { ...inputs, dailyDemandL: 0 },
      [0, 5, 10],
    );
    const c = currentImpactMetrics(z);
    expect(impactDifference(c[0], c[1]).coverageChangePp).toBeNull();
  });
});
