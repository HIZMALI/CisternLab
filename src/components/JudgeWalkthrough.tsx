import { useMemo, useRef, useState } from "react";
import type { ArchivedEvidence } from "../data/archivedEvidence";
import {
  buildImpactView,
  comparisonImpactSource,
  currentImpactMetrics,
  evaluateImpactEvidence,
  IMPACT_CAVEAT,
} from "../engine/impactEvidence";

const STAGES = ["THE PROBLEM", "THE DATA", "THE DECISION", "THE IMPACT"];
const n = (v: number) =>
  v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
export default function JudgeWalkthrough({
  archive,
}: {
  archive: ArchivedEvidence | null;
}) {
  const [open, setOpen] = useState(false),
    [stage, setStage] = useState(0);
  const launch = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  // The guided example has separate fixed reference inputs; stages never enter this memo.
  const reference = useMemo(() => {
    if (!archive) return null;
    const e = evaluateImpactEvidence(
      comparisonImpactSource(archive.comparison, true),
      {
        roofAreaM2: 120,
        collectionEfficiency: 0.8,
        dailyDemandL: 250,
        currentCapacityL: 2000,
      },
    );
    const current = currentImpactMetrics(e);
    return { e, view: buildImpactView(e, current, 90, 3000) };
  }, [archive]);
  function change(next: number) {
    setStage(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className="judge-walkthrough panel">
      <div className="evidence-action-heading">
        <div>
          <span className="dataset-kicker">A FOUR-STEP DEMO</span>
          <h3>Explore the Evidence</h3>
          <p>
            A separate archived reference walkthrough. Your selected analysis
            stays intact.
          </p>
        </div>
        <button
          className="secondary-button"
          ref={launch}
          disabled={!reference}
          onClick={() => {
            setOpen(true);
            change(0);
          }}
        >
          Start evidence walkthrough
        </button>
      </div>
      {open && reference && (
        <div className="walkthrough-content">
          <ol
            className="walkthrough-steps"
            aria-label="Evidence walkthrough stages"
          >
            {STAGES.map((s, i) => (
              <li key={s} aria-current={i === stage ? "step" : undefined}>
                {i + 1}. {s}
              </li>
            ))}
          </ol>
          <h4 ref={heading} tabIndex={-1}>
            {stage + 1}. {STAGES[stage]}
          </h4>
          {stage === 0 && (
            <>
              <p>
                Annual rainfall alone cannot tell a school, home or small
                facility how much water a tank can deliver. A burst can overflow
                storage while demand on later dry days remains unmet.
              </p>
              <p>
                CisternLab compares rainfall timing, storage and non-potable
                demand before a user considers a physical system. The
                environmental opportunity is conditional substitution of
                existing freshwater use.
              </p>
            </>
          )}
          {stage === 1 && (
            <>
              <p>
                <strong>ARCHIVED HISTORICAL REANALYSIS — ERA5</strong> · Edirne,
                Türkiye · Open-Meteo · rain_sum in mm · captured 23 October 2026
                during BUILD 04, not a new live request or station measurements.
              </p>
              <ul>
                {archive!.comparison.years.map((d) => (
                  <li key={d.year}>
                    {d.year}: {d.dates.length} original daily dates,{" "}
                    {d.startDate} through {d.endDate}; requested{" "}
                    {d.requestedCoordinates.latitude},{" "}
                    {d.requestedCoordinates.longitude}; returned grid{" "}
                    {d.returnedCoordinates.latitude},{" "}
                    {d.returnedCoordinates.longitude}.
                  </li>
                ))}
              </ul>
              <p>
                All 1,096 original values pass the existing validator and
                recorded SHA-256. Weather data by{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo
                </a>{" "}
                / ERA5 / Copernicus ·{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
                .
              </p>
            </>
          )}
          {stage === 2 && (
            <>
              <p>
                Reference assumptions: 120 m² roof, 80% collection efficiency,
                250 L/day demand, 2,000 L current tank and 0 L each January 1.
                At the 90% tested-yield target, the three-year comparison
                capacity is{" "}
                <strong>
                  {reference.view.decision.capacityL === null
                    ? "undefined"
                    : `${n(reference.view.decision.capacityL)} L`}
                </strong>
                .
              </p>
              <div
                className="evidence-table-scroll"
                role="region"
                aria-label="Walkthrough annual decision results"
                tabIndex={0}
              >
                <table>
                  <caption>
                    Independently computed annual supplied volumes (L)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">No harvesting</th>
                      <th scope="col">Current 2,000 L</th>
                      <th scope="col">Three-year recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reference.view.periods.map((p) => (
                      <tr key={p.key}>
                        <th scope="row">{p.key}</th>
                        <td>{n(p.baseline.deliveredL)} L</td>
                        <td>{n(p.current.deliveredL)} L</td>
                        <td>
                          {p.recommended
                            ? `${n(p.recommended.deliveredL)} L`
                            : "No meaningful recommendation"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                The smallest positive standard tank must meet the selected
                fraction of each year's maximum tested supply. This historical
                heuristic is not a proven optimum or engineering guarantee.
              </p>
            </>
          )}
          {stage === 3 && (
            <>
              <p>
                For the reference selected{" "}
                <strong>{n(reference.view.selectedCapacityL)} L</strong> tank,
                the{" "}
                <strong>
                  sum of three independent annual modeled deliveries
                </strong>{" "}
                is{" "}
                <strong>
                  {n(reference.view.totals.deliveredL)} L (
                  {n(reference.view.totals.potentialFreshwaterDisplacementM3)}{" "}
                  m³)
                </strong>{" "}
                across 2023–2025. This is a three-year total, not one year's
                savings.
              </p>
              <p>{IMPACT_CAVEAT}</p>
              <p>
                Inspect the source records, download the original archive, copy
                findings or print the evidence brief in the studio. Each records
                the scenario and limitations. No physical site savings, carbon
                benefit, flood-risk outcome or long-term climate reliability is
                established.
              </p>
            </>
          )}
          <div className="walkthrough-controls">
            <button
              className="secondary-button"
              disabled={stage === 0}
              onClick={() => change(stage - 1)}
            >
              Back
            </button>
            <span role="status">Stage {stage + 1} of 4</span>
            <button
              className="secondary-button"
              disabled={stage === 3}
              onClick={() => change(stage + 1)}
            >
              Next
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setOpen(false);
                requestAnimationFrame(() => launch.current?.focus());
              }}
            >
              Exit walkthrough
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
