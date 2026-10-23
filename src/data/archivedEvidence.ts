import { validateHistoricalComparison } from "./historicalComparison";
import type { HistoricalComparisonDataset } from "./historicalComparison";
import type { HistoricalDataset } from "./rainfall";
import { ANALYSIS_SCHEMA_VERSION } from "../engine/variabilityExport";

export const ARCHIVE_SHA256 =
  "2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7";
export const ARCHIVE_ORIGINAL_PATH =
  "docs/data/edirne-era5-2023-2025.snapshot.json";
export const ARCHIVE_CLASSIFICATION = "ARCHIVED HISTORICAL REANALYSIS — ERA5";
export interface ArchivedEvidence {
  readonly comparison: HistoricalComparisonDataset;
  readonly originalText: string;
  readonly sha256: string;
}
function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Structural boundary only; all calendar, rain and provenance rules stay authoritative. */
export function validateArchivedSnapshot(
  payload: unknown,
): HistoricalComparisonDataset {
  if (
    !record(payload) ||
    payload.schemaVersion !== ANALYSIS_SCHEMA_VERSION ||
    !Array.isArray(payload.datasets) ||
    payload.datasets.length !== 3
  )
    throw new Error(
      "Archived evidence has an invalid snapshot schema or incomplete year set.",
    );
  const datasets = payload.datasets.map((value) => {
    if (
      !record(value) ||
      !record(value.location) ||
      !record(value.requestedCoordinates) ||
      !record(value.returnedCoordinates) ||
      !Array.isArray(value.dates) ||
      !Array.isArray(value.rainfallMm)
    )
      throw new Error(
        "Archived evidence has missing rainfall, dates or provenance.",
      );
    return value as unknown as HistoricalDataset;
  });
  const location = datasets[0].location;
  if (
    location.id !== 747712 ||
    location.name !== "Edirne" ||
    location.countryCode !== "TR"
  )
    throw new Error(
      "Archived evidence is not the recorded Edirne, Türkiye location.",
    );
  const validated = validateHistoricalComparison(datasets, location);
  // Clone/freeze the accepted original records; ignore all precomputed snapshot results.
  return Object.freeze({
    location: Object.freeze({ ...validated.location }),
    years: Object.freeze(
      validated.years.map((d) =>
        Object.freeze({
          ...d,
          location: Object.freeze({ ...d.location }),
          requestedCoordinates: Object.freeze({ ...d.requestedCoordinates }),
          returnedCoordinates: Object.freeze({ ...d.returnedCoordinates }),
          dates: Object.freeze([...d.dates]),
          rainfallMm: Object.freeze([...d.rainfallMm]),
        }),
      ),
    ),
  });
}

export async function readArchivedBytes(
  bytes: Uint8Array,
): Promise<ArchivedEvidence> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  const sha256 = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (sha256 !== ARCHIVE_SHA256)
    throw new Error(
      "Archived evidence integrity check failed: SHA-256 does not match the original archived snapshot. No archived result was calculated.",
    );
  let payload: unknown;
  const originalText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  try {
    payload = JSON.parse(originalText);
  } catch {
    throw new Error("Archived evidence is not valid JSON.");
  }
  return Object.freeze({
    comparison: validateArchivedSnapshot(payload),
    originalText,
    sha256,
  });
}
