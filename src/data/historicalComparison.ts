import { buildArchiveUrl, DataError, parseArchive } from "./openMeteo";
import type { OpenMeteoClient } from "./openMeteo";
import { HISTORICAL_YEARS } from "./rainfall";
import type { HistoricalDataset, HistoricalYear, Location } from "./rainfall";

export interface HistoricalComparisonDataset {
  readonly location: Readonly<Location>;
  readonly years: readonly HistoricalDataset[];
}
const fail = (message: string): never => {
  throw new DataError(
    `Three-year data-quality error: ${message} No comparison was committed.`,
    "quality",
  );
};

/** Recheck the full annual boundary and provenance before atomically accepting a triplet. */
export function validateHistoricalComparison(
  datasets: readonly HistoricalDataset[],
  location: Location,
): HistoricalComparisonDataset {
  if (datasets.length !== 3) fail("Exactly 2023, 2024, and 2025 are required.");
  const years = HISTORICAL_YEARS.map((year) => {
    const matches = datasets.filter((data) => data.year === year);
    if (matches.length !== 1) fail(`Missing or duplicated year ${year}.`);
    const data = matches[0];
    const request = { location, year };
    if (
      (
        [
          "id",
          "name",
          "region",
          "country",
          "countryCode",
          "latitude",
          "longitude",
          "timezone",
        ] as const
      ).some((key) => data.location[key] !== location[key]) ||
      data.requestedCoordinates.latitude !== location.latitude ||
      data.requestedCoordinates.longitude !== location.longitude
    )
      fail(
        `${year}: selected location identity or requested coordinates differ.`,
      );
    if (
      data.kind !== "reanalysis" ||
      data.model !== "ERA5" ||
      data.variable !== "rain_sum" ||
      data.units !== "mm" ||
      data.provider !== "Open-Meteo" ||
      data.validationStatus !== "validated" ||
      data.sourceUrl !== buildArchiveUrl(request) ||
      !data.name ||
      !data.classification ||
      data.startDate !== `${year}-01-01` ||
      data.endDate !== `${year}-12-31`
    )
      fail(`${year}: expected complete ERA5 / rain_sum / mm provenance.`);
    // Reuse the established calendar, rainfall, coordinate, timestamp and timezone validator.
    parseArchive(
      {
        ...data.returnedCoordinates,
        timezone: data.timezone,
        timezone_abbreviation: data.timezoneAbbreviation,
        utc_offset_seconds: data.utcOffsetSeconds,
        daily_units: { time: "iso8601", rain_sum: data.units },
        daily: { time: data.dates, rain_sum: data.rainfallMm },
      },
      request,
      data.retrievedAt,
    );
    return data;
  });
  const first = years[0];
  for (const data of years.slice(1)) {
    if (
      data.returnedCoordinates.latitude !==
        first.returnedCoordinates.latitude ||
      data.returnedCoordinates.longitude !== first.returnedCoordinates.longitude
    )
      fail(
        `ERA5 grid mismatch: ${first.year} returned ${first.returnedCoordinates.latitude}, ${first.returnedCoordinates.longitude}; ${data.year} returned ${data.returnedCoordinates.latitude}, ${data.returnedCoordinates.longitude}. Investigate the provider grid selection before combining these years.`,
      );
    if (
      data.timezone !== first.timezone ||
      data.utcOffsetSeconds !== first.utcOffsetSeconds ||
      data.timezoneAbbreviation !== first.timezoneAbbreviation
    )
      fail(
        "Annual timezone or fixed-offset metadata differ. Reload consistently before comparison.",
      );
  }
  return Object.freeze({
    location: Object.freeze({ ...location }),
    years: Object.freeze(years),
  });
}

export interface YearProgress {
  readonly year: HistoricalYear;
  readonly state: "queued" | "loading" | "validated" | "error";
  readonly origin: "active dataset" | "validated cache" | "archive request";
}

/** Two workers at most; successful partial transfers can be cached, never committed as an analysis. */
export async function loadHistoricalComparison(
  client: OpenMeteoClient,
  active: HistoricalDataset,
  signal: AbortSignal,
  progress: (value: YearProgress) => void = () => {},
): Promise<HistoricalComparisonDataset> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  signal.addEventListener("abort", abort, { once: true });
  const results: HistoricalDataset[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < HISTORICAL_YEARS.length && !controller.signal.aborted) {
      const year = HISTORICAL_YEARS[cursor++];
      const request = { location: active.location, year };
      const origin =
        year === active.year
          ? "active dataset"
          : client.isCached(request)
            ? "validated cache"
            : "archive request";
      progress({ year, state: "loading", origin });
      try {
        const data =
          year === active.year
            ? active
            : await client.load(request, controller.signal);
        if (controller.signal.aborted)
          throw new DOMException("Request cancelled", "AbortError");
        results.push(data);
        progress({ year, state: "validated", origin });
      } catch (error) {
        if (!controller.signal.aborted)
          progress({ year, state: "error", origin });
        controller.abort();
        throw error;
      }
    }
  };
  try {
    await Promise.all([worker(), worker()]);
    if (controller.signal.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    return validateHistoricalComparison(results, active.location);
  } finally {
    controller.abort();
    signal.removeEventListener("abort", abort);
  }
}
