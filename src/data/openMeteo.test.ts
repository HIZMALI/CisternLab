import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveFixture, edirne, namesakes } from "../../tests/fixtures";
import {
  buildArchiveUrl,
  buildGeocodingUrl,
  DataError,
  OpenMeteoClient,
  parseArchive,
  parseGeocoding,
  RequestSlot,
} from "./openMeteo";
import { calendarDates, syntheticDataset } from "./rainfall";
import type { HistoricalYear } from "./rainfall";
import { simulate } from "../engine/simulation";
import { DEFAULT_SCENARIO } from "./demo";
import { resultsToCsv } from "../engine/csv";

const location = parseGeocoding({ results: [edirne] })[0];
const request = { location, year: 2025 as const };
const retrievedAt = "2026-10-23T18:00:00.000Z";
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("location and URL validation", () => {
  it("validates locations and keeps duplicate names distinct by region, coordinates and ID", () => {
    const locations = parseGeocoding(namesakes);
    expect(locations.map((value) => value.name)).toEqual([
      "Springfield",
      "Springfield",
    ]);
    expect(locations.map((value) => value.region)).toEqual([
      "Illinois",
      "Massachusetts",
    ]);
    expect(new Set(locations.map((value) => value.id)).size).toBe(2);
    expect(location.timezone).toBe("Europe/Istanbul");
  });
  it("handles both documented empty responses and empty arrays", () => {
    expect(parseGeocoding({ generationtime_ms: 0.2 })).toEqual([]);
    expect(parseGeocoding({ results: [] })).toEqual([]);
  });
  it("keeps optional timezone and region unavailable explicitly", () => {
    const optional = { ...edirne, timezone: undefined, admin1: undefined };
    expect(parseGeocoding({ results: [optional] })[0]).toMatchObject({
      timezone: null,
      region: "Region unavailable",
    });
  });
  it.each([
    null,
    [],
    {},
    { error: true },
    { results: null },
    { results: [edirne, edirne] },
    { results: [{ ...edirne, latitude: 91 }] },
    { results: [{ ...edirne, longitude: Infinity }] },
    { results: [{ ...edirne, country_code: "INVALID" }] },
    { results: [{ ...edirne, timezone: "Invalid/Timezone" }] },
    { results: [{ ...edirne, name: "" }] },
  ])("rejects invalid location payload %#", (payload) => {
    expect(() => parseGeocoding(payload)).toThrow(DataError);
  });
  it("encodes worldwide search text, caps results, and requires three characters", () => {
    const url = new URL(buildGeocodingUrl("  İzmir, Türkiye  "));
    expect(url.hostname).toBe("geocoding-api.open-meteo.com");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      name: "İzmir, Türkiye",
      count: "6",
      language: "en",
      format: "json",
    });
    expect(() => buildGeocodingUrl("ab")).toThrow(RangeError);
  });
  it("constructs one complete year request with explicit ERA5 rain_sum and no key", () => {
    const url = new URL(buildArchiveUrl(request));
    expect(url.origin + url.pathname).toBe(
      "https://archive-api.open-meteo.com/v1/archive",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: "41.67719",
      longitude: "26.55597",
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      daily: "rain_sum",
      models: "era5",
      precipitation_unit: "mm",
      timezone: "auto",
      timeformat: "iso8601",
    });
    expect(url.href).not.toContain("precipitation_sum");
    expect(url.href).not.toContain("apikey");
    expect(() =>
      buildArchiveUrl({
        ...request,
        location: { ...location, longitude: -181 },
      }),
    ).toThrow(RangeError);
  });
  it("does not permit incomplete 2026 or unsupported years", () => {
    expect(() => calendarDates(2026 as HistoricalYear)).toThrow(
      /complete year/,
    );
    expect(() =>
      buildArchiveUrl({ ...request, year: 2022 as HistoricalYear }),
    ).toThrow(RangeError);
  });
});

