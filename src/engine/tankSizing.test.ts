import { afterEach, describe, expect, it, vi } from "vitest";
import * as waterBalance from "./simulation";
import {
  capacityChanges,
  comparisonCandidates,
  currentTankCandidate,
  evaluateTankSizes,
  normalizeCapacities,
  recommendCapacity,
  SIZING_TARGETS,
  STANDARD_CAPACITIES_L,
} from "./tankSizing";
import { syntheticDataset } from "../data/rainfall";
import { DEFAULT_SCENARIO } from "../data/demo";
import { parseArchive, parseGeocoding } from "../data/openMeteo";
import { archiveFixture, edirne } from "../../tests/fixtures";

const independent = {
  roofAreaM2: 1,
  rainfallMm: [10, 0, 10],
  collectionEfficiency: 1,
  dailyDemandL: 5,
};
const capacities = [0, 5, 10, 20];
afterEach(() => vi.restoreAllMocks());

describe("candidate generation and deterministic simulation reuse", () => {
  it("uses the exact standard pool and sorts and deduplicates independently", () => {
    expect(STANDARD_CAPACITIES_L).toEqual([
      0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000,
    ]);
    const unsorted = Object.freeze([20, 0, 10, 5, 10, -0, 20]);
    expect(normalizeCapacities(unsorted)).toEqual(capacities);
    expect(unsorted).toEqual([20, 0, 10, 5, 10, -0, 20]);
    expect(
      evaluateTankSizes(independent, unsorted).standardCandidates.map(
        (row) => row.capacityL,
      ),
    ).toEqual(capacities);
  });
  it.each([
    { pool: [] },
    { pool: [NaN] },
    { pool: [Infinity] },
    { pool: [-1] },
    { pool: new Array<number>(1) },
  ])("rejects invalid candidate pools %#", ({ pool }) => {
    expect(() => normalizeCapacities(pool)).toThrow(RangeError);
  });
  it("matches the independent three-day fixture directly against the original engine", () => {
    const evaluation = evaluateTankSizes(independent, capacities);
    expect(evaluation.standardCandidates.map((row) => row.supplyL)).toEqual([
      0, 10, 15, 15,
    ]);
    expect(evaluation.maximumStandardSupplyL).toBe(15);
    const decision = recommendCapacity(evaluation);
    expect(decision.targetSupplyL).toBe(13.5);
    expect(decision.recommended?.capacityL).toBe(10);
    expect(decision.achievedFraction).toBe(1);
    for (const candidate of evaluation.standardCandidates) {
      const original = waterBalance.simulate({
        ...independent,
        tankCapacityL: candidate.capacityL,
        initialStorageL: 0,
      });
      expect(candidate.supplyL).toBe(original.totals.usedL);
      expect(candidate.overflowL).toBe(original.totals.overflowL);
      expect(candidate.unmetDemandL).toBe(original.totals.unmetDemandL);
      expect(candidate.finalStorageL).toBe(original.totals.finalStorageL);
    }
  });
  it("keeps the current non-standard tank outside both maximum and recommendation pool", () => {
    const evaluation = evaluateTankSizes(
      { ...independent, rainfallMm: [25, 0, 0, 0] },
      [0, 5, 10],
    );
    const before = recommendCapacity(evaluation);
    const current = currentTankCandidate(evaluation, 20);
    expect(current.supplyL).toBe(20);
    expect(current.isStandard).toBe(false);
    expect(current.marginal).toBeNull();
    expect(evaluation.maximumStandardSupplyL).toBe(10);
    expect(
      comparisonCandidates(evaluation, current).map((row) => row.capacityL),
    ).toEqual([0, 5, 10, 20]);
    expect(recommendCapacity(evaluation)).toEqual(before);
    expect(before.recommended?.capacityL).toBe(10);
  });
  it("does not duplicate a current capacity that is already standard", () => {
    const evaluation = evaluateTankSizes(independent, capacities);
    const current = currentTankCandidate(evaluation, 10);
    expect(current).toBe(evaluation.standardCandidates[2]);
    expect(comparisonCandidates(evaluation, current)).toBe(
      evaluation.standardCandidates,
    );
    expect(
      comparisonCandidates(
        evaluation,
        currentTankCandidate(evaluation, 7.5),
      ).map((row) => row.capacityL),
    ).toEqual([0, 5, 7.5, 10, 20]);
    expect(evaluation.standardCandidates[2].marginal?.fromCapacityL).toBe(5);
  });
  it("is deterministic and does not mutate a frozen rainfall sequence or input", () => {
    const input = Object.freeze({
      ...independent,
      rainfallMm: Object.freeze([...independent.rainfallMm]),
    });
    expect(evaluateTankSizes(input, capacities)).toEqual(
      evaluateTankSizes(input, capacities),
    );
    expect(input.rainfallMm).toEqual([10, 0, 10]);
    expect(Object.isFrozen(evaluateTankSizes(input).scenario.rainfallMm)).toBe(
      true,
    );
  });
  it("forces empty starts even if extra runtime dashboard storage is passed", () => {
    const input = {
      ...independent,
      rainfallMm: [0, 0, 0],
      initialStorageL: 1000,
      tankCapacityL: 2000,
    };
    const result = evaluateTankSizes(input, capacities);
    expect(
      result.standardCandidates.every(
        (row) => row.supplyL === 0 && row.finalStorageL === 0,
      ),
    ).toBe(true);
    expect(currentTankCandidate(result, 1234).supplyL).toBe(0);
    expect(result.scenario).not.toHaveProperty("initialStorageL");
    expect(input.initialStorageL).toBe(1000);
  });
  it("delegates input validation and rejects invalid current capacities", () => {
    for (const input of [
      { ...independent, roofAreaM2: -1 },
      { ...independent, collectionEfficiency: 1.1 },
      { ...independent, dailyDemandL: Infinity },
      { ...independent, rainfallMm: [] },
      { ...independent, rainfallMm: [null as unknown as number] },
    ])
      expect(() => evaluateTankSizes(input)).toThrow(RangeError);
    const evaluation = evaluateTankSizes(independent);
    for (const invalid of [-1, NaN, Infinity])
      expect(() => currentTankCandidate(evaluation, invalid)).toThrow(
        RangeError,
      );
  });
  it("keeps fractional input precision", () => {
    const input = {
      roofAreaM2: 1.3,
      rainfallMm: [0.7, 0.2],
      collectionEfficiency: 0.8,
      dailyDemandL: 0.1,
    };
    const candidate = evaluateTankSizes(input, [0, 0.5, 1.25])
      .standardCandidates[2];
    expect(candidate.supplyL).toBe(0.2);
    expect(candidate.finalStorageL).toBeCloseTo(0.736, 12);
    expect(candidate.capacityL).toBe(1.25);
  });
  it("does not resimulate when only selecting targets or a standard current capacity", () => {
    const spy = vi.spyOn(waterBalance, "simulate");
    const evaluation = evaluateTankSizes(independent);
    expect(spy).toHaveBeenCalledTimes(11);
    for (const target of SIZING_TARGETS) recommendCapacity(evaluation, target);
    currentTankCandidate(evaluation, 2000);
    expect(spy).toHaveBeenCalledTimes(11);
    currentTankCandidate(evaluation, 1234);
    expect(spy).toHaveBeenCalledTimes(12);
  });
});

