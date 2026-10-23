import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CloudDownload,
  Database,
  FlaskConical,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { ERA5_SOURCE, OpenMeteoClient, RequestSlot } from "../data/openMeteo";
import { HISTORICAL_YEARS, locationLabel } from "../data/rainfall";
import type {
  HistoricalDataset,
  HistoricalYear,
  Location,
  RainfallDataset,
  SourceMode,
} from "../data/rainfall";

const client = new OpenMeteoClient();
type Status = "idle" | "waiting" | "loading" | "success" | "error";
const coords = (point: { latitude: number; longitude: number } | null) =>
  point
    ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
    : "Not applicable";

export function DatasetSummary({ dataset }: { dataset: RainfallDataset }) {
  const historical = dataset.kind === "reanalysis";
  return (
    <section className="dataset-summary" aria-label="Active rainfall dataset">
      <div className="dataset-summary-heading">
        <Database size={16} />
        <div>
          <span className="dataset-kicker">ACTIVE RAINFALL DATASET</span>
          <h3 data-testid="active-dataset">{dataset.name}</h3>
        </div>
        <span className="validation-badge">
          <Check size={12} />
          {dataset.rainfallMm.length} days validated
        </span>
      </div>
      <p className="dataset-period">
        {historical
          ? `${dataset.startDate} to ${dataset.endDate} · ${dataset.timezone} · rain_sum (mm)`
          : "30 authored days · no real location or calendar dates · rainfall in mm"}
      </p>
      <span
        className={
          historical
            ? "source-classification historical"
            : "source-classification"
        }
        data-testid="dataset-classification"
      >
        {historical ? "HISTORICAL REANALYSIS — ERA5" : "DEMO DATA — SYNTHETIC"}
      </span>
      {historical && (
        <p className="source-attribution">
          Weather data by{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          ·{" "}
          <a href={ERA5_SOURCE} target="_blank" rel="noreferrer">
            ERA5 / Copernicus C3S
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . Model data, not station measurements. Locations by{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
          .
        </p>
      )}
      <details className="provenance-details">
        <summary>Inspect source & provenance</summary>
        <dl>
          <dt>Classification</dt>
          <dd>{dataset.classification}</dd>
          <dt>Provider / model</dt>
          <dd>
            {dataset.provider} / {dataset.model ?? "No weather model"}
          </dd>
          <dt>Selected location</dt>
          <dd>
            {dataset.location
              ? locationLabel(dataset.location)
              : "None — synthetic sequence"}
          </dd>
          <dt>Requested coordinates</dt>
          <dd>{coords(dataset.requestedCoordinates)}</dd>
          <dt>Returned grid coordinates</dt>
          <dd>{coords(dataset.returnedCoordinates)}</dd>
          <dt>Year / date range</dt>
          <dd>
            {historical
              ? `${dataset.year} / ${dataset.startDate} to ${dataset.endDate}`
              : "Not applicable — simulated days 1–30"}
          </dd>
          <dt>Timezone / UTC offset</dt>
          <dd>
            {historical
              ? `${dataset.timezone} (${dataset.timezoneAbbreviation}), ${dataset.utcOffsetSeconds} seconds`
              : "Not applicable"}
          </dd>
          <dt>Location timezone</dt>
          <dd>
            {dataset.location?.timezone ?? "Not available / not applicable"}
          </dd>
          <dt>Variable / units</dt>
          <dd>
            {dataset.variable} / {dataset.units}
          </dd>
          <dt>Retrieved (UTC)</dt>
          <dd>
            {dataset.retrievedAt ?? "Not applicable — authored in BUILD 01"}
          </dd>
          <dt>Validation</dt>
          <dd>
            {dataset.validationStatus} — complete ordered coverage, finite
            nonnegative rain
          </dd>
          <dt>Reproducible source</dt>
          <dd>
            {historical ? (
              <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
                {dataset.sourceUrl}
              </a>
            ) : (
              <code>{dataset.sourceUrl}</code>
            )}
          </dd>
        </dl>
        {historical && (
          <p>
            ERA5 represents a grid cell, not this roof. Daily sums aggregate
            hourly values using the API's returned fixed UTC offset; DST changes
            within the period are not reconstructed. Calendar dates are kept
            exactly as returned. Original daily rainfall is preserved;
            CisternLab transforms it into estimated tank volumes. No provider
            endorsement is implied.
          </p>
        )}
      </details>
    </section>
  );
}

export default function RainfallSource({
  mode,
  onModeChange,
  dataset,
  onLoad,
}: {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  dataset: RainfallDataset;
  onLoad: (dataset: HistoricalDataset) => void;
}) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [results, setResults] = useState<Location[]>([]);
  const [searchStatus, setSearchStatus] = useState<Status>("idle");
  const [searchError, setSearchError] = useState("");
  const [retry, setRetry] = useState(0);
  const [year, setYear] = useState<HistoricalYear>(2025);
  const [loadStatus, setLoadStatus] = useState<Status>("idle");
  const [loadError, setLoadError] = useState("");
  const searchSlot = useMemo(() => new RequestSlot(), []);
  const loadSlot = useMemo(() => new RequestSlot(), []);

  useEffect(() => {
    if (mode !== "historical" || location || query.trim().length < 3) return;
    const timer = setTimeout(async () => {
      const request = searchSlot.begin();
      setSearchStatus("loading");
      try {
        const matches = await client.search(query, request.signal);
        if (request.isCurrent()) {
          setResults(matches);
          setSearchStatus("success");
        }
      } catch (error) {
        if (request.isCurrent()) {
          setSearchError(
            error instanceof Error ? error.message : "Location search failed.",
          );
          setSearchStatus("error");
        }
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      searchSlot.cancel();
    };
  }, [mode, query, location, retry, searchSlot]);
  useEffect(() => () => loadSlot.cancel(), [loadSlot, mode]);

  function cancelLoad() {
    loadSlot.cancel();
    setLoadStatus("idle");
    setLoadError("");
  }
  function changeMode(next: SourceMode) {
    searchSlot.cancel();
    cancelLoad();
    setSearchStatus("idle");
    setResults([]);
    onModeChange(next);
    // A partial query can be resumed deliberately by editing or retrying it.
    if (next === "historical" && !location && query.trim().length >= 3) {
      setSearchStatus("waiting");
      setRetry((value) => value + 1);
    }
  }
  async function load() {
    if (!location) return;
    const request = loadSlot.begin();
    setLoadStatus("loading");
    setLoadError("");
    try {
      const data = await client.load({ location, year }, request.signal);
      if (request.isCurrent()) {
        onLoad(data);
        setLoadStatus("success");
      }
    } catch (error) {
      if (request.isCurrent()) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Rainfall could not be loaded.",
        );
        setLoadStatus("error");
      }
    }
  }
  const pending =
    dataset.kind !== "reanalysis" ||
    dataset.location.id !== location?.id ||
    dataset.year !== year;

  return (
    <div className="rainfall-source panel">
      <div className="source-header">
        <div>
          <h3>Choose your rainfall source</h3>
          <p>Start with a demo or explore a complete historical year.</p>
        </div>
        <div
          className="source-switch"
          role="group"
          aria-label="Rainfall data source"
        >
          <button
            aria-pressed={mode === "synthetic"}
            onClick={() => changeMode("synthetic")}
          >
            <FlaskConical size={14} />
            Synthetic Demo
          </button>
          <button
            aria-pressed={mode === "historical"}
            onClick={() => changeMode("historical")}
          >
            <Database size={14} />
            Historical Reanalysis
          </button>
        </div>
      </div>
      {mode === "historical" ? (
        <div className="historical-form">
          <div className="historical-intro">
            <span className="step-label">LOCATION → YEAR → LOAD → INSPECT</span>
            <p>
              Choose a city explicitly. Roof and tank changes reuse the loaded
              rainfall.
            </p>
          </div>
          <div className="historical-inputs">
            <div className="location-field">
              <label htmlFor="location-search">Search city worldwide</label>
              <div className="location-input">
                <Search size={16} />
                <input
                  id="location-search"
                  type="search"
                  autoComplete="off"
                  value={query}
                  placeholder="e.g. Edirne, Türkiye"
                  aria-describedby="search-status"
                  onChange={(event) => {
                    searchSlot.cancel();
                    cancelLoad();
                    setLocation(null);
                    setResults([]);
                    setQuery(event.target.value);
                    setSearchError("");
                    setSearchStatus(
                      event.target.value.trim().length >= 3
                        ? "waiting"
                        : "idle",
                    );
                  }}
                />
                {location && <Check size={15} />}
              </div>
            </div>
            <div className="year-field">
              <label htmlFor="historical-year">Complete calendar year</label>
              <select
                id="historical-year"
                value={year}
                onChange={(event) => {
                  cancelLoad();
                  setYear(Number(event.target.value) as HistoricalYear);
                }}
              >
                {HISTORICAL_YEARS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
                <option value="2026" disabled>
                  2026 — incomplete
                </option>
              </select>
            </div>
            <button
              className="load-rainfall"
              disabled={!location || loadStatus === "loading"}
              onClick={() => void load()}
            >
              {loadStatus === "loading" ? (
                <LoaderCircle className="loading-spinner" size={15} />
              ) : (
                <CloudDownload size={15} />
              )}{" "}
              {loadStatus === "error"
                ? "Retry rainfall data"
                : loadStatus === "loading"
                  ? "Loading rainfall…"
                  : "Load rainfall data"}
            </button>
            {loadStatus === "loading" && (
              <button className="cancel-load" onClick={cancelLoad}>
                <X size={13} />
                Cancel
              </button>
            )}
          </div>
          <div id="search-status" className="search-status" role="status">
            {location ? (
              <span>
                <MapPin size={13} />
                <strong>Selected:</strong> {locationLabel(location)} ·{" "}
                {coords(location)} ·{" "}
                {location.timezone ?? "Timezone resolved on load"}
              </span>
            ) : searchStatus === "loading" ? (
              "Searching Open-Meteo locations…"
            ) : searchStatus === "waiting" ? (
              "Waiting for you to finish typing…"
            ) : searchStatus === "success" && results.length === 0 ? (
              "No matching locations. Try a longer city name or add a country."
            ) : searchStatus === "success" ? (
              "Select the correct city below. Region, country, and coordinates distinguish namesakes."
            ) : searchStatus !== "error" ? (
              "Enter at least 3 characters. No location is selected automatically."
            ) : null}
          </div>
          {searchStatus === "error" && (
            <div className="data-error" role="alert">
              <p>{searchError}</p>
              <button
                onClick={() => {
                  setSearchStatus("waiting");
                  setRetry((value) => value + 1);
                }}
              >
                Retry location search
              </button>
            </div>
          )}
          {results.length > 0 && !location && (
            <ul className="location-results" aria-label="Matching locations">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      searchSlot.cancel();
                      cancelLoad();
                      setLocation(item);
                      setQuery(item.name);
                      setResults([]);
                      setSearchStatus("idle");
                    }}
                  >
                    <MapPin size={15} />
                    <span>
                      <strong>{item.name}</strong>
                      <span>
                        {item.region} · {item.country}
                      </span>
                      <small>
                        {coords(item)} ·{" "}
                        {item.timezone ?? "Timezone unavailable"} · ID {item.id}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loadStatus === "error" && (
            <div className="data-error" role="alert">
              <p>{loadError}</p>
              <p>
                Active results still use <strong>{dataset.name}</strong>. No
                partial annual output was calculated. Retry manually or choose
                Synthetic Demo.
              </p>
            </div>
          )}
          <p className="load-status" role="status">
            {loadStatus === "loading"
              ? "Fetching one complete year. The current valid dataset remains active until validation passes."
              : pending
                ? "Selection is not applied yet. Load rainfall data to replace the active dataset below."
                : "Complete year validated. Scenario controls recalculate locally; no new download is needed."}
          </p>
          <p className="api-note">
            Non-commercial public Open-Meteo API · ERA5 only · rain_sum in mm ·
            no API key. Searches contact Open-Meteo after a 350 ms pause;
            historical downloads require the Load button.
          </p>
        </div>
      ) : (
        <p className="synthetic-intro">
          Three deterministic, authored 30-day patterns. Ready immediately, with
          no internet requests. Choose a pattern in the scenario panel.
        </p>
      )}
      <DatasetSummary dataset={dataset} />
    </div>
  );
}