describe("complete daily ERA5 response validation", () => {
  it.each([2023, 2024, 2025] as const)(
    "accepts complete %s calendar coverage and retains provenance and precision",
    (year) => {
      const data = parseArchive(
        archiveFixture(year),
        { location, year },
        retrievedAt,
      );
      expect(data.rainfallMm).toHaveLength(year === 2024 ? 366 : 365);
      expect(data.dates[0]).toBe(`${year}-01-01`);
      expect(data.dates.at(-1)).toBe(`${year}-12-31`);
      expect(data.dates.includes(`${year}-02-29`)).toBe(year === 2024);
      expect(data).toMatchObject({
        kind: "reanalysis",
        model: "ERA5",
        variable: "rain_sum",
        units: "mm",
        retrievedAt,
        requestedCoordinates: { latitude: 41.67719, longitude: 26.55597 },
        returnedCoordinates: { latitude: 41.75, longitude: 26.5 },
        timezone: "Europe/Istanbul",
        utcOffsetSeconds: 10800,
        validationStatus: "validated",
      });
      expect(data.rainfallMm[0]).toBe(14.7);
      expect(Object.isFrozen(data.rainfallMm)).toBe(true);
    },
  );
  it.each([null, undefined, -1, NaN, Infinity, "1"])(
    "rejects missing, nonnumeric, negative or non-finite rain %s",
    (value) => {
      const fixture = archiveFixture() as unknown as {
        daily: { rain_sum: unknown[] };
      };
      fixture.daily.rain_sum[31] = value;
      expect(() => parseArchive(fixture, request, retrievedAt)).toThrow(
        /2025-02-01/,
      );
    },
  );
  it.each([
    "missing day",
    "missing rain",
    "duplicate date",
    "wrong order",
    "wrong year",
    "invalid date",
    "extra day",
    "sparse rain",
  ] as const)("rejects %s without filling zeroes", (mutation) => {
    const fixture = archiveFixture();
    if (mutation === "missing day") fixture.daily.time.splice(30, 1);
    if (mutation === "missing rain") fixture.daily.rain_sum.pop();
    if (mutation === "duplicate date")
      fixture.daily.time[2] = fixture.daily.time[1];
    if (mutation === "wrong order")
      [fixture.daily.time[1], fixture.daily.time[2]] = [
        fixture.daily.time[2],
        fixture.daily.time[1],
      ];
    if (mutation === "wrong year") fixture.daily.time[0] = "2024-01-01";
    if (mutation === "invalid date") fixture.daily.time[59] = "2025-02-29";
    if (mutation === "extra day") fixture.daily.time.push("2026-01-01");
    if (mutation === "sparse rain") delete fixture.daily.rain_sum[10];
    expect(() => parseArchive(fixture, request, retrievedAt)).toThrow(
      DataError,
    );
  });
  it.each([
    null,
    [],
    {},
    { error: true },
    { ...archiveFixture(), daily: {} },
    { ...archiveFixture(), latitude: -91 },
    { ...archiveFixture(), longitude: NaN },
    { ...archiveFixture(), daily_units: { time: "iso8601", rain_sum: "inch" } },
    { ...archiveFixture(), daily_units: { time: "unixtime", rain_sum: "mm" } },
    {
      ...archiveFixture(),
      daily: { time: archiveFixture().daily.time, precipitation_sum: [] },
    },
    { ...archiveFixture(), timezone: "Invalid/Timezone" },
    { ...archiveFixture(), utc_offset_seconds: null },
  ])(
    "rejects unexpected schema, unit, timezone or coordinate %#",
    (payload) => {
      expect(() => parseArchive(payload, request, retrievedAt)).toThrow(
        DataError,
      );
    },
  );
  it("preserves date-only calendar strings independently of display timezone", () => {
    const fixture = {
      ...archiveFixture(),
      timezone: "Pacific/Auckland",
      utc_offset_seconds: 46800,
      timezone_abbreviation: "NZDT",
    };
    const data = parseArchive(fixture, request, retrievedAt);
    expect(data.dates[0]).toBe("2025-01-01");
    expect(data.dates[364]).toBe("2025-12-31");
    expect(data.timezone).toBe("Pacific/Auckland");
  });
});

