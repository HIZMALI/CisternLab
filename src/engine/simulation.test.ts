import { describe, expect, it } from "vitest";
import { simulate } from "./simulation";
import type { SimulationInput } from "./simulation";
import { DEMO_DATASETS } from "../data/demo";

const reference: SimulationInput = {
  roofAreaM2: 100,
  rainfallMm: [10],
  collectionEfficiency: 0.8,
  tankCapacityL: 500,
  dailyDemandL: 200,
  initialStorageL: 0,
};

describe("daily rain-before-demand engine", () => {
  it("matches the required reference scenario exactly", () => {
    expect(simulate(reference).days[0]).toEqual({
      day: 1,
      rainfallMm: 10,
      openingStorageL: 0,
      incomingL: 800,
      overflowL: 300,
      usedL: 200,
      remainingStorageL: 300,
      unmetDemandL: 0,
    });
  });
  it("spills rain before demand, with no sub-daily demand freeing tank capacity", () => {
    const day = simulate({ ...reference, initialStorageL: 500 }).days[0];
    expect(day.overflowL).toBe(800);
    expect(day.remainingStorageL).toBe(300);
  });
  it("serves zero-rainfall demand from opening storage", () => {
    const day = simulate({
      ...reference,
      rainfallMm: [0],
      initialStorageL: 300,
    }).days[0];
    expect(day.incomingL).toBe(0);
    expect(day.usedL).toBe(200);
    expect(day.remainingStorageL).toBe(100);
    expect(day.unmetDemandL).toBe(0);
  });
  it("records unmet demand for an empty tank on a dry day", () => {
    const day = simulate({ ...reference, rainfallMm: [0] }).days[0];
    expect(day.usedL).toBe(0);
    expect(day.remainingStorageL).toBe(0);
    expect(day.unmetDemandL).toBe(200);
  });
  it("retains water with zero demand and leaves coverage undefined", () => {
    const result = simulate({ ...reference, dailyDemandL: 0 });
    expect(result.days[0].remainingStorageL).toBe(500);
    expect(result.days[0].overflowL).toBe(300);
    expect(result.totals.usedL).toBe(0);
    expect(result.totals.unmetDemandL).toBe(0);
    expect(result.totals.demandCoverage).toBeNull();
  });
  it("spills all collected water with zero tank capacity", () => {
    const day = simulate({ ...reference, tankCapacityL: 0 }).days[0];
    expect(day.overflowL).toBe(800);
    expect(day.usedL).toBe(0);
    expect(day.remainingStorageL).toBe(0);
    expect(day.unmetDemandL).toBe(200);
  });
  it("handles collection efficiency of zero", () => {
    expect(
      simulate({ ...reference, collectionEfficiency: 0 }).totals.incomingL,
    ).toBe(0);
  });
  it("handles collection efficiency of one", () => {
    expect(
      simulate({ ...reference, collectionEfficiency: 1 }).totals.incomingL,
    ).toBe(1000);
  });
  it("handles zero roof area", () => {
    expect(simulate({ ...reference, roofAreaM2: 0 }).totals.usedL).toBe(0);
  });
  it("carries storage across multiple days and accounts for demand shortfalls", () => {
    const result = simulate({ ...reference, rainfallMm: [10, 0, 0, 0] });
    expect(result.days.map((d) => d.openingStorageL)).toEqual([0, 300, 100, 0]);
    expect(result.days.map((d) => d.remainingStorageL)).toEqual([
      300, 100, 0, 0,
    ]);
    expect(result.days.map((d) => d.unmetDemandL)).toEqual([0, 0, 100, 200]);
    expect(result.totals.usedL).toBe(500);
    expect(result.totals.demandCoverage).toBe(0.625);
  });
  it("retains decimal precision instead of rounding internally", () => {
    const result = simulate({
      ...reference,
      roofAreaM2: 1.3,
      rainfallMm: [0.7, 0.2],
      dailyDemandL: 0.1,
    });
    expect(result.days[0].incomingL).toBeCloseTo(0.728, 12);
    expect(result.totals.finalStorageL).toBeCloseTo(0.736, 12);
  });
  it("does not mutate input and produces identical repeated results", () => {
    const input = Object.freeze({
      ...reference,
      rainfallMm: Object.freeze([10, 0, 2]),
    });
    const first = simulate(input);
    expect(simulate(input)).toEqual(first);
    first.days[0].usedL = -100;
    expect(simulate(input).days[0].usedL).toBe(200);
    expect(input.rainfallMm).toEqual([10, 0, 2]);
  });
});

