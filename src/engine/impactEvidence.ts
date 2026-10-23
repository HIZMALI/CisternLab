import { simulate } from "./simulation";
import {
  currentTankCandidate,
  evaluateTankSizes,
  recommendCapacity,
  STANDARD_CAPACITIES_L,
} from "./tankSizing";
import type {
  SizingTarget,
  TankCandidate,
  TankSizingEvaluation,
} from "./tankSizing";
import {
  currentAnnualResults,
  decideVariability,
  evaluateVariability,
} from "./variability";
import type {
  AnnualCandidate,
  ComparisonInputs,
  VariabilityEvaluation,
} from "./variability";
import type { RainfallDataset } from "../data/rainfall";
import { locationLabel } from "../data/rainfall";
import type { HistoricalComparisonDataset } from "../data/historicalComparison";
import {
  ARCHIVE_CLASSIFICATION,
  ARCHIVE_SHA256,
} from "../data/archivedEvidence";

export const IMPACT_CAVEAT =
  "Potential freshwater displacement equals modeled harvested rainwater delivered ONLY IF each liter replaces an otherwise used liter of freshwater. This is a conditional estimate, not measured savings, municipal consumption reduction, carbon reduction or a financial benefit.";
export const IMPACT_LIMITS =
  "Daily rain-before-demand model; fixed demand and efficiency; independent empty starts. No sub-daily precision, drainage routing, treatment, first flush, evaporation or leakage. Actual implementation depends on installation, water quality, actual usage and relevant regulations. Three years cannot establish long-term climate reliability or trends.";
export interface EvidenceSource {
  readonly mode: "active" | "archive" | "comparison";
  readonly identity: string;
  readonly classification: string;
  readonly period: string;
  readonly datasets: readonly RainfallDataset[];
  readonly archiveSha256: string | null;
}
export function activeImpactSource(dataset: RainfallDataset): EvidenceSource {
  return {
    mode: "active",
    identity: dataset.name,
    classification: dataset.classification,
    period:
      dataset.kind === "synthetic"
        ? `${dataset.rainfallMm.length}-day synthetic period (not annual)`
        : `${dataset.startDate} to ${dataset.endDate}`,
    datasets: [dataset],
    archiveSha256: null,
  };
}
export function comparisonImpactSource(
  data: HistoricalComparisonDataset,
  archived = false,
): EvidenceSource {
  return {
    mode: archived ? "archive" : "comparison",
    identity: locationLabel(data.location),
    classification: archived
      ? ARCHIVE_CLASSIFICATION
      : "HISTORICAL REANALYSIS — ERA5",
    period: "2023–2025 · three independent complete calendar years",
    datasets: data.years,
    archiveSha256: archived ? ARCHIVE_SHA256 : null,
  };
}
export interface ImpactInputs extends ComparisonInputs {
  readonly currentCapacityL: number;
}
export interface ImpactMetric {
  readonly capacityL: number;
  readonly deliveredL: number;
  readonly potentialFreshwaterDisplacementL: number;
  readonly potentialFreshwaterDisplacementM3: number;
  readonly demandL: number;
  readonly coverage: number | null;
  readonly unmetL: number;
  readonly overflowL: number;
  readonly unusedStorageL: number;
  readonly fullDemandDays: number;
  readonly shortageDays: number;
  readonly longestShortageStreak: number;
  readonly days: number;
  readonly rainfallMm: number;
  readonly incomingL: number;
}
interface ImpactPeriod {
  readonly key: string;
  readonly dataset: RainfallDataset;
  readonly sizing: TankSizingEvaluation;
  readonly standard: readonly ImpactMetric[];
}
export interface ImpactEvaluation {
  readonly source: EvidenceSource;
  readonly inputs: ImpactInputs;
  readonly periods: readonly ImpactPeriod[];
  readonly variability: VariabilityEvaluation | null;
  readonly capacitiesL: readonly number[];
}
function fromAnnual(c: AnnualCandidate): ImpactMetric {
  return Object.freeze({
    capacityL: c.capacityL,
    deliveredL: c.supplyL,
    potentialFreshwaterDisplacementL: c.supplyL,
    potentialFreshwaterDisplacementM3: c.supplyL / 1000,
    demandL: c.annualDemandL,
    coverage: c.demandCoverage,
    unmetL: c.unmetDemandL,
    overflowL: c.overflowL,
    unusedStorageL: c.finalStorageL,
    fullDemandDays: c.fullySuppliedDays,
    shortageDays: c.shortageDays,
    longestShortageStreak: c.longestShortageStreak,
    days: c.simulationDays,
    rainfallMm: c.rainfallMm,
    incomingL: c.incomingL,
  });
}
function singleMetric(
  sizing: TankSizingEvaluation,
  candidate: TankCandidate,
): ImpactMetric {
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
    if (run) shortageDays++;
    longestShortageStreak = Math.max(run, longestShortageStreak);
  }
  return fromAnnual({
    ...candidate,
    annualDemandL: result.totals.demandL,
    rainfallMm: result.totals.rainfallMm,
    modeledFreshwaterDisplacementL: candidate.supplyL,
    shortageDays,
    longestShortageStreak,
  });
}

