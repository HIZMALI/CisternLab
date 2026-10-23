import { simulate, validateInput } from "./simulation";
import type { SimulationInput } from "./simulation";

export const STANDARD_CAPACITIES_L = Object.freeze([
  0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000,
]);
export const SIZING_TARGETS = [80, 90, 95, 98] as const;
export type SizingTarget = (typeof SIZING_TARGETS)[number];
export type SizingScenario = Readonly<
  Omit<SimulationInput, "tankCapacityL" | "initialStorageL">
>;

export interface MarginalBenefit {
  readonly fromCapacityL: number;
  readonly additionalCapacityL: number;
  readonly additionalSupplyL: number;
  /** Additional liters delivered per 1,000 L extra storage, over this period. */
  readonly incrementalYieldPer1000L: number;
}
export interface TankCandidate {
  readonly capacityL: number;
  readonly isStandard: boolean;
  readonly supplyL: number;
  readonly demandCoverage: number | null;
  readonly overflowL: number;
  readonly unmetDemandL: number;
  readonly finalStorageL: number;
  readonly fullySuppliedDays: number;
  readonly simulationDays: number;
  readonly dailyReliability: number | null;
  readonly incomingL: number;
  readonly massBalanceErrorL: number;
  readonly marginal: MarginalBenefit | null;
}
export interface TankSizingEvaluation {
  readonly scenario: SizingScenario;
  readonly standardCandidates: readonly TankCandidate[];
  readonly maximumStandardSupplyL: number;
  readonly noBenefitReason: string | null;
}
export interface CapacityDecision {
  readonly targetPercent: SizingTarget;
  readonly maximumStandardSupplyL: number;
  readonly targetSupplyL: number;
  readonly comparisonToleranceL: number;
  readonly recommended: TankCandidate | null;
  readonly achievedFraction: number | null;
  readonly noBenefitReason: string | null;
}

/** Validated, ascending, deduplicated; the caller's array is never sorted in place. */
export function normalizeCapacities(capacities: readonly number[]): number[] {
  if (!Array.isArray(capacities) || capacities.length === 0)
    throw new RangeError("Provide at least one standard candidate capacity.");
  const values = Array.from(capacities);
  if (
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || value < 0,
    )
  )
    throw new RangeError(
      "Candidate capacities must be finite, non-negative numbers.",
    );
  return [...new Set(values.map((value) => (value === 0 ? 0 : value)))].sort(
    (a, b) => a - b,
  );
}

function evaluateCapacity(
  scenario: SizingScenario,
  capacityL: number,
  isStandard: boolean,
): TankCandidate {
  // Deliberately override any extra runtime properties after spreading the input.
  // Dashboard initial water cannot confer an advantage on any comparison tank.
  const result = simulate({
    ...scenario,
    tankCapacityL: capacityL,
    initialStorageL: 0,
  });
  const fullySuppliedDays = result.days.filter(
    (day) => day.unmetDemandL === 0,
  ).length;
  return Object.freeze({
    capacityL,
    isStandard,
    supplyL: result.totals.usedL,
    demandCoverage: result.totals.demandCoverage,
    overflowL: result.totals.overflowL,
    unmetDemandL: result.totals.unmetDemandL,
    finalStorageL: result.totals.finalStorageL,
    fullySuppliedDays,
    simulationDays: result.days.length,
    dailyReliability:
      scenario.dailyDemandL > 0 ? fullySuppliedDays / result.days.length : null,
    incomingL: result.totals.incomingL,
    massBalanceErrorL: result.totals.massBalanceErrorL,
    marginal: null,
  });
}

