import { locationLabel } from "../data/rainfall";
import type { RainfallDataset } from "../data/rainfall";
import {
  comparisonCandidates,
  currentTankCandidate,
  recommendCapacity,
} from "./tankSizing";
import type { SizingTarget, TankSizingEvaluation } from "./tankSizing";

/** Same quoting and spreadsheet text-cell protection as the unchanged daily CSV export. */
function serialize(rows: readonly (readonly (string | number)[])[]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const cell =
            typeof value === "string" && /^[=+\-@\t\r]/.test(value)
              ? `'${value}`
              : String(value);
          return `"${cell.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

export function tankSizingToCsv(
  dataset: RainfallDataset,
  evaluation: TankSizingEvaluation,
  currentCapacityL: number,
  targetPercent: SizingTarget,
): string {
  const { scenario, standardCandidates } = evaluation;
  if (
    dataset.rainfallMm.length !== scenario.rainfallMm.length ||
    dataset.rainfallMm.some(
      (rain, index) => rain !== scenario.rainfallMm[index],
    )
  )
    throw new RangeError(
      "Sizing CSV provenance must match the evaluated rainfall.",
    );
  const current = currentTankCandidate(evaluation, currentCapacityL);
  const candidates = comparisonCandidates(evaluation, current);
  const decision = recommendCapacity(evaluation, targetPercent);
  const rows: (string | number)[][] = [
    [
      "CisternLab BUILD 03 — Tank Sizing & Decision Lab",
      dataset.classification,
      "ESTIMATED RESULT",
    ],
    [
      "Dataset",
      dataset.name,
      "Provider",
      dataset.provider,
      "Model",
      dataset.model ?? "Not applicable",
    ],
    [
      "Location",
      dataset.location
        ? locationLabel(dataset.location)
        : "Not applicable — synthetic",
      "Location ID",
      dataset.location?.id ?? "Not applicable",
    ],
    [
      "Requested latitude",
      dataset.requestedCoordinates?.latitude ?? "Not applicable",
      "Requested longitude",
      dataset.requestedCoordinates?.longitude ?? "Not applicable",
    ],
    [
      "Returned grid latitude",
      dataset.returnedCoordinates?.latitude ?? "Not applicable",
      "Returned grid longitude",
      dataset.returnedCoordinates?.longitude ?? "Not applicable",
    ],
    [
      "Calendar year",
      dataset.year ?? "Not applicable",
      "Start",
      dataset.startDate ?? "Simulated day 1",
      "End",
      dataset.endDate ?? `Simulated day ${scenario.rainfallMm.length}`,
      "Days",
      scenario.rainfallMm.length,
    ],
    [
      "Timezone",
      dataset.timezone ?? "Not applicable",
      "Abbreviation",
      dataset.timezoneAbbreviation ?? "Not applicable",
      "Fixed UTC offset seconds",
      dataset.utcOffsetSeconds ?? "Not applicable",
    ],
    ["Location timezone", dataset.location?.timezone ?? "Not applicable"],
    [
      "Variable",
      dataset.variable,
      "Units",
      dataset.units,
      "Retrieved at (UTC)",
      dataset.retrievedAt ?? "Not applicable — authored sequence",
    ],
    ["Source URL", dataset.sourceUrl, "Validation", dataset.validationStatus],
    [
      "Attribution",
      dataset.kind === "reanalysis"
        ? "Weather data by Open-Meteo https://open-meteo.com/; ERA5 / Copernicus C3S https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels; GeoNames https://www.geonames.org/; CC BY 4.0 https://creativecommons.org/licenses/by/4.0/"
        : "Authored deterministic synthetic CisternLab demo; no historical or site observations.",
    ],
    [
      "Roof area (m2)",
      scenario.roofAreaM2,
      "Collection efficiency (0-1)",
      scenario.collectionEfficiency,
      "Daily demand (L)",
      scenario.dailyDemandL,
    ],
    [
      "Comparison initial storage (L)",
      0,
      "Period boundary",
      "All tanks start empty; no preceding-year carryover; dashboard initial storage is not changed.",
    ],
    [
      "Daily model",
      "Rain before demand: collect, overflow, serve demand, carry storage. No sub-daily precision.",
    ],
    [
      "Standard candidates (L)",
      ...standardCandidates.map((candidate) => candidate.capacityL),
    ],
    [
      "Current capacity (L)",
      currentCapacityL,
      "In standard recommendation pool",
      current.isStandard ? "Yes" : "No — comparison only",
    ],
    [
      "Target (%)",
      targetPercent,
      "Maximum standard tested supply (L)",
      decision.maximumStandardSupplyL,
      "Target supply (L)",
      decision.targetSupplyL,
    ],
    [
      "Rule",
      "Smallest positive standard capacity with supply >= target fraction x maximum standard tested supply; relative comparison tolerance 1e-10 x maximum tested supply. Ascending capacity breaks ties.",
    ],
    [
      "Recommended tested capacity (L)",
      decision.recommended?.capacityL ?? "None",
      "Recommended supply (L)",
      decision.recommended?.supplyL ?? "Not applicable",
      "Fraction of tested maximum achieved",
      decision.achievedFraction ?? "Not applicable",
    ],
    [
      "Decision note",
      decision.noBenefitReason ??
        "User-adjustable water-yield heuristic; not a universal scientific optimum or proven global maximum.",
    ],
    [
      "Interpretation",
      "Volumetric demand coverage differs from fully supplied-day reliability. Both percentages are undefined when demand is zero.",
    ],
    [
      "Marginal units",
      "Additional modeled liters delivered per 1000 L additional storage over the selected period; standard neighbors only; not a financial return.",
    ],
    [
      "Disclaimer",
      "Modeled decision support, not certified engineering design, product advice, measured savings, or a long-term guarantee. Results are not measured savings. Freshwater displacement is conditional on substitution. No financial or carbon savings are calculated.",
    ],
    [
      "Provenance note",
      "Original rainfall snapshot below is unrounded. Reanalysis is not station-measured rain. ISO daily boundaries use the returned fixed offset, without historical DST reconstruction. No provider endorsement.",
    ],
    [],
    [
      "Capacity (L)",
      "Candidate pool",
      "Current",
      "Recommended",
      "Modeled supply (L)",
      "Demand coverage (%)",
      "Overflow (L)",
      "Unmet demand (L)",
      "Final storage (L)",
      "Fully supplied days",
      "Simulation days",
      "Daily reliability (%)",
      "Previous standard capacity (L)",
      "Additional capacity (L)",
      "Incremental supply (L)",
      "Incremental yield (L per 1000 L storage)",
      "Incoming (L)",
      "Mass balance error (L)",
    ],
    ...candidates.map((candidate) => [
      candidate.capacityL,
      candidate.isStandard ? "Standard" : "Current only",
      candidate.capacityL === currentCapacityL ? "Yes" : "No",
      candidate.capacityL === decision.recommended?.capacityL ? "Yes" : "No",
      candidate.supplyL,
      candidate.demandCoverage === null
        ? "Undefined — zero demand"
        : candidate.demandCoverage * 100,
      candidate.overflowL,
      candidate.unmetDemandL,
      candidate.finalStorageL,
      candidate.fullySuppliedDays,
      candidate.simulationDays,
      candidate.dailyReliability === null
        ? "Undefined — zero demand"
        : candidate.dailyReliability * 100,
      candidate.marginal?.fromCapacityL ?? "Not applicable",
      candidate.marginal?.additionalCapacityL ?? "Not applicable",
      candidate.marginal?.additionalSupplyL ?? "Not applicable",
      candidate.marginal?.incrementalYieldPer1000L ?? "Not applicable",
      candidate.incomingL,
      candidate.massBalanceErrorL,
    ]),
    [],
    ["Original rainfall snapshot — same input for every candidate"],
    ["Date or simulated day", "Rainfall (mm)"],
    ...scenario.rainfallMm.map((rain, index) => [
      dataset.dates?.[index] ?? `Day ${index + 1}`,
      rain,
    ]),
  ];
  return serialize(rows);
}
