import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CloudDownload,
  Layers3,
  ShieldCheck,
  X,
} from "lucide-react";
import { loadHistoricalComparison } from "../data/historicalComparison";
import type {
  HistoricalComparisonDataset,
  YearProgress,
} from "../data/historicalComparison";
import { RequestSlot, ERA5_SOURCE } from "../data/openMeteo";
import { weatherClient } from "../data/weatherClient";
import { HISTORICAL_YEARS, locationLabel } from "../data/rainfall";
import type { RainfallDataset } from "../data/rainfall";
import type { SimulationInput } from "../engine/simulation";
import { SIZING_TARGETS } from "../engine/tankSizing";
import type { SizingTarget } from "../engine/tankSizing";
import {
  currentAnnualResults,
  decideVariability,
  evaluateVariability,
  summarizeVariability,
} from "../engine/variability";
import {
  historicalComparisonToCsv,
  historicalComparisonToJson,
} from "../engine/variabilityExport";

const VariabilityChart = lazy(() => import("./VariabilityChart"));
const number = (n: number, digits = 2) =>
  n.toLocaleString("en-GB", { maximumFractionDigits: digits });
const percent = (n: number | null) =>
  n === null ? "Undefined (zero demand)" : `${number(n * 100)}%`;
const liters = (n: number | null | undefined) =>
  n == null ? "No meaningful recommendation" : `${number(n)} L`;
interface LoadState {
  source: RainfallDataset;
  status: "loading" | "success" | "error" | "cancelled";
  progress: YearProgress[];
  error: string;
}

