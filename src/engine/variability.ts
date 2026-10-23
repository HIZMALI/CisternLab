import { simulate } from "./simulation";
import {
  currentTankCandidate,
  evaluateTankSizes,
  recommendCapacity,
  STANDARD_CAPACITIES_L,
} from "./tankSizing";
import type {
  SizingScenario,
  SizingTarget,
  TankCandidate,
  TankSizingEvaluation,
} from "./tankSizing";

export type ComparisonInputs = Readonly<Omit<SizingScenario, "rainfallMm">>;
export interface RainfallSequence {
  readonly key: string;
  readonly rainfallMm: readonly number[];
}
export interface AnnualCandidate extends TankCandidate {
  readonly rainfallMm: number;
  readonly annualDemandL: number;
  /** Conditional one-for-one substitution, not measured savings. */
  readonly modeledFreshwaterDisplacementL: number;
  readonly shortageDays: number;
  readonly longestShortageStreak: number;
}
export interface AnnualEvaluation {
  readonly key: string;
  readonly sizing: TankSizingEvaluation;
  readonly candidates: readonly AnnualCandidate[];
}
export interface VariabilityEvaluation {
  readonly inputs: ComparisonInputs;
  readonly annual: readonly AnnualEvaluation[];
  readonly capacitiesL: readonly number[];
}

function annualMetrics(
  sizing: TankSizingEvaluation,
  candidate: TankCandidate,
): AnnualCandidate {
  // The original engine supplies daily shortages and asserts mass conservation.
  // The unchanged sizing engine remains authoritative for its standard metrics.
  const result = simulate({
    ...sizing.scenario,
    tankCapacityL: candidate.capacityL,
    initialStorageL: 0,
  });
  let shortageDays = 0,
    run = 0,
    longestShortageStreak = 0;
  for (const day of result.days) {
    run = day.unmetDemandL > 0 ? run + 1 : 0;
    if (run > 0) shortageDays++;
    longestShortageStreak = Math.max(longestShortageStreak, run);
  }
  return Object.freeze({
    ...candidate,
    rainfallMm: result.totals.rainfallMm,
    annualDemandL: result.totals.demandL,
    modeledFreshwaterDisplacementL: candidate.supplyL,
    shortageDays,
    longestShortageStreak,
  });
}

/** Three independent sequences. Short synthetic engine fixtures are not historical adapters. */
export function evaluateVariability(
  inputs: ComparisonInputs,
  sequences: readonly RainfallSequence[],
  capacities: readonly number[] = STANDARD_CAPACITIES_L,
): VariabilityEvaluation {
  if (
    sequences.length !== 3 ||
    new Set(sequences.map((s) => s.key)).size !== 3 ||
    sequences.some((s) => !s.key.trim())
  )
    throw new RangeError("Provide three distinct labeled rainfall sequences.");
  const annual = sequences.map(({ key, rainfallMm }) => {
    const sizing = evaluateTankSizes({ ...inputs, rainfallMm }, capacities);
    return Object.freeze({
      key,
      sizing,
      candidates: Object.freeze(
        sizing.standardCandidates.map((c) => annualMetrics(sizing, c)),
      ),
    });
  });
  return Object.freeze({
    inputs: Object.freeze({
      roofAreaM2: inputs.roofAreaM2,
      collectionEfficiency: inputs.collectionEfficiency,
      dailyDemandL: inputs.dailyDemandL,
    }),
    annual: Object.freeze(annual),
    capacitiesL: Object.freeze(annual[0].candidates.map((c) => c.capacityL)),
  });
}

/** Threshold-only selection: no simulation. Each year uses its original sizing tolerance. */
export function decideVariability(
  evaluation: VariabilityEvaluation,
  target: SizingTarget = 90,
) {
  const annual = evaluation.annual.map((year) => ({
    key: year.key,
    ...recommendCapacity(year.sizing, target),
  }));
  const zero = annual.filter((year) => year.maximumStandardSupplyL === 0);
  const capacityL = zero.length
    ? null
    : (evaluation.capacitiesL.find(
        (capacity) =>
          capacity > 0 &&
          evaluation.annual.every(
            (year, index) =>
              year.candidates.find((c) => c.capacityL === capacity)!.supplyL +
                annual[index].comparisonToleranceL >=
              annual[index].targetSupplyL,
          ),
      ) ?? null);
  return {
    targetPercent: target,
    annual,
    capacityL,
    noBenefitReason: zero.length
      ? zero
          .map(
            (year) =>
              `${year.key}: ${year.noBenefitReason} Relative annual yield target is not informative.`,
          )
          .join(" ")
      : capacityL === null
        ? "No positive standard candidate satisfies every annual target."
        : null,
  };
}

/** A current-only capacity never joins the standard pool. Every year still starts empty. */
export function currentAnnualResults(
  evaluation: VariabilityEvaluation,
  capacityL: number,
) {
  return evaluation.annual.map((year) => ({
    key: year.key,
    candidate:
      year.candidates.find((c) => c.capacityL === capacityL) ??
      annualMetrics(year.sizing, currentTankCandidate(year.sizing, capacityL)),
  }));
}
export function summarizeVariability(
  current: ReturnType<typeof currentAnnualResults>,
) {
  const range = (metric: (c: AnnualCandidate) => number | null) => {
    const values = current.map(({ key, candidate }) => ({
      key,
      value: metric(candidate),
    }));
    if (values.some(({ value }) => value === null)) return null;
    const min = Math.min(...values.map(({ value }) => value!));
    const max = Math.max(...values.map(({ value }) => value!));
    return {
      min,
      max,
      lowestYears: values.filter((v) => v.value === min).map((v) => v.key),
      highestYears: values.filter((v) => v.value === max).map((v) => v.key),
    };
  };
  return {
    supply: range((c) => c.supplyL)!,
    coverage: range((c) => c.demandCoverage),
    rainfall: range((c) => c.rainfallMm)!,
    shortageDays: range((c) => c.shortageDays)!,
    shortageStreak: range((c) => c.longestShortageStreak)!,
  };
}