/** Reuses established engines; never uses dashboard initial water or saved result tables. */
export function evaluateImpactEvidence(
  source: EvidenceSource,
  inputs: ImpactInputs,
  capacities: readonly number[] = STANDARD_CAPACITIES_L,
): ImpactEvaluation {
  if (!Number.isFinite(inputs.currentCapacityL) || inputs.currentCapacityL < 0)
    throw new RangeError("Current capacity must be finite and nonnegative.");
  if (source.datasets.length !== 1 && source.datasets.length !== 3)
    throw new RangeError(
      "Impact evidence needs one active period or three independent years.",
    );
  const pool = [0, ...capacities];
  const variability =
    source.datasets.length === 3
      ? evaluateVariability(
          inputs,
          source.datasets.map((d) => ({
            key: String(d.year),
            rainfallMm: d.rainfallMm,
          })),
          pool,
        )
      : null;
  const periods = source.datasets.map((dataset, i) => {
    const sizing =
      variability?.annual[i].sizing ??
      evaluateTankSizes({ ...inputs, rainfallMm: dataset.rainfallMm }, pool);
    return Object.freeze({
      key:
        dataset.kind === "synthetic"
          ? "Synthetic period"
          : String(dataset.year),
      dataset,
      sizing,
      standard: Object.freeze(
        variability
          ? variability.annual[i].candidates.map(fromAnnual)
          : sizing.standardCandidates.map((c) => singleMetric(sizing, c)),
      ),
    });
  });
  return Object.freeze({
    source,
    inputs: Object.freeze({
      roofAreaM2: inputs.roofAreaM2,
      collectionEfficiency: inputs.collectionEfficiency,
      dailyDemandL: inputs.dailyDemandL,
      currentCapacityL: inputs.currentCapacityL,
    }),
    periods: Object.freeze(periods),
    variability,
    capacitiesL: Object.freeze(periods[0].standard.map((c) => c.capacityL)),
  });
}
/** Threshold selection only. Original annual/cross-year algorithms remain authoritative. */
export function impactCapacityDecision(
  e: ImpactEvaluation,
  target: SizingTarget = 90,
) {
  if (e.variability) {
    const d = decideVariability(e.variability, target);
    return {
      capacityL: d.capacityL,
      reason: d.noBenefitReason,
      target,
      annual: d.annual,
    };
  }
  const d = recommendCapacity(e.periods[0].sizing, target);
  return {
    capacityL: d.recommended?.capacityL ?? null,
    reason: d.noBenefitReason,
    target,
    annual: [{ key: e.periods[0].key, ...d }],
  };
}
export function currentImpactMetrics(
  e: ImpactEvaluation,
): readonly ImpactMetric[] {
  if (e.variability)
    return currentAnnualResults(e.variability, e.inputs.currentCapacityL).map(
      (y) => fromAnnual(y.candidate),
    );
  return e.periods.map(
    (p) =>
      p.standard.find((c) => c.capacityL === e.inputs.currentCapacityL) ??
      singleMetric(
        p.sizing,
        currentTankCandidate(p.sizing, e.inputs.currentCapacityL),
      ),
  );
}
/** Positive unmet reduction means less remaining demand; coverage changes are percentage points. */
export function impactDifference(from: ImpactMetric, to: ImpactMetric) {
  return {
    capacityChangeL: to.capacityL - from.capacityL,
    additionalDeliveredL: to.deliveredL - from.deliveredL,
    unmetReductionL: from.unmetL - to.unmetL,
    coverageChangePp:
      from.coverage === null || to.coverage === null
        ? null
        : (to.coverage - from.coverage) * 100,
    overflowChangeL: to.overflowL - from.overflowL,
  };
}
export function sumIndependentImpacts(metrics: readonly ImpactMetric[]) {
  const sum = (
    key:
      | "deliveredL"
      | "demandL"
      | "unmetL"
      | "overflowL"
      | "unusedStorageL"
      | "fullDemandDays"
      | "shortageDays"
      | "days",
  ) => {
    const n = metrics.reduce((total, m) => total + m[key], 0);
    if (!Number.isFinite(n))
      throw new RangeError("Impact totals exceed the supported numeric range.");
    return n;
  };
  const deliveredL = sum("deliveredL"),
    demandL = sum("demandL");
  return {
    deliveredL,
    potentialFreshwaterDisplacementL: deliveredL,
    potentialFreshwaterDisplacementM3: deliveredL / 1000,
    demandL,
    coverage: demandL > 0 ? deliveredL / demandL : null,
    unmetL: sum("unmetL"),
    overflowL: sum("overflowL"),
    independentEndingStorageSumL: sum("unusedStorageL"),
    fullDemandDays: sum("fullDemandDays"),
    shortageDays: sum("shortageDays"),
    longestWithinYearShortageStreak: Math.max(
      0,
      ...metrics.map((m) => m.longestShortageStreak),
    ),
    days: sum("days"),
  };
}
export function buildImpactView(
  e: ImpactEvaluation,
  current: readonly ImpactMetric[],
  target: SizingTarget,
  selectedCapacityL: number,
) {
  if (!e.capacitiesL.includes(selectedCapacityL))
    throw new RangeError("Choose a tested standard alternative capacity.");
  const decision = impactCapacityDecision(e, target);
  const periods = e.periods.map((p, i) => {
    const baseline = p.standard.find((c) => c.capacityL === 0)!,
      selected = p.standard.find((c) => c.capacityL === selectedCapacityL)!;
    const recommended =
      decision.capacityL === null
        ? null
        : p.standard.find((c) => c.capacityL === decision.capacityL)!;
    return {
      key: p.key,
      dataset: p.dataset,
      baseline,
      current: current[i],
      selected,
      recommended,
      baselineToSelected: impactDifference(baseline, selected),
      currentToSelected: impactDifference(current[i], selected),
      currentToRecommended: recommended
        ? impactDifference(current[i], recommended)
        : null,
    };
  });
  return {
    decision,
    selectedCapacityL,
    periods,
    totals: sumIndependentImpacts(periods.map((p) => p.selected)),
  };
}
export type ImpactView = ReturnType<typeof buildImpactView>;
const format = (n: number) =>
  n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
