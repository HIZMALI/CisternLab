import { lazy, Suspense, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  FlaskConical,
  Info,
  Layers3,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import {
  capacityChanges,
  comparisonCandidates,
  currentTankCandidate,
  evaluateTankSizes,
  recommendCapacity,
  SIZING_TARGETS,
  STANDARD_CAPACITIES_L,
} from "../engine/tankSizing";
import type { SizingTarget, TankSizingEvaluation } from "../engine/tankSizing";
import { tankSizingToCsv } from "../engine/tankSizingCsv";
import type { RainfallDataset } from "../data/rainfall";
import { locationLabel } from "../data/rainfall";
import type { SimulationInput } from "../engine/simulation";
import { ERA5_SOURCE } from "../data/openMeteo";

const SizingChart = lazy(() => import("./SizingChart"));
const format = (value: number, decimals = 1) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: decimals }).format(
    value,
  );
const percent = (value: number | null) =>
  value === null ? "—" : `${format(value * 100)}%`;
const signed = (value: number, unit: string) =>
  `${value < 0 ? "−" : value > 0 ? "+" : ""}${format(Math.abs(value), 2)} ${unit}`;

export default function TankSizingLab({
  dataset,
  scenario,
}: {
  dataset: RainfallDataset;
  scenario: Omit<SimulationInput, "rainfallMm">;
}) {
  const [target, setTarget] = useState<SizingTarget>(90);
  const [downloaded, setDownloaded] = useState<{
    data: RainfallDataset;
    evaluation: TankSizingEvaluation;
    capacity: number;
    target: SizingTarget;
  } | null>(null);
  const {
    roofAreaM2,
    collectionEfficiency,
    dailyDemandL,
    tankCapacityL,
    initialStorageL,
  } = scenario;
  const evaluation = useMemo(
    () =>
      evaluateTankSizes({
        roofAreaM2,
        collectionEfficiency,
        dailyDemandL,
        rainfallMm: dataset.rainfallMm,
      }),
    [roofAreaM2, collectionEfficiency, dailyDemandL, dataset.rainfallMm],
  );
  const current = useMemo(
    () => currentTankCandidate(evaluation, tankCapacityL),
    [evaluation, tankCapacityL],
  );
  const candidates = useMemo(
    () => comparisonCandidates(evaluation, current),
    [evaluation, current],
  );
  const decision = useMemo(
    () => recommendCapacity(evaluation, target),
    [evaluation, target],
  );
  const recommendation = decision.recommended;
  const changes = recommendation
    ? capacityChanges(current, recommendation)
    : null;
  const days = dataset.rainfallMm.length;
  const period = `${days}-day ${dataset.kind === "synthetic" ? "synthetic" : "historical reanalysis"} scenario`;
  const alreadyRecommended = recommendation?.capacityL === current.capacityL;
  const exported =
    downloaded?.data === dataset &&
    downloaded.evaluation === evaluation &&
    downloaded.capacity === tankCapacityL &&
    downloaded.target === target;
  function download() {
    const csv = tankSizingToCsv(dataset, evaluation, tankCapacityL, target);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `cisternlab-tank-sizing-${dataset.kind === "synthetic" ? dataset.id : `era5-${dataset.location.id}-${dataset.year}`}-${target}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded({
      data: dataset,
      evaluation,
      capacity: tankCapacityL,
      target,
    });
  }

  return (
    <section
      id="tank-sizing"
      className="sizing-lab"
      aria-labelledby="sizing-title"
    >
      <div className="section-heading sizing-section-heading">
        <div>
          <div className="eyebrow">SAME RAIN. DIFFERENT POSSIBILITIES.</div>
          <h2 id="sizing-title">Tank Sizing & Decision Lab</h2>
          <p>Explore what a little more storage actually delivers.</p>
        </div>
        <button className="secondary-button" onClick={download}>
          {exported ? <Check size={15} /> : <ArrowDownToLine size={15} />}{" "}
          {exported ? "Sizing CSV downloaded" : "Export sizing CSV"}
        </button>
      </div>
      <div
        className="sizing-analysis panel"
        aria-label="Tank sizing analysis summary"
      >
        <div className="sizing-period">
          <span className="sizing-section-icon">
            <Layers3 size={20} />
          </span>
          <div>
            <span className="dataset-kicker">ACTIVE COMPARISON PERIOD</span>
            <h3 data-testid="sizing-period">{period}</h3>
            <p data-testid="sizing-source">
              {dataset.name}
              {dataset.kind === "reanalysis"
                ? ` · ${dataset.startDate} to ${dataset.endDate}`
                : " · simulated days 1–30"}
            </p>
          </div>
          <span className="estimate-label">ESTIMATED RESULT</span>
        </div>
        <div className="sizing-assumptions">
          <span>
            <strong>{format(roofAreaM2, 2)} m²</strong> roof
          </span>
          <span>
            <strong>{format(collectionEfficiency * 100, 2)}%</strong> efficiency
          </span>
          <span>
            <strong>{format(dailyDemandL, 2)} L/day</strong> demand
          </span>
          <span>
            <strong>0 L</strong> starting water in every tank
          </span>
          <a href="#simulator">
            Edit scenario inputs <ArrowUpRight size={12} />
          </a>
        </div>
        <p className="sizing-classification">
          {dataset.kind === "synthetic" ? (
            <FlaskConical size={13} />
          ) : (
            <ShieldCheck size={13} />
          )}{" "}
          {dataset.classification}{" "}
          <span>· Same daily rainfall and demand for every capacity.</span>
        </p>
        {dataset.kind === "reanalysis" && (
          <p className="sizing-attribution">
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
            . Gridded reanalysis, not station measurements.{" "}
            {locationLabel(dataset.location)} · {dataset.year} ·{" "}
            {dataset.timezone}. Full provenance remains in the active source
            panel and sizing CSV.
          </p>
        )}
      </div>
      <div
        className={
          initialStorageL > 0
            ? "sizing-start-note has-initial-water"
            : "sizing-start-note"
        }
        role="note"
      >
        <Info size={15} />
        <p>
          {initialStorageL > 0
            ? "Tank sizing comparisons assume all tanks start empty. Results may differ from the current simulation when its initial storage is not zero."
            : "Every comparison starts empty. Your dashboard scenario stays unchanged."}{" "}
          {dataset.kind === "reanalysis" &&
            "The first day of the selected year starts at 0 L; there is no carryover from the preceding calendar year."}
        </p>
      </div>

      <div className="sizing-decision-grid">
        <div
          className="sizing-recommendation"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="sizing-card-kicker">
            <Ruler size={17} /> Recommended tested capacity
          </div>
          {recommendation ? (
            <>
              <p
                className="sizing-recommended-number"
                data-testid="sizing-recommendation"
              >
                {format(recommendation.capacityL, 2)} <span>L</span>
              </p>
              <p className="sizing-recommendation-copy">
                The smallest standard candidate delivering at least {target}% of
                the maximum supply among tested standard tanks.
              </p>
              <div className="sizing-recommended-stats">
                <div>
                  <span>MODELED SUPPLY</span>
                  <strong data-testid="sizing-recommended-supply">
                    {format(recommendation.supplyL, 2)} L
                  </strong>
                </div>
                <div>
                  <span>DEMAND COVERAGE</span>
                  <strong>{percent(recommendation.demandCoverage)}</strong>
                </div>
              </div>
              <div className="sizing-achieved">
                <Check size={13} />
                {format((decision.achievedFraction ?? 0) * 100, 2)}% of the
                maximum tested supply achieved
              </div>
            </>
          ) : (
            <div className="sizing-no-benefit">
              <p data-testid="sizing-no-benefit">
                No meaningful tank-size recommendation is available under the
                current scenario.
              </p>
              <p>{decision.noBenefitReason}</p>
              <span>
                0 L remains a no-storage baseline, not a purchase
                recommendation.
              </span>
            </div>
          )}
        </div>
        <div className="sizing-target-card panel">
          <fieldset className="yield-target">
            <legend>Target of maximum tested supply</legend>
            <div>
              {SIZING_TARGETS.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="sizing-target"
                    value={value}
                    checked={target === value}
                    onChange={() => setTarget(value)}
                  />
                  <span>{value}%</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sizing-target-values">
            <div>
              <span>Maximum tested supply</span>
              <strong data-testid="sizing-maximum">
                {format(decision.maximumStandardSupplyL, 2)} L
              </strong>
            </div>
            <div>
              <span>{target}% target supply</span>
              <strong data-testid="sizing-target-supply">
                {format(decision.targetSupplyL, 2)} L
              </strong>
            </div>
          </div>
          <p>
            <strong>A transparent choice, not a universal optimum.</strong> The
            default 90% is our adjustable decision heuristic. “Maximum” refers
            only to the tested standard capacities for this period, not a proven
            global physical maximum.
          </p>
        </div>
      </div>

      <section
        className="sizing-chart-panel panel"
        aria-labelledby="sizing-chart-title"
      >
        <div className="sizing-chart-heading">
          <div>
            <h3 id="sizing-chart-title">
              What does more storage make possible?
            </h3>
            <p>Modeled liters supplied over this {days}-day period.</p>
          </div>
          <div className="sizing-chart-legend">
            <span>
              <i className="sizing-current-dot" />
              Current capacity
            </span>
            {recommendation && (
              <span>
                <i className="sizing-recommended-dot" />
                Recommended tested capacity
              </span>
            )}
          </div>
        </div>
        <span className="sizing-chart-unit">MODELED SUPPLY (L)</span>
        <div
          className="sizing-chart"
          role="img"
          aria-label="Tank capacity versus modeled rainwater supply. Every tested point, including current and recommended capacities, is available in the comparison table below."
        >
          <Suspense
            fallback={
              <div className="chart-loading" role="status">
                Loading capacity chart…
              </div>
            }
          >
            <SizingChart
              candidates={candidates}
              current={current}
              recommended={recommendation}
              targetSupplyL={decision.targetSupplyL}
            />
          </Suspense>
        </div>
        <div className="sizing-chart-note">
          <span>
            {recommendation
              ? `Dashed line: ${target}% target (${format(decision.targetSupplyL, 2)} L)`
              : "No positive supply target is available."}
          </span>
          <span>
            Lines connect evaluated capacities; they do not evaluate untested
            sizes.
          </span>
        </div>
      </section>

      <section
        className="sizing-table-panel panel"
        aria-labelledby="sizing-table-title"
      >
        <div className="daily-heading">
          <div>
            <h3 id="sizing-table-title">Every candidate, side by side</h3>
            <p>
              Standard capacities drive the decision. Your current capacity is
              always included.
            </p>
          </div>
          <span className="table-period">
            {candidates.length} CANDIDATES · {days} DAYS
          </span>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable tank capacity comparison"
        >
          <table className="sizing-table">
            <caption className="sr-only">
              Tank capacity comparison for {period}. All tanks start empty.
              Volumes in liters; coverage and daily reliability are different
              percentages. Incremental values compare adjacent standard
              candidates, excluding any extra current-only capacity.
            </caption>
            <thead>
              <tr>
                <th scope="col">Capacity (L)</th>
                <th scope="col">Supply (L)</th>
                <th scope="col">Coverage</th>
                <th scope="col">Overflow (L)</th>
                <th scope="col">Unmet (L)</th>
                <th scope="col">Stored (L)</th>
                <th scope="col">Full-demand days</th>
                <th scope="col">Δ Supply (L)</th>
                <th scope="col">L per 1,000 L added storage</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  key={candidate.capacityL}
                  data-testid={`sizing-row-${candidate.capacityL}`}
                  className={
                    candidate.capacityL === recommendation?.capacityL
                      ? "recommended-row"
                      : ""
                  }
                >
                  <th scope="row">
                    <strong>{format(candidate.capacityL, 2)}</strong>
                    <span className="candidate-badges">
                      {candidate.capacityL === 0 && <span>NO STORAGE</span>}
                      {candidate.capacityL === current.capacityL && (
                        <span className="current-badge">CURRENT</span>
                      )}
                      {candidate.capacityL === recommendation?.capacityL && (
                        <span className="recommended-badge">RECOMMENDED</span>
                      )}
                      {!candidate.isStandard && <span>CURRENT ONLY</span>}
                    </span>
                  </th>
                  <td data-column="supply">{format(candidate.supplyL, 2)}</td>
                  <td>{percent(candidate.demandCoverage)}</td>
                  <td>{format(candidate.overflowL, 2)}</td>
                  <td>{format(candidate.unmetDemandL, 2)}</td>
                  <td>{format(candidate.finalStorageL, 2)}</td>
                  <td>
                    {candidate.dailyReliability === null ? (
                      "— (no demand)"
                    ) : (
                      <>
                        {candidate.fullySuppliedDays} /{" "}
                        {candidate.simulationDays}
                        <span className="cell-detail">
                          {percent(candidate.dailyReliability)} daily
                          reliability
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {candidate.marginal ? (
                      <>
                        {format(candidate.marginal.additionalSupplyL, 2)}
                        <span className="cell-detail">
                          vs {format(candidate.marginal.fromCapacityL, 2)} L
                        </span>
                      </>
                    ) : candidate.isStandard ? (
                      "— (baseline)"
                    ) : (
                      "— (current only)"
                    )}
                  </td>
                  <td>
                    {candidate.marginal
                      ? format(candidate.marginal.incrementalYieldPer1000L, 2)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sizing-table-explanation">
          <p>
            <strong>Coverage:</strong> water used ÷ total demand.{" "}
            <strong>Daily reliability:</strong> fully supplied days ÷ days
            evaluated. Neither percentage is defined for zero demand.
          </p>
          <p>
            <strong>Marginal yield:</strong> additional modeled liters delivered
            per 1,000 L of extra storage over this period. Standard neighbors
            only; improvements need not decrease at every step. This is not a
            financial return.
          </p>
        </div>
      </section>

      <section
        className="sizing-comparison panel"
        aria-labelledby="sizing-comparison-title"
      >
        <div className="daily-heading">
          <div>
            <h3 id="sizing-comparison-title">
              Your current tank, on equal terms
            </h3>
            <p>
              Both columns use the same empty-start comparison, regardless of
              dashboard initial water.
            </p>
          </div>
        </div>
        {recommendation && changes ? (
          <>
            <p
              className="sizing-comparison-message"
              data-testid="sizing-current-message"
            >
              {alreadyRecommended
                ? "Your current capacity is already the recommended standard candidate."
                : `${format(current.capacityL, 2)} L current capacity compared with the ${format(recommendation.capacityL, 2)} L recommended tested capacity.`}
            </p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Current versus recommended tank comparison"
            >
              <table className="sizing-difference-table">
                <caption className="sr-only">
                  Empty-start current versus recommended comparison. Change is
                  recommended minus current; negative values are preserved.
                  Coverage changes are percentage points.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">Current · empty start</th>
                    <th scope="col">Recommended · empty start</th>
                    <th scope="col">Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Capacity</th>
                    <td>{format(current.capacityL, 2)} L</td>
                    <td>{format(recommendation.capacityL, 2)} L</td>
                    <td>{signed(changes.capacityL, "L")}</td>
                  </tr>
                  <tr>
                    <th scope="row">Modeled supply</th>
                    <td>{format(current.supplyL, 2)} L</td>
                    <td>{format(recommendation.supplyL, 2)} L</td>
                    <td data-testid="sizing-supply-change">
                      {signed(changes.supplyL, "L")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Demand coverage</th>
                    <td>{percent(current.demandCoverage)}</td>
                    <td>{percent(recommendation.demandCoverage)}</td>
                    <td>
                      {changes.demandCoverage === null
                        ? "—"
                        : signed(changes.demandCoverage * 100, "pp")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Overflow</th>
                    <td>{format(current.overflowL, 2)} L</td>
                    <td>{format(recommendation.overflowL, 2)} L</td>
                    <td>{signed(changes.overflowL, "L")}</td>
                  </tr>
                  <tr>
                    <th scope="row">Unmet demand</th>
                    <td>{format(current.unmetDemandL, 2)} L</td>
                    <td>{format(recommendation.unmetDemandL, 2)} L</td>
                    <td>{signed(changes.unmetDemandL, "L")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="sizing-comparison-footnote">
              Change = recommended − current. A smaller capacity can deliver
              less water; negative differences are shown as calculated. “pp”
              means percentage points.
            </p>
          </>
        ) : (
          <p className="sizing-comparison-message">
            No recommended candidate is available to compare. Current capacity{" "}
            {format(current.capacityL, 2)} L delivers{" "}
            {format(current.supplyL, 2)} L under the same empty-start
            assumptions; see all candidates above.
          </p>
        )}
      </section>

      <details className="sizing-methodology panel">
        <summary>Methodology, candidate set & limitations</summary>
        <div>
          <h3>A repeatable comparison, an explainable rule</h3>
          <p>
            For each standard capacity, we run the unchanged daily
            rain-before-demand simulation with the active rainfall series,{" "}
            {format(roofAreaM2, 2)} m² roof,{" "}
            {format(collectionEfficiency * 100, 2)}% collection efficiency,{" "}
            {format(dailyDemandL, 2)} L daily demand, and 0 L starting storage.
            No new water-balance equations are introduced.
          </p>
          <p>
            <strong>Standard candidates:</strong>{" "}
            {STANDARD_CAPACITIES_L.map((capacity) => format(capacity)).join(
              ", ",
            )}{" "}
            L. They are analysis candidates, not verified products or
            installation recommendations. A non-standard current capacity is
            evaluated separately and cannot change the standard maximum, target,
            recommendation, or marginal comparisons.
          </p>
          <p>
            <strong>Decision:</strong> target supply = {target}% × maximum
            modeled supply among tested standard capacities. Select the smallest
            positive standard capacity meeting that target, using a relative
            tolerance of 10⁻¹⁰ × maximum tested supply. Ascending capacity
            resolves equal-yield ties. If every standard candidate delivers
            zero, no tank is recommended.
          </p>
          <p>
            <strong>Period:</strong> {period}.{" "}
            {dataset.kind === "synthetic"
              ? "These 30 authored days are not extrapolated to an annual result."
              : `ERA5 reanalysis for ${dataset.year}, ${dataset.startDate} to ${dataset.endDate}. January 1 starts empty with no previous-year carryover. The data is modeled, not measured at this roof.`}
          </p>
          <p>
            <strong>Limits:</strong> this is model-based decision support, not
            certified engineering design, a drought-proof design, or a long-term
            climate guarantee. Daily timing, fixed demand, collection-loss
            assumptions, water-quality exclusions, and all existing
            environmental disclaimers remain. Conditional freshwater
            substitution is not measured savings. No financial returns, carbon
            estimates, purchasing, or installation design are calculated.
          </p>
          <h3>Scientific background</h3>
          <p>
            These sources provide background on rainwater storage and daily
            water-balance comparison. They do not establish our default 90%
            heuristic as a universally optimal rule.
          </p>
          <ul>
            <li>
              <a
                href="https://www.energy.gov/cmei/femp/rainwater-harvesting-systems-technology-review"
                target="_blank"
                rel="noreferrer"
              >
                U.S. Department of Energy — Rainwater Harvesting Systems
                Technology Review
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1016/j.resconrec.2013.05.006"
                target="_blank"
                rel="noreferrer"
              >
                Imteaz, Ahsan & Shanableh (2013) — Reliability analysis using a
                daily water balance model
              </a>
            </li>
            <li>
              <a
                href="https://doi.org/10.1016/j.resconrec.2012.11.004"
                target="_blank"
                rel="noreferrer"
              >
                Santos & Taveira-Pinto (2013) — Analysis of different
                tank-sizing criteria using detailed methods
              </a>
            </li>
          </ul>
        </div>
      </details>
      <div className="sr-only" role="status">
        {exported
          ? "Tank sizing CSV downloaded with active rainfall provenance and empty-start comparison results."
          : ""}
      </div>
    </section>
  );
}