describe("network, cancellation and caching", () => {
  it.each([429, 500])(
    "reports HTTP %s and never automatically retries",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(response({ error: true }, status));
      await expect(
        new OpenMeteoClient(fetcher).load(request),
      ).rejects.toMatchObject({ kind: "http", status });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("reports network errors and invalid JSON distinctly", async () => {
    await expect(
      new OpenMeteoClient(
        vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")),
      ).search("Edirne"),
    ).rejects.toMatchObject({ kind: "network" });
    await expect(
      new OpenMeteoClient(
        vi.fn<typeof fetch>().mockResolvedValue(new Response("not json")),
      ).load(request),
    ).rejects.toMatchObject({ kind: "quality" });
  });
  it("times out stalled requests, clears timers and allows manual retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(new DOMException("abort", "AbortError")),
            ),
          ),
      );
    const loading = new OpenMeteoClient(fetcher, () => retrievedAt, 15000).load(
      request,
    );
    const assertion = expect(loading).rejects.toMatchObject({
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(15001);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("aborts superseded search requests and rejects stale results even when transport ignores abort", async () => {
    const slot = new RequestSlot();
    const first = slot.begin();
    const second = slot.begin();
    expect(first.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    slot.cancel();
    expect(second.isCurrent()).toBe(false);
  });
  it("honors cancellation and never caches a cancelled download", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return response(archiveFixture());
    });
    const client = new OpenMeteoClient(fetcher, () => retrievedAt);
    await expect(client.load(request, controller.signal)).rejects.toMatchObject(
      { name: "AbortError" },
    );
    fetcher.mockResolvedValue(response(archiveFixture()));
    await expect(client.load(request)).resolves.toMatchObject({ year: 2025 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("caches validated coordinates/year in memory and recalculates without downloading", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        response(
          archiveFixture(
            Number(
              new URL(String(url)).searchParams.get("start_date")!.slice(0, 4),
            ),
          ),
        ),
      );
    const client = new OpenMeteoClient(fetcher, () => retrievedAt);
    const data = await client.load(request);
    const result = simulate({
      ...DEFAULT_SCENARIO,
      rainfallMm: data.rainfallMm,
    });
    expect(
      simulate({ ...DEFAULT_SCENARIO, rainfallMm: data.rainfallMm }),
    ).toEqual(result);
    expect(
      simulate({
        ...DEFAULT_SCENARIO,
        roofAreaM2: 0,
        rainfallMm: data.rainfallMm,
      }).totals.usedL,
    ).toBe(0);
    expect((await client.load(request)).retrievedAt).toBe(retrievedAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await client.load({ ...request, year: 2024 });
    await client.load({ ...request, location: { ...location, latitude: 40 } });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("rejects partial data without poisoning the cache", async () => {
    const broken = archiveFixture();
    broken.daily.rain_sum.pop();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(broken))
      .mockResolvedValueOnce(response(archiveFixture()));
    const client = new OpenMeteoClient(fetcher, () => retrievedAt);
    await expect(client.load(request)).rejects.toMatchObject({
      kind: "quality",
    });
    await expect(client.load(request)).resolves.toMatchObject({
      validationStatus: "validated",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("historical integration, conservation and CSV", () => {
  it.each([2024, 2025] as const)(
    "conserves every day and full period of a %s fixture",
    (year) => {
      const dataset = parseArchive(
        archiveFixture(year),
        { location, year },
        retrievedAt,
      );
      const input = {
        ...DEFAULT_SCENARIO,
        initialStorageL: 125,
        rainfallMm: dataset.rainfallMm,
      };
      const { days, totals } = simulate(input);
      for (const day of days)
        expect(day.openingStorageL + day.incomingL).toBeCloseTo(
          day.overflowL + day.usedL + day.remainingStorageL,
          8,
        );
      expect(125 + totals.incomingL).toBeCloseTo(
        totals.usedL + totals.overflowL + totals.finalStorageL,
        7,
      );
      expect(totals.usedL + totals.unmetDemandL).toBeCloseTo(totals.demandL, 7);
    },
  );
  it("exports exact dates, raw rainfall, model, coordinates, license, timestamp and disclaimers", () => {
    const dataset = parseArchive(archiveFixture(), request, retrievedAt);
    const input = { ...DEFAULT_SCENARIO, rainfallMm: dataset.rainfallMm };
    const csv = resultsToCsv(input, simulate(input), dataset);
    for (const text of [
      "HISTORICAL REANALYSIS — ERA5 MODEL",
      "Open-Meteo",
      "ERA5",
      "rain_sum",
      "41.67719",
      "41.75",
      "Europe/Istanbul",
      "2025-01-01",
      "2025-12-31",
      retrievedAt,
      "CC BY 4.0",
      "not measured savings",
      "rain before demand",
    ])
      expect(csv).toContain(text);
    expect(csv).toContain('"2025-01-01","14.7"');
    expect(
      csv.split("\r\n").filter((row) => /^"2025-\d{2}-\d{2}",/.test(row)),
    ).toHaveLength(365);
    expect(() =>
      resultsToCsv(
        { ...input, rainfallMm: [1] },
        simulate({ ...input, rainfallMm: [1] }),
        dataset,
      ),
    ).toThrow(/provenance/);
  });
  it("keeps synthetic exports and original default reference results", () => {
    const data = syntheticDataset(0);
    const input = { ...DEFAULT_SCENARIO, rainfallMm: data.rainfallMm };
    const result = simulate(input);
    expect(result.totals).toMatchObject({
      usedL: 7250,
      overflowL: 5650,
      finalStorageL: 1500,
    });
    const csv = resultsToCsv(input, result, data);
    expect(csv).toContain("DEMO DATA — SYNTHETIC");
    expect(csv).not.toContain("HISTORICAL REANALYSIS");
    expect(csv.split("\r\n")).toHaveLength(40);
    expect(data).toMatchObject({
      year: null,
      location: null,
      retrievedAt: null,
    });
  });
});
