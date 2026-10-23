import { describe, expect, it, vi } from "vitest";
import {
  currentAnnualResults,
  decideVariability,
  evaluateVariability,
  summarizeVariability,
} from "./variability";
import { simulate } from "./simulation";
import * as simulation from "./simulation";
import * as sizing from "./tankSizing";

// Deliberately SHORT synthetic pure-engine fixtures; not historical transport data.
const inputs = { roofAreaM2: 1, collectionEfficiency: 1, dailyDemandL: 5 };
const sequences = [
  { key: "Year A", rainfallMm: [10, 0, 10] },
  { key: "Year B", rainfallMm: [5, 5, 5] },
  { key: "Year C", rainfallMm: [0, 5, 5] },
];
const caps = [0, 5, 10, 20];
const fixture = () => evaluateVariability(inputs, sequences, caps);

describe("independent annual sensitivity engine", () => {
  it("computes the independent A/B/C annual recommendations and 10 L cross-year capacity", () => {
    const evaluation = fixture(),
      decision = decideVariability(evaluation);
    expect(decision.annual.map((d) => d.recommended!.capacityL)).toEqual([
      10, 5, 5,
    ]);
    expect(decision.capacityL).toBe(10);
    expect(
      evaluation.annual.map((y) => y.candidates.map((c) => c.supplyL)),
    ).toEqual([
      [0, 10, 15, 15],
      [0, 15, 15, 15],
      [0, 10, 10, 10],
    ]);
  });
  it.each(sizing.SIZING_TARGETS)(
    "uses the unchanged annual algorithm at %s%%",
    (target) => {
      const e = fixture(),
        d = decideVariability(e, target);
      e.annual.forEach((y, i) =>
        expect(d.annual[i]).toEqual({
          key: y.key,
          ...sizing.recommendCapacity(y.sizing, target),
        }),
      );
      expect(d.capacityL).toBe(10);
    },
  );
  it("does not simulate when selecting all thresholds", () => {
    const e = fixture(),
      spy = vi.spyOn(simulation, "simulate");
    sizing.SIZING_TARGETS.forEach((t) => decideVariability(e, t));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("uses each annual relative tolerance and excludes zero capacity", () => {
    const e = fixture(),
      d = decideVariability(e);
    d.annual.forEach((y) =>
      expect(y.comparisonToleranceL).toBe(y.maximumStandardSupplyL * 1e-10),
    );
    const tiny = evaluateVariability(
      { ...inputs, roofAreaM2: 1e-14 },
      sequences,
      caps,
    );
    expect(decideVariability(tiny).capacityL).toBe(5);
  });
  it("resets January storage even when the preceding December ends full", () => {
    const e = evaluateVariability(
      inputs,
      [
        { key: "A", rainfallMm: [20] },
        { key: "B", rainfallMm: [0] },
        { key: "C", rainfallMm: [0] },
      ],
      caps,
    );
    const c = currentAnnualResults(e, 20);
    expect(c.map((y) => y.candidate.finalStorageL)).toEqual([15, 0, 0]);
    expect(c.map((y) => y.candidate.supplyL)).toEqual([5, 0, 0]);
    expect(
      simulate({
        ...inputs,
        rainfallMm: [20, 0, 0],
        tankCapacityL: 20,
        initialStorageL: 0,
      }).totals.usedL,
    ).toBe(15);
  });
  it("ignores extra dashboard storage properties", () => {
    const runtime = { ...inputs, initialStorageL: 9999, tankCapacityL: 9999 };
    expect(evaluateVariability(runtime, sequences, caps)).toEqual(fixture());
  });
  it("counts all positive unmet volumes, including fractional shortages", () => {
    const e = evaluateVariability(
      inputs,
      sequences.map((s) => ({
        ...s,
        rainfallMm: [0, 0, 5, 4.999999999, 0, 5, 0],
      })),
      [0, 5],
    );
    const c = currentAnnualResults(e, 5)[0].candidate;
    expect(c.shortageDays).toBe(5);
    expect(c.longestShortageStreak).toBe(2);
    expect(c.fullySuppliedDays).toBe(2);
  });
  it("does not join shortage streaks across annual boundaries", () => {
    const e = evaluateVariability(
      inputs,
      sequences.map((s) => ({ ...s, rainfallMm: [0, 0] })),
      caps,
    );
    expect(
      currentAnnualResults(e, 5).map((y) => y.candidate.longestShortageStreak),
    ).toEqual([2, 2, 2]);
  });
  it.each([
    { dailyDemandL: 0 },
    { roofAreaM2: 0 },
    { collectionEfficiency: 0 },
  ])("explains a no-benefit physical scenario %j", (change) => {
    const e = evaluateVariability({ ...inputs, ...change }, sequences, caps),
      d = decideVariability(e);
    expect(d.capacityL).toBeNull();
    expect(d.noBenefitReason).toContain("not informative");
    expect(d.annual.every((y) => y.recommended === null)).toBe(true);
  });
  it("one zero-yield year blocks only the cross-year decision", () => {
    const e = evaluateVariability(
      inputs,
      sequences.map((s, i) => (i === 1 ? { ...s, rainfallMm: [0, 0, 0] } : s)),
      caps,
    );
    const d = decideVariability(e);
    expect(d.capacityL).toBeNull();
    expect(d.annual[0].recommended!.capacityL).toBe(10);
    expect(d.annual[1].recommended).toBeNull();
    expect(d.noBenefitReason).toContain("Year B");
    expect(d.noBenefitReason).toContain("zero rainfall");
  });
  it("preserves undefined coverage for zero demand and literal full-day counts", () => {
    const e = evaluateVariability(
        { ...inputs, dailyDemandL: 0 },
        sequences,
        caps,
      ),
      c = currentAnnualResults(e, 5);
    c.forEach(({ candidate: y }) => {
      expect(y.demandCoverage).toBeNull();
      expect(y.dailyReliability).toBeNull();
      expect(y.shortageDays).toBe(0);
      expect(y.fullySuppliedDays).toBe(3);
    });
    expect(summarizeVariability(c).coverage).toBeNull();
  });
  it("keeps a current-only tank separate and reuses standard metrics", () => {
    const e = fixture(),
      before = decideVariability(e),
      c = currentAnnualResults(e, 7);
    expect(c.every((y) => !y.candidate.isStandard)).toBe(true);
    expect(e.capacitiesL).toEqual(caps);
    expect(decideVariability(e)).toEqual(before);
    expect(currentAnnualResults(e, 5)[0].candidate).toBe(
      e.annual[0].candidates[1],
    );
  });
  it("does not equate lowest rainfall with lowest supply or coverage", () => {
    const e = evaluateVariability(
      inputs,
      [
        { key: "wet burst", rainfallMm: [20, 0, 0] },
        { key: "steady", rainfallMm: [5, 5, 5] },
        { key: "dry", rainfallMm: [0, 0, 0] },
      ],
      caps,
    );
    const c = currentAnnualResults(e, 5);
    expect(c[0].candidate.rainfallMm).toBeGreaterThan(
      c[1].candidate.rainfallMm,
    );
    expect(c[0].candidate.demandCoverage).toBeLessThan(
      c[1].candidate.demandCoverage!,
    );
    expect(summarizeVariability(c).supply.highestYears).toEqual(["steady"]);
  });
  it("reports all tied years and ranges without concatenation", () => {
    const s = summarizeVariability(currentAnnualResults(fixture(), 10));
    expect(s.supply).toEqual({
      min: 10,
      max: 15,
      lowestYears: ["Year C"],
      highestYears: ["Year A", "Year B"],
    });
    expect(s.shortageStreak.max).toBe(1);
  });
  it("preserves precision, independent simulation outputs and conservation for every candidate/year", () => {
    const e = evaluateVariability(
      { roofAreaM2: 1.375, collectionEfficiency: 0.81, dailyDemandL: 2.125 },
      sequences,
      [0, 2.75, 7.625, 20],
    );
    e.annual.forEach((y) =>
      y.candidates.forEach((c) => {
        const result = simulate({
          ...y.sizing.scenario,
          tankCapacityL: c.capacityL,
          initialStorageL: 0,
        });
        expect(c.supplyL).toBe(result.totals.usedL);
        expect(c.modeledFreshwaterDisplacementL).toBe(c.supplyL);
        expect(c.incomingL).toBeCloseTo(
          c.supplyL + c.overflowL + c.finalStorageL,
          9,
        );
        expect(c.annualDemandL).toBeCloseTo(c.supplyL + c.unmetDemandL, 9);
        expect(c.shortageDays + c.fullySuppliedDays).toBe(c.simulationDays);
        result.days.forEach((day) =>
          expect(day.openingStorageL + day.incomingL).toBeCloseTo(
            day.usedL + day.overflowL + day.remainingStorageL,
            10,
          ),
        );
      }),
    );
  });
  it("is deterministic and does not mutate input arrays", () => {
    const before = JSON.stringify(sequences);
    expect(fixture()).toEqual(fixture());
    expect(JSON.stringify(sequences)).toBe(before);
  });
  it.each(
    [
      sequences.slice(1),
      [...sequences, sequences[0]],
      [sequences[0], sequences[0], sequences[2]],
    ].map((set) => [set] as const),
  )("rejects incomplete or duplicate sequence sets", (s) =>
    expect(() => evaluateVariability(inputs, s, caps)).toThrow(),
  );
  it("rejects invalid inputs and unsupported targets through established engines", () => {
    expect(() =>
      evaluateVariability({ ...inputs, dailyDemandL: -1 }, sequences),
    ).toThrow();
    expect(() =>
      decideVariability(fixture(), 70 as sizing.SizingTarget),
    ).toThrow();
    expect(() => currentAnnualResults(fixture(), NaN)).toThrow();
  });
});
