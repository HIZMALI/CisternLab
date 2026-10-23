import { describe, expect, it, vi } from "vitest";
import { archiveFixture, edirne } from "../../tests/fixtures";
import {
  OpenMeteoClient,
  parseArchive,
  parseGeocoding,
  RequestSlot,
} from "./openMeteo";
import {
  loadHistoricalComparison,
  validateHistoricalComparison,
} from "./historicalComparison";
import type { YearProgress } from "./historicalComparison";
import { HISTORICAL_YEARS } from "./rainfall";
import type { HistoricalDataset } from "./rainfall";

export const fixtureLocation = parseGeocoding({ results: [edirne] })[0];
export const completeYears = () =>
  HISTORICAL_YEARS.map((year) =>
    parseArchive(
      archiveFixture(year),
      { location: fixtureLocation, year },
      "2026-10-23T12:00:00.000Z",
    ),
  );
const response = (year: number) =>
  new Response(JSON.stringify(archiveFixture(year)));
const yearFrom = (url: unknown) =>
  Number(new URL(String(url)).searchParams.get("start_date")!.slice(0, 4));

describe("complete-year comparison boundary", () => {
  it("accepts exactly 365/366/365 dates in chronological year order", () => {
    const d = validateHistoricalComparison(
      completeYears().reverse(),
      fixtureLocation,
    );
    expect(d.years.map((y) => y.dates.length)).toEqual([365, 366, 365]);
    expect(d.years[1].dates[59]).toBe("2024-02-29");
  });
  it.each([
    "location",
    "requested",
    "model",
    "units",
    "variable",
    "url",
    "provider",
    "status",
    "grid",
    "timezone",
    "offset",
    "partial",
    "duplicate",
    "null",
    "missing",
    "negative",
    "infinite",
    "timestamp",
    "range",
  ])("rejects mismatched %s atomically", (kind) => {
    const datasets = structuredClone(completeYears());
    const y = datasets[1];
    switch (kind) {
      case "location":
        y.location.id++;
        break;
      case "requested":
        y.requestedCoordinates.latitude++;
        break;
      case "model":
        Object.assign(y, { model: "ERA5-Land" });
        break;
      case "units":
        Object.assign(y, { units: "inch" });
        break;
      case "variable":
        Object.assign(y, { variable: "precipitation_sum" });
        break;
      case "url":
        y.sourceUrl = y.sourceUrl.replace("era5", "best_match");
        break;
      case "provider":
        y.provider = "Other";
        break;
      case "status":
        Object.assign(y, { validationStatus: "pending" });
        break;
      case "grid":
        y.returnedCoordinates.latitude += 0.25;
        break;
      case "timezone":
        y.timezone = "UTC";
        break;
      case "offset":
        y.utcOffsetSeconds = 0;
        break;
      case "partial":
        Object.assign(y, {
          dates: y.dates.slice(1),
          rainfallMm: y.rainfallMm.slice(1),
        });
        break;
      case "duplicate":
        Object.assign(y, {
          dates: y.dates.map((d, i) => (i === 1 ? y.dates[0] : d)),
        });
        break;
      case "null":
        Object.assign(y, {
          dates: y.dates.map((d, i) => (i === 1 ? null : d)),
        });
        break;
      case "missing":
        Object.assign(y, { dates: Array(366) });
        break;
      case "negative":
        Object.assign(y, {
          rainfallMm: y.rainfallMm.map((r, i) => (i === 1 ? -1 : r)),
        });
        break;
      case "infinite":
        Object.assign(y, {
          rainfallMm: y.rainfallMm.map((r, i) => (i === 1 ? Infinity : r)),
        });
        break;
      case "timestamp":
        y.retrievedAt = "invalid";
        break;
      case "range":
        y.startDate = "2024-01-02";
        break;
    }
    expect(() =>
      validateHistoricalComparison(datasets, fixtureLocation),
    ).toThrow();
  });
  it.each([0, 1, 2])("rejects incomplete set length %s", (n) =>
    expect(() =>
      validateHistoricalComparison(
        completeYears().slice(0, n),
        fixtureLocation,
      ),
    ).toThrow(),
  );
  it("rejects duplicate calendar years even with three entries", () => {
    const y = completeYears();
    expect(() =>
      validateHistoricalComparison([y[0], y[0], y[2]], fixtureLocation),
    ).toThrow(/Missing or duplicated/);
  });
  it("preserves distinct requested city and returned grid coordinates and original provenance", () => {
    const years = completeYears(),
      d = validateHistoricalComparison(years, fixtureLocation);
    expect(d.years[0]).toBe(years[0]);
    expect(d.years[0].requestedCoordinates).not.toEqual(
      d.years[0].returnedCoordinates,
    );
  });
  it("reports the actual mismatching grids", () => {
    const y = structuredClone(completeYears());
    y[2].returnedCoordinates.longitude = 27;
    expect(() => validateHistoricalComparison(y, fixtureLocation)).toThrow(
      /grid mismatch.*2023.*2025.*27/,
    );
  });
});