describe("input validation", () => {
  it.each([
    "roofAreaM2",
    "collectionEfficiency",
    "tankCapacityL",
    "dailyDemandL",
    "initialStorageL",
  ] as const)("rejects negative and non-finite %s", (key) => {
    for (const value of [-1, NaN, Infinity, -Infinity]) {
      expect(() => simulate({ ...reference, [key]: value })).toThrow(
        RangeError,
      );
    }
  });
  it("rejects efficiency above one", () => {
    expect(() =>
      simulate({ ...reference, collectionEfficiency: 1.01 }),
    ).toThrow(/between 0 and 1/);
  });
  it("rejects initial storage above tank capacity", () => {
    expect(() => simulate({ ...reference, initialStorageL: 501 })).toThrow(
      /exceed tank capacity/,
    );
  });
  it.each([-1, NaN, Infinity, -Infinity])(
    "rejects invalid rainfall %s",
    (rain) => {
      expect(() => simulate({ ...reference, rainfallMm: [rain] })).toThrow(
        RangeError,
      );
    },
  );
  it("rejects empty and sparse rainfall arrays", () => {
    expect(() => simulate({ ...reference, rainfallMm: [] })).toThrow(
      RangeError,
    );
    expect(() =>
      simulate({ ...reference, rainfallMm: new Array<number>(2) }),
    ).toThrow(RangeError);
  });
  it("rejects derived numeric overflow", () => {
    expect(() =>
      simulate({ ...reference, roofAreaM2: Number.MAX_VALUE }),
    ).toThrow(/numeric range/);
    expect(() =>
      simulate({
        ...reference,
        dailyDemandL: Number.MAX_VALUE,
        rainfallMm: [0, 0],
      }),
    ).toThrow(/numeric range/);
  });
});

describe("mass conservation", () => {
  it("balances daily and total supply in 200 deterministic fractional scenarios", () => {
    let seed = 4179;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let scenario = 0; scenario < 200; scenario++) {
      const capacity = next() * 20000;
      const input: SimulationInput = {
        roofAreaM2: next() * 2000,
        rainfallMm: Array.from({ length: 60 }, () =>
          next() < 0.5 ? 0 : next() * 70,
        ),
        collectionEfficiency: next(),
        tankCapacityL: capacity,
        dailyDemandL: next() * 3000,
        initialStorageL: next() * capacity,
      };
      const result = simulate(input);
      for (const day of result.days) {
        expect(day.openingStorageL + day.incomingL).toBeCloseTo(
          day.overflowL + day.usedL + day.remainingStorageL,
          7,
        );
        expect(day.usedL + day.unmetDemandL).toBeCloseTo(input.dailyDemandL, 7);
        expect(day.remainingStorageL).toBeGreaterThanOrEqual(0);
        expect(day.remainingStorageL).toBeLessThanOrEqual(capacity);
      }
      expect(input.initialStorageL + result.totals.incomingL).toBeCloseTo(
        result.totals.usedL +
          result.totals.overflowL +
          result.totals.finalStorageL,
        6,
      );
      expect(result.totals.demandL).toBeCloseTo(
        result.totals.usedL + result.totals.unmetDemandL,
        6,
      );
    }
  });
  it.each(DEMO_DATASETS)(
    "has 30 valid, repeatable, conserved days for $name",
    (dataset) => {
      expect(dataset.rainfallMm).toHaveLength(30);
      const input = { ...reference, rainfallMm: dataset.rainfallMm };
      const result = simulate(input);
      expect(result).toEqual(simulate(input));
      expect(result.totals.massBalanceErrorL).toBeCloseTo(0, 8);
    },
  );
});