export default function HistoricalVariabilityLab({
  dataset,
  scenario,
  onChooseHistorical,
}: {
  dataset: RainfallDataset;
  scenario: Omit<SimulationInput, "rainfallMm">;
  onChooseHistorical: () => void;
}) {
  const [comparison, setComparison] =
    useState<HistoricalComparisonDataset | null>(null);
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [target, setTarget] = useState<SizingTarget>(90);
  const [exportMessage, setExportMessage] = useState("");
  const slot = useMemo(() => new RequestSlot(), []);
  // Changing the ACTIVE source aborts the batch. Pending form selections never reach this prop.
  useEffect(() => () => slot.cancel(), [slot, dataset]);
  const state = loadState?.source === dataset ? loadState : null;
  const loading = state?.status === "loading";
  const { roofAreaM2, collectionEfficiency, dailyDemandL, tankCapacityL } =
    scenario;
  const evaluation = useMemo(
    () =>
      comparison
        ? evaluateVariability(
            { roofAreaM2, collectionEfficiency, dailyDemandL },
            comparison.years.map((year) => ({
              key: String(year.year),
              rainfallMm: year.rainfallMm,
            })),
          )
        : null,
    [comparison, roofAreaM2, collectionEfficiency, dailyDemandL],
  );
  const decision = useMemo(
    () => (evaluation ? decideVariability(evaluation, target) : null),
    [evaluation, target],
  );
  const current = useMemo(
    () => (evaluation ? currentAnnualResults(evaluation, tankCapacityL) : null),
    [evaluation, tankCapacityL],
  );
  const variability = useMemo(
    () => (current ? summarizeVariability(current) : null),
    [current],
  );
  const previousLocation =
    comparison &&
    (dataset.kind !== "reanalysis" ||
      comparison.location.id !== dataset.location.id ||
      comparison.location.latitude !== dataset.location.latitude ||
      comparison.location.longitude !== dataset.location.longitude);

  async function load() {
    if (dataset.kind !== "reanalysis") return;
    const request = slot.begin();
    setLoadState({
      source: dataset,
      status: "loading",
      error: "",
      progress: HISTORICAL_YEARS.map((year) => ({
        year,
        state: "queued",
        origin: "archive request",
      })),
    });
    try {
      const data = await loadHistoricalComparison(
        weatherClient,
        dataset,
        request.signal,
        (value) => {
          if (request.isCurrent())
            setLoadState((previous) =>
              previous
                ? {
                    ...previous,
                    progress: previous.progress.map((item) =>
                      item.year === value.year ? value : item,
                    ),
                  }
                : previous,
            );
        },
      );
      if (request.isCurrent()) {
        setComparison(data);
        setLoadState((previous) =>
          previous ? { ...previous, status: "success" } : previous,
        );
      }
    } catch (error) {
      if (request.isCurrent())
        setLoadState((previous) =>
          previous
            ? {
                ...previous,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Historical comparison failed.",
              }
            : previous,
        );
    }
  }
  function cancel() {
    slot.cancel();
    setLoadState((previous) =>
      previous ? { ...previous, status: "cancelled" } : previous,
    );
  }
  function download(format: "csv" | "json") {
    if (!comparison || !evaluation) return;
    const content =
      format === "csv"
        ? historicalComparisonToCsv(
            comparison,
            evaluation,
            tankCapacityL,
            target,
          )
        : historicalComparisonToJson(
            comparison,
            evaluation,
            tankCapacityL,
            target,
          );
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `cisternlab-historical-${comparison.location.id}-2023-2025-${target}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage(
      `${format.toUpperCase()} downloaded with the displayed comparison and inputs at the time of download.`,
    );
  }

  return (
    <section
      id="historical-variability"
      className="variability-lab"
      aria-labelledby="variability-title"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">THREE YEARS. A WIDER PERSPECTIVE.</div>
          <h2 id="variability-title">Historical Variability Lab</h2>
          <p>Historical sensitivity comparison · 2023, 2024 & 2025</p>
        </div>
        <span className="estimate-label">ESTIMATED RESULT</span>
      </div>

      <div className="panel variability-loader">
        <div className="variability-source-heading">
          <Layers3 size={23} />
          <div>
            <h3>
              {dataset.kind === "reanalysis"
                ? `Active location: ${locationLabel(dataset.location)}`
                : "Begin with a historical location"}
            </h3>
            <p>
              {dataset.kind === "reanalysis"
                ? "HISTORICAL REANALYSIS — ERA5 · rain_sum in mm. Only the active validated city is used."
                : "The three-year lab requires an active validated historical location. Synthetic examples have no real location or calendar years."}
            </p>
          </div>
        </div>
        <div className="variability-load-actions">
          {dataset.kind === "reanalysis" ? (
            <>
              <button
                className="primary-button"
                disabled={loading}
                onClick={() => void load()}
              >
                <CloudDownload size={16} />
                {loading
                  ? "Loading three years…"
                  : state?.status === "error"
                    ? "Retry three-year comparison"
                    : comparison
                      ? "Reload three-year comparison"
                      : "Load three-year comparison"}
              </button>
              {loading && (
                <button className="secondary-button" onClick={cancel}>
                  <X size={15} />
                  Cancel comparison load
                </button>
              )}
              <span>
                No download until requested · up to two concurrent requests ·
                validated years reused
              </span>
            </>
          ) : (
            <button className="secondary-button" onClick={onChooseHistorical}>
              Choose historical data <ArrowUpRight size={14} />
            </button>
          )}
        </div>
        {state && (
          <ol
            className="year-progress"
            aria-label="Annual loading progress"
            aria-live="polite"
          >
            {state.progress.map((p) => (
              <li key={p.year} data-state={p.state}>
                <strong>{p.year}</strong>
                <span>
                  {p.state === "validated"
                    ? "Validated"
                    : state.status === "error" && p.state === "loading"
                      ? "Stopped"
                      : state.status === "cancelled"
                        ? "Cancelled"
                        : p.state}{" "}
                  · {p.origin}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p role="status" className="variability-status">
          {loading
            ? "Validating all three complete calendars. No partial comparison will replace the previous result."
            : state?.status === "success"
              ? "All three complete years loaded and validated: 365 + 366 + 365 daily values."
              : state?.status === "cancelled"
                ? "Comparison load cancelled. No partial result committed."
                : "Each calendar year will start with an empty tank. Dashboard initial storage is unchanged."}
        </p>
        {state?.status === "error" && (
          <div className="data-error" role="alert">
            <p>{state.error}</p>
            <p>
              {comparison
                ? `Previous valid comparison retained: ${locationLabel(comparison.location)} · 2023–2025.`
                : "No complete comparison is available. All three years must pass; missing values are never filled."}{" "}
              Retry manually when ready.
            </p>
          </div>
        )}
      </div>

      {comparison && evaluation && decision && current && variability && (
        <>
          <div
            className="panel variability-context"
            data-testid="variability-context"
          >
            <span className="dataset-kicker">
              DISPLAYED COMPARISON · COMPLETE & VALIDATED
            </span>
            <h3>
              <ShieldCheck size={18} />
              {locationLabel(comparison.location)}
            </h3>
            <p>
              ERA5 historical reanalysis · 2023-01-01 to 2025-12-31 · three
              independent calendars, never concatenated
            </p>
            {previousLocation && (
              <p className="sizing-start-note" role="status">
                Previous comparison location shown above. The active dashboard
                source has changed. Load its three years explicitly to replace
                this result.
              </p>
            )}
            <div className="sizing-assumptions">
              <span>
                <strong>{number(roofAreaM2)} m²</strong> roof
              </span>
              <span>
                <strong>{number(collectionEfficiency * 100)}%</strong>{" "}
                efficiency
              </span>
              <span>
                <strong>{number(dailyDemandL)} L/day</strong> demand
              </span>
              <span>
                <strong>{number(tankCapacityL)} L</strong> current tank
              </span>
              <span>
                <strong>0 L</strong> each January 1
              </span>
              <a href="#simulator">
                Edit scenario inputs <ArrowUpRight size={12} />
              </a>
            </div>
            <p className="sizing-start-note">
              Every candidate starts empty in EACH year. December storage is
              discarded before the next independent January. Dashboard initial
              storage remains {number(scenario.initialStorageL)} L.
            </p>
            <p className="sizing-attribution">
              Weather:{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo
              </a>{" "}
              ·{" "}
              <a href={ERA5_SOURCE} target="_blank" rel="noreferrer">
                ERA5 / Copernicus
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>{" "}
              · Location:{" "}
              <a
                href="https://www.geonames.org/"
                target="_blank"
                rel="noreferrer"
              >
                GeoNames
              </a>
            </p>
            <details className="variability-provenance">
              <summary>Inspect all three original source records</summary>
              {comparison.years.map((year) => (
                <div key={year.year}>
                  <h4>
                    {year.year} · {year.dates.length} validated dates
                  </h4>
                  <dl>
                    <dt>Coverage</dt>
                    <dd>
                      {year.startDate} to {year.endDate}
                    </dd>
                    <dt>Requested city coordinates</dt>
                    <dd>
                      {year.requestedCoordinates.latitude},{" "}
                      {year.requestedCoordinates.longitude} · ID{" "}
                      {year.location.id}
                    </dd>
                    <dt>Returned ERA5 grid</dt>
                    <dd>
                      {year.returnedCoordinates.latitude},{" "}
                      {year.returnedCoordinates.longitude}
                    </dd>
                    <dt>Daily aggregation</dt>
                    <dd>
                      {year.timezone} · {year.timezoneAbbreviation} · fixed UTC
                      offset {year.utcOffsetSeconds} s
                    </dd>
                    <dt>Retrieval / variable</dt>
                    <dd>
                      {year.retrievedAt} · {year.variable} / {year.units}
                    </dd>
                    <dt>Reproducible request</dt>
                    <dd>
                      <a href={year.sourceUrl} target="_blank" rel="noreferrer">
                        {year.sourceUrl}
                      </a>
                    </dd>
                  </dl>
                </div>
              ))}
            </details>
          </div>

          <div className="annual-cards">
            {current.map(({ key, candidate: c }, index) => (
              <article
                className={`panel annual-card year-${index}`}
                key={key}
                data-testid={`annual-${key}`}
              >
                <div className="annual-card-title">
                  <h3>{key}</h3>
                  <span>{c.simulationDays} days · empty start</span>
                </div>
                <div className="annual-supply">
                  <strong>{number(c.supplyL)}</strong>
                  <span>L modeled water supplied</span>
                </div>
                <dl>
                  <dt>Annual rainfall</dt>
                  <dd>{number(c.rainfallMm)} mm</dd>
                  <dt>Demand coverage</dt>
                  <dd>{percent(c.demandCoverage)}</dd>
                  <dt>Unmet demand</dt>
                  <dd>{number(c.unmetDemandL)} L</dd>
                  <dt>Shortage days</dt>
                  <dd>{c.shortageDays} days</dd>
                </dl>
                <p>
                  Current {number(tankCapacityL)} L tank · same physical inputs
                </p>
              </article>
            ))}
          </div>

          <div className="sizing-decision-grid">
            <article
              className="sizing-recommendation"
              aria-label="Three-year capacity decision"
            >
              <span className="sizing-card-kicker">
                Three-year comparison capacity
              </span>
              <p
                className="sizing-recommended-number"
                data-testid="three-year-capacity"
              >
                {decision.capacityL === null ? "—" : number(decision.capacityL)}
                {decision.capacityL !== null && <span> L</span>}
              </p>
              <p className="sizing-recommendation-copy">
                {decision.noBenefitReason ??
                  `The smallest positive standard tank reaching at least ${target}% of each year's maximum tested supply, within the documented numerical tolerance.`}
              </p>
              <p className="sizing-achieved">
                A conservative historical heuristic for these three years. No
                long-term guarantee or calibrated risk estimate.
              </p>
            </article>
            <article className="panel sizing-target-card">
              <h3>One target, three annual checks</h3>
              <p>
                Each year has its own tested maximum. The target is a fraction
                of supply, not demand coverage.
              </p>
              <fieldset className="yield-target">
                <legend>Historical comparison supply target</legend>
                <div>
                  {SIZING_TARGETS.map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="variability-target"
                        value={value}
                        checked={target === value}
                        onChange={() => setTarget(value)}
                      />
                      <span>{value}%</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <ul className="annual-decisions">
                {decision.annual.map((year) => (
                  <li key={year.key}>
                    <strong>{year.key}</strong>
                    <span data-testid={`annual-recommendation-${year.key}`}>
                      {liters(year.recommended?.capacityL)}
                    </span>
                    <small>
                      {number(year.targetSupplyL)} L target /{" "}
                      {number(year.maximumStandardSupplyL)} L maximum
                    </small>
                  </li>
                ))}
              </ul>
              <p>
                Annual recommendations are conditional on that year's rain.
                Current-only capacities never enter this standard pool.
              </p>
            </article>
          </div>

          <div className="panel variability-ranges">
            <h3>Observed range across these three years</h3>
            <p>
              For the current {number(tankCapacityL)} L tank; ties list every
              matching year.
            </p>
            <div className="variability-range-grid">
              <div>
                <span>Modeled supply range</span>
                <strong>
                  {number(variability.supply.min)}–
                  {number(variability.supply.max)} L
                </strong>
                <p>
                  Lowest: {variability.supply.lowestYears.join(", ")} · Highest:{" "}
                  {variability.supply.highestYears.join(", ")}
                </p>
              </div>
              <div>
                <span>Demand coverage range</span>
                <strong>
                  {variability.coverage
                    ? `${number(variability.coverage.min * 100)}–${number(variability.coverage.max * 100)}%`
                    : "Undefined (zero demand)"}
                </strong>
                <p>
                  {variability.coverage
                    ? `Lowest: ${variability.coverage.lowestYears.join(", ")} · Highest: ${variability.coverage.highestYears.join(", ")}`
                    : "Demand percentages are undefined when demand is zero."}
                </p>
              </div>
              <div>
                <span>Annual rainfall range</span>
                <strong>
                  {number(variability.rainfall.min)}–
                  {number(variability.rainfall.max)} mm
                </strong>
                <p>
                  Lowest: {variability.rainfall.lowestYears.join(", ")} ·
                  Highest: {variability.rainfall.highestYears.join(", ")}
                </p>
              </div>
            </div>
            <p>
              Rain timing and storage within each year matter. The lowest
              rainfall year need not have the lowest coverage. These ranges
              carry no probability or climate-trend significance.
            </p>
          </div>

          <div className="panel sizing-chart-panel">
            <div className="sizing-chart-heading">
              <div>
                <h3>Capacity × year · modeled water supplied</h3>
                <p>
                  Identical standard capacities, three independent rainfall
                  sequences.
                </p>
              </div>
              <div className="variability-legend">
                <span>━━ 2023</span>
                <span>┄┄ 2024</span>
                <span>··· 2025</span>
              </div>
            </div>
            <div className="sizing-chart-unit">ANNUAL MODELED SUPPLY (L)</div>
            <div
              className="sizing-chart variability-chart"
              role="img"
              aria-label="Standard tank capacity in liters versus annual supplied water in liters for 2023, 2024, 2025. Exact values in the candidate table below."
            >
              <Suspense fallback={<p>Loading comparison chart…</p>}>
                <VariabilityChart evaluation={evaluation} />
              </Suspense>
            </div>
            <p className="sizing-chart-note">
              Lines connect tested capacities only. Rainfall (mm) and coverage
              (%) are reported separately. The table below contains every
              plotted value.
            </p>
          </div>

          <div className="panel variability-shortages">
            <h3>Shortages, day by day</h3>
            <p>
              A shortage day has any positive unmet volume. A streak is
              consecutive shortage days within one year. Neither is a
              meteorological drought or a claim about sub-daily service.
            </p>
            <div
              className="table-scroll"
              role="region"
              aria-label="Annual current tank performance"
              tabIndex={0}
            >
              <table className="variability-current-table">
                <caption>
                  Current {number(tankCapacityL)} L tank · independent empty
                  starts · modeled volumes in L
                </caption>
                <thead>
                  <tr>
                    {[
                      "Year",
                      "Annual demand (L)",
                      "Modeled freshwater displacement (L)",
                      "Overflow (L)",
                      "Unmet (L)",
                      "Fully supplied days",
                      "Shortage days",
                      "Longest shortage streak (days)",
                      "End storage (L)",
                    ].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.map(({ key, candidate: c }) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      {[
                        c.annualDemandL,
                        c.modeledFreshwaterDisplacementL,
                        c.overflowL,
                        c.unmetDemandL,
                        c.fullySuppliedDays,
                        c.shortageDays,
                        c.longestShortageStreak,
                        c.finalStorageL,
                      ].map((n, i) => (
                        <td key={i}>{String(n)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p data-testid="shortage-summary">
              Largest shortage-day count: {variability.shortageDays.max} (
              {variability.shortageDays.highestYears.join(", ")}). Longest
              shortage streak: {variability.shortageStreak.max} days (
              {variability.shortageStreak.highestYears.join(", ")}). Streaks
              reset each January.
            </p>
            <p>
              Modeled freshwater displacement equals water supplied only when it
              replaces existing freshwater use. No measured savings are claimed.
              With zero demand, full-demand days are a literal count; coverage
              and reliability percentages remain undefined.
            </p>
          </div>

          <details className="panel variability-candidates">
            <summary>
              Exact capacity × year results ·{" "}
              {evaluation.capacitiesL.length * 3} standard evaluations
            </summary>
            <p>
              Full precision; coverage is a fraction (multiply by 100 for %).
              Current-only capacities are excluded. All plotted supply values
              appear here.
            </p>
            <div
              className="table-scroll"
              role="region"
              aria-label="Historical candidate comparison"
              tabIndex={0}
            >
              <table>
                <caption>
                  Standard capacity/year metrics · rain in mm; volumes in L;
                  durations in days
                </caption>
                <thead>
                  <tr>
                    {[
                      "Year / capacity (L)",
                      "Rain (mm)",
                      "Supply (L)",
                      "Coverage (fraction)",
                      "Annual demand (L)",
                      "Overflow (L)",
                      "Unmet (L)",
                      "Fully supplied days",
                      "Shortage days",
                      "Longest shortage streak",
                      "End storage (L)",
                    ].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluation.annual.flatMap((year) =>
                    year.candidates.map((c) => (
                      <tr
                        key={`${year.key}-${c.capacityL}`}
                        data-testid={`historical-row-${year.key}-${c.capacityL}`}
                      >
                        <th scope="row">
                          {year.key} / {c.capacityL}
                        </th>
                        {[
                          c.rainfallMm,
                          c.supplyL,
                          c.demandCoverage ?? "Undefined",
                          c.annualDemandL,
                          c.overflowL,
                          c.unmetDemandL,
                          c.fullySuppliedDays,
                          c.shortageDays,
                          c.longestShortageStreak,
                          c.finalStorageL,
                        ].map((n, i) => (
                          <td key={i}>{String(n)}</td>
                        ))}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>

          <div className="panel variability-exports">
            <div>
              <h3>Keep a reproducible record</h3>
              <p>
                CSV: one row per standard capacity/year. JSON: all original
                dated rainfall, full provenance, inputs, assumptions, results
                and schema version. Local downloads only.
              </p>
            </div>
            <div className="variability-export-buttons">
              <button
                className="secondary-button"
                onClick={() => download("csv")}
              >
                <ArrowDownToLine size={14} />
                Export historical comparison CSV
              </button>
              <button
                className="secondary-button"
                onClick={() => download("json")}
              >
                <ArrowDownToLine size={14} />
                Export reproducibility JSON
              </button>
            </div>
            <p role="status">{exportMessage}</p>
          </div>
        </>
      )}

      <details className="panel variability-methodology">
        <summary>Historical comparison methodology & limits</summary>
        <p>
          Each of 2023, 2024 and 2025 uses the original daily rain-before-demand
          engine and the unchanged single-year sizing rule, the same physical
          inputs and standard capacity set, and 0 L initial water. Annual starts
          are independent; years are never concatenated. The dashboard's own
          initial storage does not enter this analysis.
        </p>
        <p>
          For each year y, M[y] is maximum modeled supply among standard
          capacities. Target T[y] = selected fraction × M[y]. The three-year
          comparison capacity is the smallest positive standard tank whose
          supply + 1e-10 × M[y] ≥ T[y] for every year. If any M[y] = 0, relative
          yield is not informative and no meaningful three-year recommendation
          is issued. Individual annual results remain available. Zero demand
          produces undefined percentages.
        </p>
        <p>
          ERA5 is gridded historical reanalysis, not rainfall measured at the
          selected roof. Complete calendars contain 365, 366 and 365 days.
          Requested city and returned grid coordinates are preserved;
          inconsistent grids or daily aggregation metadata block comparison.
          Original timestamps, request URLs and fixed UTC offsets are recorded.
          No missing data are filled. Availability and upstream revisions can
          affect later downloads.
        </p>
        <p>
          Three years are a deliberately limited historical sensitivity
          comparison, not a climate normal, forecast, statistically significant
          trend, long-term reliable site design or engineering certification.
          Fixed daily demand and efficiency omit treatment, first flush,
          evaporation, leakage and installation design. No measured
          environmental savings, financial optimum or carbon estimate is
          inferred.
        </p>
        <p>
          <a
            href="https://open-meteo.com/en/docs/historical-weather-api"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo documentation
          </a>{" "}
          describes the source.{" "}
          <a
            href="https://doi.org/10.1016/j.resconrec.2013.05.006"
            target="_blank"
            rel="noreferrer"
          >
            Imteaz et al. (2013)
          </a>{" "}
          provides daily water-balance reliability background.{" "}
          <a
            href="https://doi.org/10.1007/s43832-026-00344-z"
            target="_blank"
            rel="noreferrer"
          >
            Hazaymeh & Lange (2026)
          </a>{" "}
          examines rainfall variability, temporal resolution and record length
          in selected Jordanian and German sites, supporting caution about short
          records. Neither study validates CisternLab's exact cross-year
          heuristic.
        </p>
      </details>
    </section>
  );
}
