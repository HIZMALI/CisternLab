import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  Droplets,
  FileText,
  Printer,
  ShieldCheck,
} from "lucide-react";
import type { RainfallDataset } from "../data/rainfall";
import type { HistoricalComparisonDataset } from "../data/historicalComparison";
import type { SimulationInput } from "../engine/simulation";
import type { SizingTarget } from "../engine/tankSizing";
import { SIZING_TARGETS, STANDARD_CAPACITIES_L } from "../engine/tankSizing";
import {
  activeImpactSource,
  buildImpactView,
  comparisonImpactSource,
  currentImpactMetrics,
  evaluateImpactEvidence,
  evidenceBriefData,
  impactKeyFindings,
  IMPACT_CAVEAT,
  IMPACT_LIMITS,
} from "../engine/impactEvidence";
import { RequestSlot } from "../data/openMeteo";
import { prepareArchivedEvidence } from "../data/archiveClient";
import type { ArchivedEvidence } from "../data/archivedEvidence";
import EvidenceSourceRecords from "./EvidenceSourceRecords";
import EvidenceBrief from "./EvidenceBrief";
import JudgeWalkthrough from "./JudgeWalkthrough";

const ImpactEvidenceChart = lazy(() => import("./ImpactEvidenceChart"));
const n = (v: number) =>
  v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
