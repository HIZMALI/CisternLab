import { DEMO_DATASETS } from "./demo";

export const HISTORICAL_YEARS = [2023, 2024, 2025] as const;
export type HistoricalYear = (typeof HISTORICAL_YEARS)[number];
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface Location extends Coordinates {
  id: number;
  name: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string | null;
}

interface RainfallBase {
  name: string;
  classification: string;
  rainfallMm: readonly number[];
  provider: string;
  units: "mm";
  sourceUrl: string;
  validationStatus: "validated";
}
export interface SyntheticDataset extends RainfallBase {
  kind: "synthetic";
  id: string;
  model: null;
  location: null;
  requestedCoordinates: null;
  returnedCoordinates: null;
  year: null;
  dates: null;
  startDate: null;
  endDate: null;
  timezone: null;
  timezoneAbbreviation: null;
  utcOffsetSeconds: null;
  variable: "synthetic_rainfall_mm";
  retrievedAt: null;
}
export interface HistoricalDataset extends RainfallBase {
  kind: "reanalysis";
  model: "ERA5";
  location: Location;
  requestedCoordinates: Coordinates;
  returnedCoordinates: Coordinates;
  year: HistoricalYear;
  dates: readonly string[];
  startDate: string;
  endDate: string;
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
  variable: "rain_sum";
  retrievedAt: string;
}
export type RainfallDataset = SyntheticDataset | HistoricalDataset;
export type SourceMode = "synthetic" | "historical";

export function syntheticDataset(index: number): SyntheticDataset {
  const demo = DEMO_DATASETS[index];
  if (!demo) throw new RangeError("Unknown synthetic dataset.");
  return {
    ...demo,
    kind: "synthetic",
    classification: "DEMO DATA — SYNTHETIC",
    provider: "CisternLab authored synthetic sequence",
    model: null,
    location: null,
    requestedCoordinates: null,
    returnedCoordinates: null,
    year: null,
    dates: null,
    startDate: null,
    endDate: null,
    timezone: null,
    timezoneAbbreviation: null,
    utcOffsetSeconds: null,
    variable: "synthetic_rainfall_mm",
    units: "mm",
    retrievedAt: null,
    sourceUrl: `src/data/demo.ts#${demo.id}`,
    validationStatus: "validated",
  };
}

export function locationLabel(location: Location): string {
  return [location.name, location.region, location.country]
    .filter(Boolean)
    .join(", ");
}

/** Calendar construction never parses a date-only string in a machine timezone. */
export function calendarDates(year: HistoricalYear): string[] {
  if (!HISTORICAL_YEARS.includes(year))
    throw new RangeError("Choose a complete year: 2023, 2024, or 2025.");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return monthDays.flatMap((days, month) =>
    Array.from(
      { length: days },
      (_, day) =>
        `${year}-${String(month + 1).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`,
    ),
  );
}
