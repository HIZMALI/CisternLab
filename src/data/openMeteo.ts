import { calendarDates, locationLabel } from "./rainfall";
import type {
  Coordinates,
  HistoricalDataset,
  HistoricalYear,
  Location,
} from "./rainfall";

export const GEOCODING_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search";
export const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
export const ERA5_SOURCE =
  "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels";

export class DataError extends Error {
  constructor(
    message: string,
    public readonly kind: "quality" | "http" | "network" | "timeout",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DataError";
  }
}
function quality(message: string): never {
  throw new DataError(
    `Data-quality error: ${message} No missing values are filled or interpolated.`,
    "quality",
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
export function validCoordinates(value: unknown): value is Coordinates {
  return (
    record(value) &&
    finite(value.latitude) &&
    finite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}
function validTimezone(value: unknown): value is string {
  if (!text(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function buildGeocodingUrl(query: string): string {
  const name = query.trim();
  if (name.length < 3)
    throw new RangeError("Enter at least 3 characters to search.");
  const url = new URL(GEOCODING_ENDPOINT);
  url.search = new URLSearchParams({
    name,
    count: "6",
    language: "en",
    format: "json",
  }).toString();
  return url.href;
}
export function parseGeocoding(payload: unknown): Location[] {
  if (
    !record(payload) ||
    payload.error ||
    ("results" in payload && !Array.isArray(payload.results))
  )
    quality("Unexpected location response.");
  if (!("results" in payload)) {
    // The documented no-matches response omits results but includes generationtime_ms.
    if (!finite(payload.generationtime_ms))
      quality("Unexpected location response.");
    return [];
  }
  const results = payload.results as unknown[];
  const seen = new Set<number>();
  return results.slice(0, 6).map((value) => {
    if (
      !record(value) ||
      !validCoordinates(value) ||
      !Number.isSafeInteger(value.id) ||
      Number(value.id) <= 0 ||
      !text(value.name) ||
      !text(value.country) ||
      typeof value.country_code !== "string" ||
      !/^[A-Z]{2}$/.test(value.country_code) ||
      (value.admin1 !== undefined && !text(value.admin1)) ||
      (value.timezone !== undefined && !validTimezone(value.timezone))
    )
      quality("Invalid location fields or coordinates.");
    const id = value.id as number;
    if (seen.has(id)) quality("Duplicated location identifiers.");
    seen.add(id);
    return {
      id,
      name: value.name as string,
      region: (value.admin1 as string | undefined) ?? "Region unavailable",
      country: value.country as string,
      countryCode: value.country_code as string,
      latitude: value.latitude as number,
      longitude: value.longitude as number,
      timezone: (value.timezone as string | undefined) ?? null,
    };
  });
}

export interface ArchiveRequest {
  location: Location;
  year: HistoricalYear;
}
export function buildArchiveUrl(request: ArchiveRequest): string {
  if (!validCoordinates(request.location))
    throw new RangeError("Invalid requested coordinates.");
  const dates = calendarDates(request.year);
  const url = new URL(ARCHIVE_ENDPOINT);
  url.search = new URLSearchParams({
    latitude: String(request.location.latitude),
    longitude: String(request.location.longitude),
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    daily: "rain_sum",
    models: "era5",
    precipitation_unit: "mm",
    timezone: "auto",
    timeformat: "iso8601",
  }).toString();
  return url.href;
}

export function parseArchive(
  payload: unknown,
  request: ArchiveRequest,
  retrievedAt: string,
): HistoricalDataset {
  const sourceUrl = buildArchiveUrl(request);
  const expectedDates = calendarDates(request.year);
  if (
    !record(payload) ||
    payload.error ||
    !validCoordinates(payload) ||
    !record(payload.daily) ||
    !record(payload.daily_units)
  )
    quality("Unexpected ERA5 response structure or coordinates.");
  if (
    payload.daily_units.rain_sum !== "mm" ||
    payload.daily_units.time !== "iso8601"
  )
    quality("Expected rain_sum in mm and ISO calendar dates.");
  if (
    !validTimezone(payload.timezone) ||
    !text(payload.timezone_abbreviation) ||
    !Number.isInteger(payload.utc_offset_seconds) ||
    Math.abs(Number(payload.utc_offset_seconds)) > 86400
  )
    quality("Invalid returned timezone metadata.");
  const { time, rain_sum: rain } = payload.daily;
  if (
    !Array.isArray(time) ||
    !Array.isArray(rain) ||
    time.length !== expectedDates.length ||
    rain.length !== expectedDates.length
  )
    quality(
      `Expected exactly ${expectedDates.length} dated daily rain values for ${request.year}. Annual simulation was not loaded.`,
    );
  const rainfallMm = expectedDates.map((date, index) => {
    if (time[index] !== date)
      quality(
        `Missing, duplicated, reordered, or wrong-year date at day ${index + 1}; expected ${date}.`,
      );
    const value: unknown = rain[index];
    if (!finite(value) || value < 0)
      quality(`Missing or invalid rain_sum on ${date}.`);
    return value;
  });
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(retrievedAt) ||
    !Number.isFinite(Date.parse(retrievedAt))
  )
    throw new RangeError("Invalid retrieval timestamp.");
  return Object.freeze({
    kind: "reanalysis",
    classification: "HISTORICAL REANALYSIS — ERA5 MODEL",
    name: `${locationLabel(request.location)} · ${request.year}`,
    rainfallMm: Object.freeze(rainfallMm),
    dates: Object.freeze(expectedDates),
    provider: "Open-Meteo",
    model: "ERA5",
    location: Object.freeze({ ...request.location }),
    requestedCoordinates: Object.freeze({
      latitude: request.location.latitude,
      longitude: request.location.longitude,
    }),
    returnedCoordinates: Object.freeze({
      latitude: payload.latitude as number,
      longitude: payload.longitude as number,
    }),
    year: request.year,
    startDate: expectedDates[0],
    endDate: expectedDates[expectedDates.length - 1],
    timezone: payload.timezone as string,
    timezoneAbbreviation: payload.timezone_abbreviation as string,
    utcOffsetSeconds: payload.utc_offset_seconds as number,
    variable: "rain_sum",
    units: "mm",
    retrievedAt,
    sourceUrl,
    validationStatus: "validated",
  });
}

/** Cancel obsolete work and also guard against transports that ignore abort. */
export class RequestSlot {
  private controller: AbortController | null = null;
  private revision = 0;
  cancel(): void {
    this.revision++;
    this.controller?.abort();
    this.controller = null;
  }
  begin(): { signal: AbortSignal; isCurrent: () => boolean } {
    this.cancel();
    this.controller = new AbortController();
    const revision = this.revision;
    return {
      signal: this.controller.signal,
      isCurrent: () => revision === this.revision,
    };
  }
}

export class OpenMeteoClient {
  private readonly cache = new Map<string, HistoricalDataset>();
  isCached(request: ArchiveRequest): boolean {
    return this.cache.has(buildArchiveUrl(request));
  }
  constructor(
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly timeoutMs = 15000,
  ) {}

  private async json(url: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      const response = await this.fetcher(url, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok)
        throw new DataError(
          response.status === 429
            ? "Open-Meteo rate limit reached (HTTP 429). Wait before retrying manually."
            : `Open-Meteo request failed (HTTP ${response.status}). Retry manually when the service is available.`,
          "http",
          response.status,
        );
      try {
        return await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        quality("The API did not return valid JSON.");
      }
    } catch (error) {
      if (signal?.aborted)
        throw new DOMException("Request cancelled", "AbortError");
      if (timedOut)
        throw new DataError(
          "Open-Meteo timed out after 15 seconds. Retry manually.",
          "timeout",
        );
      if (error instanceof DataError) throw error;
      throw new DataError(
        "Could not reach Open-Meteo. Check your connection and retry manually.",
        "network",
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  async search(query: string, signal?: AbortSignal): Promise<Location[]> {
    return parseGeocoding(await this.json(buildGeocodingUrl(query), signal));
  }
  async load(
    request: ArchiveRequest,
    signal?: AbortSignal,
  ): Promise<HistoricalDataset> {
    const key = buildArchiveUrl(request);
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    const cached = this.cache.get(key);
    if (cached)
      return Object.freeze({
        ...cached,
        name: `${locationLabel(request.location)} · ${request.year}`,
        location: Object.freeze({ ...request.location }),
      });
    const data = parseArchive(
      await this.json(key, signal),
      request,
      this.now(),
    );
    // Aborted/obsolete transfers are never cached, even if a transport ignores abort.
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    if (this.cache.size >= 12)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, data);
    return data;
  }
}