describe("bounded atomic acquisition", () => {
  it("reuses the active year and downloads each missing year once, then uses cache", async () => {
    const fetcher = vi.fn(async (url: unknown) => response(yearFrom(url)));
    const client = new OpenMeteoClient(fetcher as typeof fetch),
      states: YearProgress[] = [];
    const active = completeYears()[2],
      signal = new AbortController().signal;
    const data = await loadHistoricalComparison(client, active, signal, (p) =>
      states.push(p),
    );
    expect(data.years).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      states.filter((p) => p.state === "validated").map((p) => p.origin),
    ).toContain("active dataset");
    states.length = 0;
    await loadHistoricalComparison(client, active, signal, (p) =>
      states.push(p),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      states.filter(
        (p) => p.origin === "validated cache" && p.state === "validated",
      ),
    ).toHaveLength(2);
  });
  it("bounds archive request concurrency at two", async () => {
    let concurrent = 0,
      maximum = 0;
    const fetcher = vi.fn(async (url: unknown) => {
      concurrent++;
      maximum = Math.max(maximum, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrent--;
      return response(yearFrom(url));
    });
    await loadHistoricalComparison(
      new OpenMeteoClient(fetcher as typeof fetch),
      completeYears()[2],
      new AbortController().signal,
    );
    expect(maximum).toBe(2);
  });
  it("does not replace a valid comparison with partial success and permits manual retry", async () => {
    let fail = true;
    const fetcher = vi.fn(async (url: unknown) =>
      yearFrom(url) === 2024 && fail
        ? new Response("", { status: 503 })
        : response(yearFrom(url)),
    );
    const client = new OpenMeteoClient(fetcher as typeof fetch),
      active = completeYears()[2],
      previous = validateHistoricalComparison(completeYears(), fixtureLocation);
    let committed = previous;
    await expect(
      loadHistoricalComparison(
        client,
        active,
        new AbortController().signal,
      ).then((d) => {
        committed = d;
      }),
    ).rejects.toThrow(/503/);
    expect(committed).toBe(previous);
    fail = false;
    committed = await loadHistoricalComparison(
      client,
      active,
      new AbortController().signal,
    );
    expect(committed.years).toHaveLength(3);
  });
  it("rejects a missing leap day instead of zero-filling", async () => {
    const fetcher = vi.fn(async (url: unknown) => {
      const y = yearFrom(url),
        f = archiveFixture(y);
      if (y === 2024) f.daily.time.splice(59, 1);
      return new Response(JSON.stringify(f));
    });
    await expect(
      loadHistoricalComparison(
        new OpenMeteoClient(fetcher as typeof fetch),
        completeYears()[2],
        new AbortController().signal,
      ),
    ).rejects.toThrow(/366/);
  });
  it("guards aborted, late transports and superseded sources", async () => {
    const releases: (() => void)[] = [];
    const fetcher = vi.fn(async (url: unknown) => {
      await new Promise<void>((resolve) => releases.push(resolve));
      return response(yearFrom(url));
    });
    const client = new OpenMeteoClient(fetcher as typeof fetch),
      slot = new RequestSlot(),
      first = slot.begin();
    const progress = vi.fn();
    let committed: HistoricalDataset[] | null = null;
    const pending = loadHistoricalComparison(
      client,
      completeYears()[2],
      first.signal,
      progress,
    ).then((d) => {
      if (first.isCurrent()) committed = [...d.years];
    });
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    slot.begin();
    releases.forEach((resolve) => resolve());
    await rejected;
    expect(committed).toBeNull();
    expect(
      progress.mock.calls.filter(([p]) => p.state === "validated"),
    ).toHaveLength(0);
    expect(client.isCached({ location: fixtureLocation, year: 2023 })).toBe(
      false,
    );
  });
  it("rejects an already cancelled batch without requests", async () => {
    const fetcher = vi.fn(),
      controller = new AbortController();
    controller.abort();
    await expect(
      loadHistoricalComparison(
        new OpenMeteoClient(fetcher),
        completeYears()[2],
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