const signed = (v: number) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v))}`;
const coverage = (v: number | null) =>
  v === null ? "Undefined (zero demand)" : `${n(v * 100)}%`;
const DEFAULT_ARCHIVED_INPUTS = {
  roofAreaM2: 120,
  collectionEfficiency: 0.8,
  dailyDemandL: 250,
  currentCapacityL: 2000,
};
type Mode = "active" | "archive" | "comparison";

export default function ImpactEvidenceStudio({
  dataset,
  scenario,
  comparison,
}: {
  dataset: RainfallDataset;
  scenario: Omit<SimulationInput, "rainfallMm">;
  comparison: HistoricalComparisonDataset | null;
}) {
  const [mode, setMode] = useState<Mode>("active");
  const [archive, setArchive] = useState<ArchivedEvidence | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archivedInputs, setArchivedInputs] = useState({
    ...DEFAULT_ARCHIVED_INPUTS,
  });
  const [target, setTarget] = useState<SizingTarget>(90);
  const [alternative, setAlternative] = useState(3000);
  const [copyStatus, setCopyStatus] = useState("");
  const intent = useMemo(() => new RequestSlot(), []);

  useEffect(() => {
    let mounted = true;
    // Local asset warmup is deferred; no weather request or automatic analysis-mode change.
    const timer = setTimeout(() => {
      void prepareArchivedEvidence()
        .then((data) => {
          if (mounted) setArchive(data);
        })
        .catch((error: unknown) => {
          if (mounted)
            setArchiveError(
              error instanceof Error
                ? error.message
                : "Archived evidence unavailable.",
            );
        });
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
      intent.cancel();
    };
  }, [intent]);
  async function chooseArchive() {
    const request = intent.begin();
    setArchiveBusy(true);
    setArchiveError("");
    try {
      const loaded = archive ?? (await prepareArchivedEvidence());
      if (request.isCurrent()) {
        setArchive(loaded);
        setMode("archive");
      }
    } catch (error) {
      if (request.isCurrent())
        setArchiveError(
          error instanceof Error
            ? error.message
            : "Archived evidence unavailable.",
        );
    } finally {
      if (request.isCurrent()) setArchiveBusy(false);
    }
  }
  function choose(mode: Mode) {
    intent.cancel();
    setArchiveBusy(false);
    setMode(mode);
  }
  const active = mode === "active" ? dataset : null;
  const chosenArchive = mode === "archive" ? archive : null;
  const chosenComparison = mode === "comparison" ? comparison : null;
  const source = useMemo(
    () =>
      active
        ? activeImpactSource(active)
        : chosenArchive
          ? comparisonImpactSource(chosenArchive.comparison, true)
          : chosenComparison
            ? comparisonImpactSource(chosenComparison)
            : null,
    [active, chosenArchive, chosenComparison],
  );
  const roofAreaM2 =
    mode === "archive" ? archivedInputs.roofAreaM2 : scenario.roofAreaM2;
  const collectionEfficiency =
    mode === "archive"
      ? archivedInputs.collectionEfficiency
      : scenario.collectionEfficiency;
  const dailyDemandL =
    mode === "archive" ? archivedInputs.dailyDemandL : scenario.dailyDemandL;
  const currentCapacityL =
    mode === "archive"
      ? archivedInputs.currentCapacityL
      : scenario.tankCapacityL;
  const evaluation = useMemo(
    () =>
      source
        ? evaluateImpactEvidence(source, {
            roofAreaM2,
            collectionEfficiency,
            dailyDemandL,
            currentCapacityL,
          })
        : null,
    [source, roofAreaM2, collectionEfficiency, dailyDemandL, currentCapacityL],
  );
  const current = useMemo(
    () => (evaluation ? currentImpactMetrics(evaluation) : null),
    [evaluation],
  );
  const view = useMemo(
    () =>
      evaluation && current
        ? buildImpactView(evaluation, current, target, alternative)
        : null,
    [evaluation, current, target, alternative],
  );
  const brief = useMemo(
    () => (evaluation && view ? evidenceBriefData(evaluation, view) : null),
    [evaluation, view],
  );
  async function copy() {
    if (!evaluation || !view) return;
    try {
      await navigator.clipboard.writeText(impactKeyFindings(evaluation, view));
      setCopyStatus(
        "Key findings copied with source, period, units, assumptions and caveats.",
      );
    } catch {
      setCopyStatus(
        "Clipboard unavailable. Open the text summary below and copy it manually.",
      );
    }
  }
  function downloadOriginal() {
    if (!archive) return;
    const url = URL.createObjectURL(
      new Blob([archive.originalText], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cisternlab-edirne-era5-2023-2025.snapshot.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      id="impact-evidence"
      className="impact-studio"
      aria-labelledby="impact-studio-title"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            FROM MODELED LITERS TO A CLEARER DECISION
          </div>
          <h2 id="impact-studio-title">Impact & Evidence</h2>
          <p>Environmental Impact & Evidence Studio</p>
        </div>
        <span className="estimate-label">ESTIMATED RESULT</span>
      </div>
      <div className="panel evidence-challenge">
        <span className="evidence-symbol">
          <Droplets size={25} />
        </span>
        <div>
          <h3>Rain has value when it can meet a real need.</h3>
          <p>
            Rain arriving in bursts can overflow a tank while later demand goes
            unmet. Homes, schools and small facilities can explore storage for
            non-potable uses such as toilet flushing, cleaning and irrigation.
            Matching rainfall timing, storage and actual demand matters more
            than an annual rain total alone.
          </p>
          <p>
            Our environmental indicator is{" "}
            <strong>potential freshwater displacement</strong>: a conditional
            estimate of rainwater delivered to existing demand. We measure
            modeled liters here; implementation and actual savings require
            real-world evidence.
          </p>
        </div>
      </div>

      <div className="panel evidence-mode-panel">
        <div className="evidence-action-heading">
          <div>
            <span className="dataset-kicker">CHOOSE AN EVIDENCE SOURCE</span>
            <h3>Your scenario or a preserved historical example</h3>
          </div>
          <ShieldCheck size={23} />
        </div>
        <div
          className="evidence-modes"
          role="group"
          aria-label="Impact analysis mode"
        >
          <button
            className="secondary-button"
            aria-pressed={mode === "active"}
            onClick={() => choose("active")}
          >
            Use active dashboard data
          </button>
          <button
            className="secondary-button"
            aria-pressed={mode === "archive"}
            disabled={archiveBusy}
            onClick={() => void chooseArchive()}
          >
            Explore Archived Edirne Example
          </button>
          <button
            className="secondary-button"
            aria-pressed={mode === "comparison"}
            disabled={!comparison}
            onClick={() => choose("comparison")}
          >
            Use loaded three-year comparison
          </button>
        </div>
        <p className="evidence-archive-status" role="status">
          {archiveBusy
            ? "Validating the local archived evidence. No live weather request."
            : archive
              ? "Archive verified: 1,096 original daily records. Ready offline in this open page; no Open-Meteo request needed."
              : "Preparing a deferred local archive asset. Offline availability begins once verification finishes; first access still needs the local application assets."}
        </p>
        {archiveError && (
          <div className="data-error" role="alert">
            <p>{archiveError}</p>
            <p>
              The active analysis remains available. No invented archive or
              synthetic fallback replaces the missing evidence.
            </p>
            <button onClick={() => void chooseArchive()}>
              Retry archived evidence
            </button>
          </div>
        )}
        <p className="evidence-help">
          The archived mode uses its own adjustable reference scenario. It never
          changes dashboard location or inputs. A three-year result from the
          Historical Variability Lab becomes available here only after all years
          validate.
        </p>
        {archive && (
          <button className="evidence-text-button" onClick={downloadOriginal}>
            <ArrowDownToLine size={13} />
            Download original archived snapshot
          </button>
        )}
      </div>

      <JudgeWalkthrough archive={archive} />

      {source && evaluation && view && brief ? (
        <>
          <div className="panel evidence-context" data-testid="impact-context">
            <span className="dataset-kicker">
              DISPLAYED IMPACT ANALYSIS · {source.mode.toUpperCase()}
            </span>
            <h3>{source.identity}</h3>
            <p className="evidence-classification">{source.classification}</p>
            <p>
              {source.period} ·{" "}
              {source.datasets.map((d) => d.rainfallMm.length).join(" / ")}{" "}
              daily values
            </p>
            <div className="sizing-assumptions">
              <span>
                <strong>{n(roofAreaM2)} m²</strong> roof
              </span>
              <span>
                <strong>{n(collectionEfficiency * 100)}%</strong> efficiency
              </span>
              <span>
                <strong>{n(dailyDemandL)} L/day</strong> demand
              </span>
              <span>
                <strong>{n(currentCapacityL)} L</strong> current tank
              </span>
              <span>
                <strong>0 L</strong> starting water in EVERY period
              </span>
            </div>
            <p className="evidence-empty-note">
              Every impact comparison starts empty. Dashboard initial storage (
              {n(scenario.initialStorageL)} L) is unchanged and excluded. Unused
              water remaining in a tank is never counted as already displaced
              freshwater.
            </p>
            {source.datasets.some((d) => d.kind === "reanalysis") && (
              <p className="evidence-attribution">
                Weather data by{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo
                </a>{" "}
                · ERA5 / Copernicus ·{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
                .{" "}
                {mode === "archive"
                  ? "Archived capture, 23 October 2026; not a new live request."
                  : "Historical reanalysis, not station measurements."}
              </p>
            )}
            {mode === "archive" ? (
              <fieldset className="archive-inputs">
                <legend>
                  Archived example inputs · separate from your dashboard
                </legend>
                {(
                  [
                    {
                      key: "roofAreaM2",
                      label: "Archive roof area (m²)",
                      value: archivedInputs.roofAreaM2,
                      max: 2000,
                      step: 0.25,
                    },
                    {
                      key: "collectionEfficiency",
                      label: "Archive collection efficiency (0–1)",
                      value: archivedInputs.collectionEfficiency,
                      max: 1,
                      step: 0.01,
                    },
                    {
                      key: "dailyDemandL",
                      label: "Archive daily demand (L/day)",
                      value: archivedInputs.dailyDemandL,
                      max: 3000,
                      step: 0.5,
                    },
                    {
                      key: "currentCapacityL",
                      label: "Archive current tank (L)",
                      value: archivedInputs.currentCapacityL,
                      max: 20000,
                      step: 0.5,
                    },
                  ] as const
                ).map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={field.max}
                      step={field.step}
                      value={field.value}
                      onChange={(event) => {
                        const value = event.target.valueAsNumber;
                        if (
                          Number.isFinite(value) &&
                          value >= 0 &&
                          value <= field.max
                        )
                          setArchivedInputs((s) => ({
                            ...s,
                            [field.key]: value,
                          }));
                      }}
                    />
                  </label>
                ))}
                <button
                  className="secondary-button"
                  onClick={() =>
                    setArchivedInputs({ ...DEFAULT_ARCHIVED_INPUTS })
                  }
                >
                  Reset archived reference inputs
                </button>
              </fieldset>
            ) : (
              <a className="evidence-input-link" href="#simulator">
                Edit dashboard scenario inputs <ArrowUpRight size={12} />
              </a>
            )}
            <details className="impact-provenance">
              <summary>Inspect impact source & original provenance</summary>
              <EvidenceSourceRecords source={source} />
            </details>
          </div>

          <div className="evidence-decision panel">
            <div>
              <span className="dataset-kicker">
                ACTIONABLE MODEL COMPARISON
              </span>
              <h3>
                {view.periods.length === 3
                  ? "Three-year comparison capacity"
                  : "Recommended tested capacity"}
              </h3>
              <p
                className="evidence-capacity"
                data-testid="impact-recommendation"
              >
                {view.decision.capacityL === null
                  ? "No meaningful recommendation"
                  : `${n(view.decision.capacityL)} L`}
              </p>
              <p>
                {view.decision.reason ??
                  `Smallest positive standard capacity meeting ${target}% of each period's maximum tested supply. This target is a yield heuristic, not ${target}% demand coverage, a proven optimum or a design guarantee.`}
              </p>
            </div>
            <div className="evidence-controls">
              <label>
                <span>Impact supply target</span>
                <select
                  value={target}
                  onChange={(event) =>
                    setTarget(Number(event.target.value) as SizingTarget)
                  }
                >
                  {SIZING_TARGETS.map((v) => (
                    <option key={v} value={v}>
                      {v}% of tested maximum supply
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Alternative standard tank</span>
                <select
                  value={alternative}
                  onChange={(event) =>
                    setAlternative(Number(event.target.value))
                  }
                >
                  {STANDARD_CAPACITIES_L.map((v) => (
                    <option key={v} value={v}>
                      {n(v)} L{v === 0 ? " · no harvesting" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Baseline, current, recommended and selected cases share the same
                rainfall, demand and empty start. Current-only sizes never alter
                the recommendation pool.
              </p>
            </div>
          </div>

          <div className="impact-annual-cards">
            {view.periods.map((p) => (
              <article
                className="panel impact-annual-card"
                key={p.key}
                data-testid={`impact-period-${p.dataset.year ?? "synthetic"}`}
              >
                <div className="impact-card-heading">
                  <h3>{p.key}</h3>
                  <span>ESTIMATED RESULT</span>
                </div>
                <p>
                  {source.identity} · {p.selected.days} days · selected{" "}
                  {n(alternative)} L tank
                </p>
                <span className="impact-card-label">
                  Potential freshwater displacement
                </span>
                <strong className="impact-delivered">
                  {n(p.selected.potentialFreshwaterDisplacementL)}{" "}
                  <span>L</span>
                </strong>
                <p className="impact-volume">
                  {n(p.selected.potentialFreshwaterDisplacementM3)} m³ ·
                  conditional freshwater substitution
                </p>
                <dl>
                  <dt>Demand coverage</dt>
                  <dd>{coverage(p.selected.coverage)}</dd>
                  <dt>Remaining freshwater requirement</dt>
                  <dd>{n(p.selected.unmetL)} L</dd>
                  <dt>No-harvesting delivery</dt>
                  <dd>0 L</dd>
                  <dt>No-harvesting remaining demand</dt>
                  <dd>{n(p.baseline.unmetL)} L</dd>
                </dl>
                <p className="impact-card-caveat">
                  Only delivered water that replaces existing freshwater use. No
                  measured site savings.
                </p>
              </article>
            ))}
          </div>
          {view.periods.length > 1 && (
            <div
              className="panel impact-total"
              data-testid="impact-three-year-total"
            >
              <span className="dataset-kicker">
                2023–2025 · SUM OF THREE INDEPENDENT ANNUAL ESTIMATES
              </span>
              <h3>
                {n(view.totals.deliveredL)} L{" "}
                <span>
                  ({n(view.totals.potentialFreshwaterDisplacementM3)} m³)
                </span>
              </h3>
              <p>
                Potential freshwater displacement for the selected{" "}
                {n(alternative)} L tank at {source.identity}, conditional on
                substitution. This is a three-year total, not an annual figure.
                Each year starts at 0 L; no storage crosses year boundaries.
                Total demand {n(view.totals.demandL)} L; remaining demand{" "}
                {n(view.totals.unmetL)} L.
              </p>
            </div>
          )}
          <p className="impact-conditional">{IMPACT_CAVEAT}</p>

          <div className="panel evidence-chart-panel">
            <h3>What a tested capacity changes</h3>
            <p>
              MODELED WATER DELIVERED (L) · {source.identity} · {source.period}
            </p>
            <div className="impact-chart-legend">
              <span>No harvesting</span>
              <span>Current tank</span>
              <span>Recommended tested</span>
              <span>Selected alternative</span>
            </div>
            <div
              className="impact-evidence-chart"
              role="img"
              aria-label="Modeled delivered liters by period for no harvesting, current, recommended and selected tank. Equivalent values are in the impact comparison table."
            >
              <Suspense fallback={<p>Loading impact chart…</p>}>
                <ImpactEvidenceChart view={view} />
              </Suspense>
            </div>
            <p>
              Zero-height baseline bars mean 0 L delivered, not missing data.
              All essential values and differences are tabulated below.
            </p>
          </div>

          <div className="panel evidence-comparisons">
            <h3>Capacity impact comparison</h3>
            <p>
              Full-period modeled volumes. Remaining freshwater requirement
              equals unmet demand, if another freshwater source meets it.
              Shortage days have any positive unmet volume; streaks reset
              between years.
            </p>
            <div
              className="evidence-table-scroll"
              role="region"
              aria-label="Impact capacity comparison"
              tabIndex={0}
            >
              <table>
                <caption>
                  {source.identity} · {source.period} · all cases start with 0 L
                </caption>
                <thead>
                  <tr>
                    {[
                      "Period / case",
                      "Tank (L)",
                      "Delivered (L)",
                      "Potential displacement (m³)",
                      "Demand (L)",
                      "Coverage (%)",
                      "Unmet (L)",
                      "Tank overflow (L)",
                      "Unused end storage (L)",
                      "Full-demand days",
                      "Shortage days",
                      "Longest shortage streak (days)",
                    ].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.periods.flatMap((p) =>
                    [
                      { label: "No harvesting", m: p.baseline },
                      { label: "Current", m: p.current },
                      { label: "Recommended tested", m: p.recommended },
                      { label: "Selected alternative", m: p.selected },
                    ].map(({ label, m }) => (
                      <tr
                        key={`${p.key}-${label}`}
                        data-testid={`impact-row-${p.dataset.year ?? "synthetic"}-${label.replaceAll(" ", "-")}`}
                      >
                        <th scope="row">
                          {p.key} / {label}
                        </th>
                        {m ? (
                          [
                            n(m.capacityL),
                            n(m.deliveredL),
                            n(m.potentialFreshwaterDisplacementM3),
                            n(m.demandL),
                            m.coverage === null
                              ? "Undefined"
                              : n(m.coverage * 100),
                            n(m.unmetL),
                            n(m.overflowL),
                            n(m.unusedStorageL),
                            String(m.fullDemandDays),
                            String(m.shortageDays),
                            String(m.longestShortageStreak),
                          ].map((v, i) => <td key={i}>{v}</td>)
                        ) : (
                          <td colSpan={11}>
                            No meaningful relative-yield recommendation
                          </td>
                        )}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <div className="impact-differences">
              {view.periods.map((p) => (
                <article key={p.key}>
                  <h4>{p.key} · signed incremental changes</h4>
                  {[
                    {
                      name: "Selected minus no harvesting",
                      d: p.baselineToSelected,
                    },
                    { name: "Selected minus current", d: p.currentToSelected },
                    {
                      name: "Recommended minus current",
                      d: p.currentToRecommended,
                    },
                  ].map(({ name, d }) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      {d ? (
                        <p>
                          Additional modeled water delivered:{" "}
                          {signed(d.additionalDeliveredL)} L · reduction in
                          modeled unmet demand: {signed(d.unmetReductionL)} L ·
                          demand coverage:{" "}
                          {d.coverageChangePp === null
                            ? "undefined"
                            : `${signed(d.coverageChangePp)} percentage points`}{" "}
                          · tank overflow change: {signed(d.overflowChangeL)} L.
                        </p>
                      ) : (
                        <p>No meaningful recommendation available.</p>
                      )}
                    </div>
                  ))}
                </article>
              ))}
            </div>
            <p>
              Tank overflow change is a modeled tank-balance difference, not
              verified stormwater runoff or flood-risk reduction. Unused ending
              water has not yet displaced freshwater.
            </p>
          </div>

          <div className="panel evidence-actions">
            <div>
              <h3>A result you can inspect, share and reproduce</h3>
              <p>
                Copy or print the selected analysis with its source, units,
                assumptions and caveats. Original daily/sizing/historical
                exports remain available in their labs.
              </p>
            </div>
            <div className="evidence-action-buttons">
              <button className="secondary-button" onClick={() => void copy()}>
                <Copy size={14} />
                Copy Key Findings
              </button>
              <button
                className="secondary-button"
                onClick={() => window.print()}
              >
                <Printer size={14} />
                Print / Save Evidence Brief
              </button>
            </div>
            <p role="status">{copyStatus}</p>
            <details>
              <summary>
                <FileText size={13} />
                Read the copyable findings
              </summary>
              <pre>{brief.keyFindings}</pre>
            </details>
            <details className="evidence-print-preview">
              <summary>
                <Check size={13} />
                Preview the printable evidence brief
              </summary>
              <EvidenceBrief data={brief} />
            </details>
          </div>
        </>
      ) : (
        <div className="panel evidence-context" role="status">
          No validated evidence is available for this mode. Choose active
          dashboard data or load a complete historical comparison. No result is
          invented.
        </div>
      )}

      <details className="panel impact-methodology">
        <summary>Impact assumptions, scientific context & limits</summary>
        <p>{IMPACT_CAVEAT}</p>
        <p>{IMPACT_LIMITS}</p>
        <p>
          Comparisons reuse the original zero-capacity and positive-capacity
          simulations, starting empty for each period. Delivered liters / 1000
          gives m³. Storage still in the tank is excluded. Coverage changes are
          percentage points; reductions in unmet demand are signed
          baseline/current minus the compared value. Daily shortages are not
          meteorological droughts. Raw source rainfall and calculation precision
          are preserved; display values are rounded.
        </p>
        <p>
          Background:{" "}
          <a
            href="https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure"
            target="_blank"
            rel="noreferrer"
          >
            EPA environmental benefits of green infrastructure
          </a>{" "}
          and{" "}
          <a
            href="https://www.epa.gov/green-infrastructure/prepare-drought"
            target="_blank"
            rel="noreferrer"
          >
            EPA drought preparation
          </a>{" "}
          describe rain capture and non-potable reuse. These general sources do
          not independently verify CisternLab's calculated site outcomes. See{" "}
          <a
            href="https://open-meteo.com/en/docs/historical-weather-api"
            target="_blank"
            rel="noreferrer"
          >
            Open-Meteo historical documentation
          </a>{" "}
          and{" "}
          <a
            href="https://open-meteo.com/en/licence"
            target="_blank"
            rel="noreferrer"
          >
            licence
          </a>
          . Existing scientific references remain in the Tank Sizing and
          Historical Variability labs.
        </p>
      </details>
      {brief &&
        createPortal(
          <div className="impact-print-root">
            <EvidenceBrief data={brief} />
          </div>,
          document.body,
        )}
    </section>
  );
}