export function impactKeyFindings(
  e: ImpactEvaluation,
  view: ImpactView,
): string {
  const { inputs: s, source } = e;
  return [
    `CisternLab — ESTIMATED RESULT. ${source.classification}: ${source.identity}; ${source.period}.`,
    `Assumptions: roof ${format(s.roofAreaM2)} m², efficiency ${format(s.collectionEfficiency * 100)}%, non-potable demand ${format(s.dailyDemandL)} L/day; 0 L starting storage in every independent period. Rain before demand.`,
    `Selected tested capacity ${format(view.selectedCapacityL)} L; current ${format(s.currentCapacityL)} L. Recommended tested capacity: ${view.decision.capacityL === null ? `none — ${view.decision.reason}` : `${format(view.decision.capacityL)} L at ${view.decision.target}% of each period's maximum standard tested supply`}.`,
    ...view.periods.map(
      (p) =>
        `${p.key} (${p.selected.days} days): modeled supply / potential freshwater displacement ${format(p.selected.deliveredL)} L (${format(p.selected.potentialFreshwaterDisplacementM3)} m³); demand coverage ${p.selected.coverage === null ? "undefined (zero demand)" : `${format(p.selected.coverage * 100)}%`}; remaining freshwater requirement ${format(p.selected.unmetL)} L. No-harvesting baseline: 0 L delivered, ${format(p.baseline.unmetL)} L remaining demand. Selected minus current supply: ${p.currentToSelected.additionalDeliveredL >= 0 ? "+" : ""}${format(p.currentToSelected.additionalDeliveredL)} L; coverage change ${p.currentToSelected.coverageChangePp === null ? "undefined" : `${format(p.currentToSelected.coverageChangePp)} percentage points`}.`,
    ),
    ...(view.periods.length > 1
      ? [
          `Three-year total, SUM of independent annual outputs: ${format(view.totals.deliveredL)} L (${format(view.totals.potentialFreshwaterDisplacementM3)} m³), not a single-year estimate or continuous tank simulation.`,
        ]
      : []),
    IMPACT_CAVEAT,
    "Tank overflow differences are modeled tank balances, not verified runoff or flood-risk reductions.",
    IMPACT_LIMITS,
    source.archiveSha256
      ? `Original archive SHA-256: ${source.archiveSha256}. Weather: Open-Meteo / ERA5 / Copernicus, CC BY 4.0; archived capture, not a new live request.`
      : `Original dated rainfall, source provenance and inputs are available through the existing daily/sizing/historical exports; synthetic data is not historical observation.`,
  ].join("\n\n");
}
/** One data model feeds screen, copy and print; no second impact calculation for the brief. */
export function evidenceBriefData(e: ImpactEvaluation, view: ImpactView) {
  return {
    title: "CisternLab · Impact Evidence Brief",
    source: e.source,
    inputs: e.inputs,
    startingStorageEachPeriodL: 0,
    analysis: view,
    keyFindings: impactKeyFindings(e, view),
    conditionalWarning: IMPACT_CAVEAT,
    limitations: IMPACT_LIMITS,
    decisionMethod:
      "Smallest positive tested standard capacity reaching the target fraction of maximum standard tested supply; for three years it must satisfy every annual target. Tolerance: 1e-10 × each period's maximum supply. No relative recommendation when any period has zero achievable supply.",
  };
}
