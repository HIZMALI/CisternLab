import type { HistoricalComparisonDataset } from "../data/historicalComparison";
import { validateHistoricalComparison } from "../data/historicalComparison";
import type { SizingTarget } from "./tankSizing";
import {
  currentAnnualResults,
  decideVariability,
  summarizeVariability,
} from "./variability";
import type { VariabilityEvaluation } from "./variability";

export const ANALYSIS_SCHEMA_VERSION = "cisternlab.historical-comparison.v1";
export const COMPARISON_ASSUMPTIONS = Object.freeze({
  initialStorageEachYearL: 0,
  independentYears: true,
  carryoverBetweenYears: false,
  dailyModel: "Rain before overflow before demand; no sub-daily precision.",
  shortageDefinition:
    "Any positive daily unmet volume; streaks reset at each annual boundary. Not meteorological drought.",
  decisionRule:
    "Smallest positive standard candidate satisfying target fraction of each annual standard maximum, with 1e-10 times that annual maximum in liters as tolerance.",
  displacement:
    "Modeled freshwater displacement equals modeled rainwater supplied only if it substitutes existing freshwater demand; not measured savings.",
  limitation:
    "Historical sensitivity comparison over 2023–2025 only. Not a climate normal, forecast, trend, calibrated risk measure, engineering guarantee, or financial optimum.",
});
export const COMPARISON_ATTRIBUTION = Object.freeze({
  weather:
    "Open-Meteo https://open-meteo.com/ — CC BY 4.0 https://creativecommons.org/licenses/by/4.0/",
  model:
    "ERA5 / Copernicus https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels",
  geocoding: "GeoNames https://www.geonames.org/",
});

function assertMatching(
  data: HistoricalComparisonDataset,
  evaluation: VariabilityEvaluation,
) {
  validateHistoricalComparison(data.years, data.location);
  if (
    evaluation.annual.length !== 3 ||
    data.years.some((dataset, i) => {
      const year = evaluation.annual[i];
      return (
        year.key !== String(dataset.year) ||
        dataset.rainfallMm.length !== year.sizing.scenario.rainfallMm.length ||
        dataset.rainfallMm.some(
          (rain, day) => rain !== year.sizing.scenario.rainfallMm[day],
        )
      );
    })
  )
    throw new RangeError(
      "Export rainfall and evaluated annual sequences do not match.",
    );
}
export function historicalSnapshot(
  data: HistoricalComparisonDataset,
  evaluation: VariabilityEvaluation,
  capacityL: number,
  target: SizingTarget,
) {
  assertMatching(data, evaluation);
  const current = currentAnnualResults(evaluation, capacityL);
  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    classification: "ESTIMATED RESULT — Historical sensitivity comparison",
    datasets: data.years,
    inputs: { ...evaluation.inputs, currentTankCapacityL: capacityL },
    assumptions: COMPARISON_ASSUMPTIONS,
    attribution: COMPARISON_ATTRIBUTION,
    standardCapacitiesL: evaluation.capacitiesL,
    targetPercent: target,
    decision: decideVariability(evaluation, target),
    annualResults: evaluation.annual.map((year) => ({
      year: year.key,
      candidates: year.candidates,
    })),
    currentAnnualResults: current,
    variability: summarizeVariability(current),
  };
}
export function historicalComparisonToJson(
  data: HistoricalComparisonDataset,
  evaluation: VariabilityEvaluation,
  capacityL: number,
  target: SizingTarget,
): string {
  return (
    JSON.stringify(
      historicalSnapshot(data, evaluation, capacityL, target),
      null,
      2,
    ) + "\n"
  );
}
function cell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe =
    typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(raw)
      ? `'${raw}`
      : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function historicalComparisonToCsv(
  data: HistoricalComparisonDataset,
  evaluation: VariabilityEvaluation,
  capacityL: number,
  target: SizingTarget,
): string {
  const snapshot = historicalSnapshot(data, evaluation, capacityL, target);
  const columns = [
    "schema_version",
    "year",
    "capacity_L",
    "provider",
    "model",
    "location",
    "location_id",
    "rainfall_mm",
    "used_L",
    "modeled_freshwater_displacement_L",
    "annual_demand_L",
    "demand_coverage_fraction",
    "overflow_L",
    "unmet_L",
    "fully_supplied_days",
    "shortage_days",
    "longest_shortage_streak_days",
    "end_storage_L",
    "target_percent",
    "annual_recommendation_L",
    "three_year_comparison_capacity_L",
    "annual_maximum_standard_supply_L",
    "annual_target_L",
    "annual_tolerance_L",
    "roof_m2",
    "efficiency_fraction",
    "daily_demand_L",
    "current_tank_L",
    "initial_storage_each_year_L",
    "provenance_json",
    "attribution_json",
    "assumptions_json",
    "no_recommendation_reason",
  ];
  const rows: unknown[][] = [columns];
  evaluation.annual.forEach((year, index) => {
    const dataset = data.years[index],
      decision = snapshot.decision.annual[index];
    const { rainfallMm: _rainfall, dates: _dates, ...provenance } = dataset;
    // Raw dated arrays are in the companion JSON; CSV metadata remains repeated and parseable.
    void _rainfall;
    void _dates;
    year.candidates.forEach((c) =>
      rows.push([
        ANALYSIS_SCHEMA_VERSION,
        year.key,
        c.capacityL,
        dataset.provider,
        dataset.model,
        dataset.name,
        dataset.location.id,
        c.rainfallMm,
        c.supplyL,
        c.modeledFreshwaterDisplacementL,
        c.annualDemandL,
        c.demandCoverage,
        c.overflowL,
        c.unmetDemandL,
        c.fullySuppliedDays,
        c.shortageDays,
        c.longestShortageStreak,
        c.finalStorageL,
        target,
        decision.recommended?.capacityL,
        snapshot.decision.capacityL,
        decision.maximumStandardSupplyL,
        decision.targetSupplyL,
        decision.comparisonToleranceL,
        evaluation.inputs.roofAreaM2,
        evaluation.inputs.collectionEfficiency,
        evaluation.inputs.dailyDemandL,
        capacityL,
        0,
        JSON.stringify(provenance),
        JSON.stringify(COMPARISON_ATTRIBUTION),
        JSON.stringify(COMPARISON_ASSUMPTIONS),
        snapshot.decision.noBenefitReason,
      ]),
    );
  });
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