describe("recommendation, ties and no-benefit states", () => {
  it.each([
    [80, 12],
    [90, 13.5],
    [95, 14.25],
    [98, 14.7],
  ] as const)(
    "selects the correct %s percent supply threshold",
    (target, expectedSupply) => {
      const result = recommendCapacity(
        evaluateTankSizes(independent, capacities),
        target,
      );
      expect(result.targetSupplyL).toBe(expectedSupply);
      expect(result.recommended?.capacityL).toBe(10);
    },
  );
  it("accepts the exact threshold boundary, tolerates tiny roundoff and rejects meaningful shortfalls", () => {
    expect(
      recommendCapacity(evaluateTankSizes(independent, [0, 5, 8.5, 10, 20]))
        .recommended?.capacityL,
    ).toBe(8.5);
    expect(
      recommendCapacity(
        evaluateTankSizes(independent, [0, 5, 8.5 - 1e-11, 10, 20]),
      ).recommended?.capacityL,
    ).toBe(8.5 - 1e-11);
    expect(
      recommendCapacity(
        evaluateTankSizes(independent, [0, 5, 8.5 - 1e-5, 10, 20]),
      ).recommended?.capacityL,
    ).toBe(10);
  });
  it("selects the smallest equal-yield capacity on a plateau", () => {
    const evaluation = evaluateTankSizes(independent, [20, 10, 5, 0, 10]);
    expect(
      evaluation.standardCandidates.slice(2).map((row) => row.supplyL),
    ).toEqual([15, 15]);
    expect(recommendCapacity(evaluation, 98).recommended?.capacityL).toBe(10);
  });
  it.each([
    { change: { rainfallMm: [0, 0] }, reason: "zero rainfall" },
    { change: { dailyDemandL: 0 }, reason: "demand is zero" },
    { change: { roofAreaM2: 0 }, reason: "Roof area is zero" },
    { change: { collectionEfficiency: 0 }, reason: "efficiency is zero" },
  ])("does not recommend a tank for $reason", ({ change, reason }) => {
    const evaluation = evaluateTankSizes({ ...independent, ...change });
    const decision = recommendCapacity(evaluation);
    expect(decision.recommended).toBeNull();
    expect(decision.achievedFraction).toBeNull();
    expect(decision.targetSupplyL).toBe(0);
    expect(decision.noBenefitReason).toContain(reason);
    expect(
      evaluation.standardCandidates.every(
        (row) => Number.isFinite(row.supplyL) && row.supplyL === 0,
      ),
    ).toBe(true);
  });
  it("treats zero capacity as a no-storage baseline and describes no usable supply", () => {
    const evaluation = evaluateTankSizes(independent, [0]);
    expect(recommendCapacity(evaluation).recommended).toBeNull();
    expect(evaluation.noBenefitReason).toContain("No usable rainwater");
    expect(evaluation.standardCandidates[0]).toMatchObject({
      supplyL: 0,
      overflowL: 20,
      unmetDemandL: 15,
      finalStorageL: 0,
    });
  });
  it("does not let an absolute tolerance recommend zero for tiny positive yields", () => {
    const evaluation = evaluateTankSizes(
      { ...independent, rainfallMm: [1e-15] },
      [0, 1],
    );
    expect(recommendCapacity(evaluation).recommended?.capacityL).toBe(1);
  });
  it("leaves both coverage and daily reliability undefined when demand is zero", () => {
    for (const row of evaluateTankSizes({ ...independent, dailyDemandL: 0 })
      .standardCandidates) {
      expect(row.demandCoverage).toBeNull();
      expect(row.dailyReliability).toBeNull();
    }
  });
  it("distinguishes volumetric coverage from full-demand-day reliability", () => {
    const candidate = evaluateTankSizes(
      { ...independent, rainfallMm: [3, 5, 0] },
      [0, 5],
    ).standardCandidates[1];
    expect(candidate.demandCoverage).toBe(8 / 15);
    expect(candidate.dailyReliability).toBe(1 / 3);
    expect(candidate.fullySuppliedDays).toBe(1);
  });
  it("rejects unsupported thresholds", () => {
    expect(() =>
      recommendCapacity(evaluateTankSizes(independent), 100 as 90),
    ).toThrow(RangeError);
  });
});