/** Run only standard candidates. No React, networking, clock, or random values. */
export function evaluateTankSizes(
  input: SizingScenario,
  capacities: readonly number[] = STANDARD_CAPACITIES_L,
): TankSizingEvaluation {
  const normalized = normalizeCapacities(capacities);
  validateInput({ ...input, tankCapacityL: 0, initialStorageL: 0 });
  const scenario = Object.freeze({
    roofAreaM2: input.roofAreaM2,
    collectionEfficiency: input.collectionEfficiency,
    dailyDemandL: input.dailyDemandL,
    rainfallMm: Object.freeze([...input.rainfallMm]),
  });
  const raw = normalized.map((capacity) =>
    evaluateCapacity(scenario, capacity, true),
  );
  const standardCandidates = raw.map((candidate, index) => {
    if (index === 0) return candidate;
    const previous = raw[index - 1];
    const additionalSupplyL = candidate.supplyL - previous.supplyL;
    const additionalCapacityL = candidate.capacityL - previous.capacityL;
    return Object.freeze({
      ...candidate,
      marginal: Object.freeze({
        fromCapacityL: previous.capacityL,
        additionalCapacityL,
        additionalSupplyL,
        incrementalYieldPer1000L:
          (additionalSupplyL / additionalCapacityL) * 1000,
      }),
    });
  });
  const maximumStandardSupplyL = Math.max(
    ...standardCandidates.map((candidate) => candidate.supplyL),
  );
  let noBenefitReason: string | null = null;
  if (maximumStandardSupplyL === 0) {
    noBenefitReason =
      input.dailyDemandL === 0
        ? "Daily demand is zero, so no rainwater is delivered."
        : input.roofAreaM2 === 0
          ? "Roof area is zero, so no rainfall enters the tanks."
          : input.collectionEfficiency === 0
            ? "Collection efficiency is zero, so no rainfall is collected."
            : input.rainfallMm.every((rain) => rain === 0)
              ? "The active period has zero rainfall."
              : "No usable rainwater is delivered by the tested capacities under the current assumptions.";
  }
  return Object.freeze({
    scenario,
    standardCandidates: Object.freeze(standardCandidates),
    maximumStandardSupplyL,
    noBenefitReason,
  });
}

/** Cheap threshold selection; never reruns the daily model. Smallest capacity wins ties. */
export function recommendCapacity(
  evaluation: TankSizingEvaluation,
  targetPercent: SizingTarget = 90,
): CapacityDecision {
  if (!SIZING_TARGETS.includes(targetPercent))
    throw new RangeError("Choose an 80%, 90%, 95%, or 98% target.");
  const maximumStandardSupplyL = evaluation.maximumStandardSupplyL;
  const targetSupplyL = (targetPercent / 100) * maximumStandardSupplyL;
  // Relative to actual supply, with no absolute 1 L floor: zero cannot pass a tiny positive target.
  const comparisonToleranceL = maximumStandardSupplyL * 1e-10;
  const recommended =
    maximumStandardSupplyL > 0
      ? (evaluation.standardCandidates.find(
          (candidate) =>
            candidate.capacityL > 0 &&
            candidate.supplyL + comparisonToleranceL >= targetSupplyL,
        ) ?? null)
      : null;
  return Object.freeze({
    targetPercent,
    maximumStandardSupplyL,
    targetSupplyL,
    comparisonToleranceL,
    recommended,
    achievedFraction:
      recommended && maximumStandardSupplyL > 0
        ? recommended.supplyL / maximumStandardSupplyL
        : null,
    noBenefitReason: evaluation.noBenefitReason,
  });
}

/** Current-only capacities never join the recommendation pool or standard marginal chain. */
export function currentTankCandidate(
  evaluation: TankSizingEvaluation,
  capacityL: number,
): TankCandidate {
  if (
    typeof capacityL !== "number" ||
    !Number.isFinite(capacityL) ||
    capacityL < 0
  )
    throw new RangeError(
      "Current capacity must be a finite, non-negative number.",
    );
  return (
    evaluation.standardCandidates.find(
      (candidate) => candidate.capacityL === capacityL,
    ) ?? evaluateCapacity(evaluation.scenario, capacityL, false)
  );
}

export function comparisonCandidates(
  evaluation: TankSizingEvaluation,
  current: TankCandidate,
): readonly TankCandidate[] {
  return current.isStandard
    ? evaluation.standardCandidates
    : [...evaluation.standardCandidates, current].sort(
        (a, b) => a.capacityL - b.capacityL,
      );
}

/** Signed recommended-minus-current changes. Coverage change is a fraction (×100 for pp). */
export function capacityChanges(
  current: TankCandidate,
  recommended: TankCandidate,
) {
  return {
    capacityL: recommended.capacityL - current.capacityL,
    supplyL: recommended.supplyL - current.supplyL,
    demandCoverage:
      current.demandCoverage === null || recommended.demandCoverage === null
        ? null
        : recommended.demandCoverage - current.demandCoverage,
    overflowL: recommended.overflowL - current.overflowL,
    unmetDemandL: recommended.unmetDemandL - current.unmetDemandL,
  };
}
