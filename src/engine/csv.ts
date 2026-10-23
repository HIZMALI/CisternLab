import type { SimulationInput, SimulationResult } from "./simulation";
import { locationLabel } from "../data/rainfall";
import type { RainfallDataset } from "../data/rainfall";

/** Include provenance and assumptions so downloaded numbers keep their context. */
export function resultsToCsv(
  input: SimulationInput,
  result: SimulationResult,
  dataset: string | RainfallDataset,
): string {
  const historical =
    typeof dataset !== "string" && dataset.kind === "reanalysis"
      ? dataset
      : null;
  if (
    historical &&
    (historical.dates.length !== result.days.length ||
      input.rainfallMm.length !== historical.rainfallMm.length ||
      input.rainfallMm.some((rain, i) => rain !== historical.rainfallMm[i]))
  )
    throw new RangeError("CSV provenance must match the simulated rainfall.");
  const datasetName = typeof dataset === "string" ? dataset : dataset.name;
  const rows: (string | number)[][] = [
    ...(historical
      ? [
          ["CisternLab", historical.classification, "ESTIMATED RESULT"],
          ["Provider", historical.provider, "Weather model", historical.model],
          [
            "Location",
            locationLabel(historical.location),
            "Location ID",
            historical.location.id,
          ],
          [
            "Requested latitude",
            historical.requestedCoordinates.latitude,
            "Requested longitude",
            historical.requestedCoordinates.longitude,
          ],
          [
            "Returned grid latitude",
            historical.returnedCoordinates.latitude,
            "Returned grid longitude",
            historical.returnedCoordinates.longitude,
          ],
          [
            "Calendar year",
            historical.year,
            "Start date",
            historical.startDate,
            "End date",
            historical.endDate,
          ],
          [
            "Timezone",
            historical.timezone,
            "Abbreviation",
            historical.timezoneAbbreviation,
            "Fixed UTC offset seconds",
            historical.utcOffsetSeconds,
          ],
          ["Location timezone", historical.location.timezone ?? "Unavailable"],
          ["Variable", historical.variable, "Units", historical.units],
          [
            "Retrieved at (UTC)",
            historical.retrievedAt,
            "Validation",
            historical.validationStatus,
          ],
          ["Reproducible source URL", historical.sourceUrl],
          [
            "Attribution",
            "Weather data by Open-Meteo https://open-meteo.com/; ERA5 / Copernicus C3S https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels; Location data by GeoNames https://www.geonames.org/; CC BY 4.0 https://creativecommons.org/licenses/by/4.0/",
          ],
          [
            "Aggregation",
            "API daily sums of hourly rain using returned fixed UTC offset; DST transitions not reconstructed. Calendar dates unchanged.",
          ],
          [
            "Transformation",
            "Original rainfall unrounded; CisternLab derives estimated tank volumes. No provider endorsement.",
          ],
        ]
      : [
          ["CisternLab", "DEMO DATA", "ESTIMATED RESULT"],
          [
            "Dataset",
            datasetName,
            "Deterministic synthetic rainfall; no real site",
            "DEMO DATA — SYNTHETIC",
            typeof dataset === "string"
              ? "CisternLab authored synthetic sequence"
              : dataset.sourceUrl,
          ],
        ]),
    [
      "Model",
      "Daily rain before demand; no sub-daily precision",
      "Potential displacement assumes each served liter substitutes freshwater; not measured savings. Initial storage is assumed harvested rainwater.",
    ],
    ["Roof area (m2)", input.roofAreaM2],
    ["Collection efficiency (0-1)", input.collectionEfficiency],
    ["Tank capacity (L)", input.tankCapacityL],
    ["Daily non-potable demand (L)", input.dailyDemandL],
    ["Initial storage (L)", input.initialStorageL],
    [],
    [
      historical ? "Date" : "Day",
      "Rainfall (mm)",
      "Opening storage (L)",
      "Incoming (L)",
      "Overflow (L)",
      "Used (L)",
      "Remaining storage (L)",
      "Unmet demand (L)",
    ],
    ...result.days.map((d) => [
      historical ? historical.dates[d.day - 1] : d.day,
      d.rainfallMm,
      d.openingStorageL,
      d.incomingL,
      d.overflowL,
      d.usedL,
      d.remainingStorageL,
      d.unmetDemandL,
    ]),
  ];
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