describe("marginal benefit and signed comparisons", () => {
  it("calculates standard-neighbor differences and a zero plateau increment", () => {
    const rows = evaluateTankSizes(independent, capacities).standardCandidates;
    expect(rows[0].marginal).toBeNull();
    expect(rows[1].marginal).toEqual({
      fromCapacityL: 0,
      additionalCapacityL: 5,
      additionalSupplyL: 10,
      incrementalYieldPer1000L: 2000,
    });
    expect(rows[2].marginal).toEqual({
      fromCapacityL: 5,
      additionalCapacityL: 5,
      additionalSupplyL: 5,
      incrementalYieldPer1000L: 1000,
    });
    expect(rows[3].marginal).toEqual({
      fromCapacityL: 10,
      additionalCapacityL: 10,
      additionalSupplyL: 0,
      incrementalYieldPer1000L: 0,
    });
  });
  it("reports raw incremental benefits without forcing decreasing gains", () => {
    const rows = evaluateTankSizes({
      ...independent,
      rainfallMm: [30000, ...Array<number>(29).fill(0)],
      dailyDemandL: 1000,
    }).standardCandidates;
    expect(rows[2].marginal?.additionalSupplyL).toBe(250);
    expect(rows[3].marginal?.additionalSupplyL).toBe(500);
  });
  it("preserves negative supply and coverage changes and positive overflow/shortfall changes", () => {
    const evaluation = evaluateTankSizes(
      { ...independent, rainfallMm: [10], dailyDemandL: 20 },
      [0, 5, 8, 10, 20],
    );
    const current = currentTankCandidate(evaluation, 20);
    const recommended = recommendCapacity(evaluation, 80).recommended!;
    expect(capacityChanges(current, recommended)).toEqual({
      capacityL: -12,
      supplyL: -2,
      demandCoverage: -0.09999999999999998,
      overflowL: 2,
      unmetDemandL: 2,
    });
    expect(capacityChanges(current, current)).toEqual({
      capacityL: 0,
      supplyL: 0,
      demandCoverage: 0,
      overflowL: 0,
      unmetDemandL: 0,
    });
  });
});

