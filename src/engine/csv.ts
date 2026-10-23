import type { SimulationInput, SimulationResult } from "./simulation";

/** Include provenance and assumptions so downloaded numbers keep their context. */
export function resultsToCsv(
  input: SimulationInput,
  result: SimulationResult,
  datasetName: string,
): string {
  const rows: (string | number)[][] = [
    ["CisternLab BUILD 01", "DEMO DATA", "ESTIMATED RESULT"],
    ["Dataset", datasetName, "Deterministic synthetic rainfall; no real site"],
    ["Model", "Daily rain before demand; no sub-daily precision"],
    ["Roof area (m2)", input.roofAreaM2],
    ["Collection efficiency (0-1)", input.collectionEfficiency],
    ["Tank capacity (L)", input.tankCapacityL],
    ["Daily non-potable demand (L)", input.dailyDemandL],
    ["Initial storage (L)", input.initialStorageL],
    [],
    [
      "Day",
      "Rainfall (mm)",
      "Opening storage (L)",
      "Incoming (L)",
      "Overflow (L)",
      "Used (L)",
      "Remaining storage (L)",
      "Unmet demand (L)",
    ],
    ...result.days.map((d) => [
      d.day,
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
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}