describe("period integrity and conservation for every candidate", () => {
  it("uses exactly the original 30 synthetic days without extrapolation", () => {
    const evaluation = evaluateTankSizes({
      ...DEFAULT_SCENARIO,
      rainfallMm: syntheticDataset(0).rainfallMm,
    });
    expect(
      evaluation.standardCandidates.every((row) => row.simulationDays === 30),
    ).toBe(true);
    expect(currentTankCandidate(evaluation, 2000)).toMatchObject({
      supplyL: 7250,
      overflowL: 5650,
      finalStorageL: 1500,
    });
  });
  it.each([2023, 2024, 2025] as const)(
    "uses a complete %s fixture and conserves daily and period water for all candidates",
    (year) => {
      const location = parseGeocoding({ results: [edirne] })[0];
      const data = parseArchive(
        archiveFixture(year),
        { location, year },
        "2026-10-23T18:00:00.000Z",
      );
      const before = JSON.stringify(data);
      const evaluation = evaluateTankSizes({
        ...DEFAULT_SCENARIO,
        rainfallMm: data.rainfallMm,
      });
      const candidates = comparisonCandidates(
        evaluation,
        currentTankCandidate(evaluation, 1234.5),
      );
      expect(candidates).toHaveLength(12);
      for (const candidate of candidates) {
        expect(candidate.simulationDays).toBe(year === 2024 ? 366 : 365);
        const result = waterBalance.simulate({
          ...evaluation.scenario,
          tankCapacityL: candidate.capacityL,
          initialStorageL: 0,
        });
        expect(candidate.supplyL).toBe(result.totals.usedL);
        expect(candidate.incomingL).toBeCloseTo(
          candidate.supplyL + candidate.overflowL + candidate.finalStorageL,
          7,
        );
        expect(candidate.massBalanceErrorL).toBeCloseTo(0, 7);
        for (const day of result.days)
          expect(day.openingStorageL + day.incomingL).toBeCloseTo(
            day.overflowL + day.usedL + day.remainingStorageL,
            8,
          );
      }
      expect(JSON.stringify(data)).toBe(before);
    },
  );
  it("supports nondecreasing supply across increasing capacity in deterministic fractional scenarios", () => {
    let seed = 7489;
    const next = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let run = 0; run < 60; run++) {
      const evaluation = evaluateTankSizes({
        roofAreaM2: next() * 2000,
        collectionEfficiency: next(),
        dailyDemandL: next() * 3000,
        rainfallMm: Array.from({ length: 40 }, () =>
          next() < 0.5 ? 0 : next() * 60,
        ),
      });
      for (let i = 1; i < evaluation.standardCandidates.length; i++)
        expect(
          evaluation.standardCandidates[i].supplyL + 1e-7,
        ).toBeGreaterThanOrEqual(evaluation.standardCandidates[i - 1].supplyL);
    }
  });
});
