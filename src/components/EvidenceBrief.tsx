import type { evidenceBriefData } from "../engine/impactEvidence";
import EvidenceSourceRecords from "./EvidenceSourceRecords";

const n = (v: number) =>
  v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
export default function EvidenceBrief({
  data,
}: {
  data: ReturnType<typeof evidenceBriefData>;
}) {
  return (
    <article
      className="evidence-brief"
      aria-label="Printable impact evidence brief"
    >
      <header>
        <p>CISTERNLAB · GREEN SHIFT HACKS 2026</p>
        <h1>{data.title}</h1>
        <p>
          <strong>ESTIMATED RESULT · {data.source.classification}</strong>
        </p>
        <p>
          {data.source.identity} · {data.source.period}
        </p>
      </header>
      <section>
        <h2>Scenario & decision</h2>
        <p>
          Mode: {data.source.mode}. Roof {n(data.inputs.roofAreaM2)} m² ·
          efficiency {n(data.inputs.collectionEfficiency * 100)}% · non-potable
          demand {n(data.inputs.dailyDemandL)} L/day · current tank{" "}
          {n(data.inputs.currentCapacityL)} L. Starting storage:{" "}
          <strong>0 L independently in each period</strong>. Years are never
          concatenated.
        </p>
        <p>
          Selected alternative: {n(data.analysis.selectedCapacityL)} L.
          Recommended tested capacity:{" "}
          {data.analysis.decision.capacityL === null
            ? `none — ${data.analysis.decision.reason}`
            : `${n(data.analysis.decision.capacityL)} L`}
          . Target: {data.analysis.decision.target}% of each period's maximum
          standard tested supply.
        </p>
      </section>
      <section>
        <h2>Modeled resource benefit</h2>
        <p className="brief-warning">{data.conditionalWarning}</p>
        <p>
          Unused tank storage is not already displaced freshwater. Remaining
          freshwater requirement means modeled unmet demand, assuming it is met
          by another freshwater source.
        </p>
        {data.analysis.periods.map((p) => (
          <section key={p.key} className="brief-period">
            <h3>
              {p.key} · {p.selected.days} days
            </h3>
            <table>
              <caption>
                Identical rain, roof, demand and zero starting water; volumes in
                L
              </caption>
              <thead>
                <tr>
                  {[
                    "Case / tank L",
                    "Delivered L",
                    "Coverage %",
                    "Unmet L",
                    "Overflow L",
                    "Unused end L",
                  ].map((s) => (
                    <th scope="col" key={s}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "No harvesting", m: p.baseline },
                  { label: "Current", m: p.current },
                  { label: "Recommended tested", m: p.recommended },
                  { label: "Selected alternative", m: p.selected },
                ].map(({ label, m }) => (
                  <tr key={label}>
                    <th scope="row">
                      {label} / {m ? n(m.capacityL) : "—"}
                    </th>
                    {m ? (
                      [
                        n(m.deliveredL),
                        m.coverage === null ? "Undefined" : n(m.coverage * 100),
                        n(m.unmetL),
                        n(m.overflowL),
                        n(m.unusedStorageL),
                      ].map((v, i) => <td key={i}>{v}</td>)
                    ) : (
                      <td colSpan={5}>
                        No meaningful relative-yield recommendation
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Selected potential freshwater displacement:{" "}
              <strong>
                {n(p.selected.potentialFreshwaterDisplacementL)} L (
                {n(p.selected.potentialFreshwaterDisplacementM3)} m³)
              </strong>
              , conditional. Full-demand days: {p.selected.fullDemandDays};
              shortage days: {p.selected.shortageDays}; longest shortage streak:{" "}
              {p.selected.longestShortageStreak} days.
            </p>
            <p>
              Selected minus current delivered:{" "}
              {n(p.currentToSelected.additionalDeliveredL)} L; reduction in
              unmet demand: {n(p.currentToSelected.unmetReductionL)} L; coverage
              change:{" "}
              {p.currentToSelected.coverageChangePp === null
                ? "undefined"
                : `${n(p.currentToSelected.coverageChangePp)} percentage points`}
              .{" "}
              {p.currentToRecommended &&
                `Recommended minus current delivered: ${n(p.currentToRecommended.additionalDeliveredL)} L; reduction in unmet demand: ${n(p.currentToRecommended.unmetReductionL)} L; coverage change: ${p.currentToRecommended.coverageChangePp === null ? "undefined" : `${n(p.currentToRecommended.coverageChangePp)} percentage points`}.`}
            </p>
            <p>
              Selected minus no-harvesting modeled tank overflow:{" "}
              {n(p.baselineToSelected.overflowChangeL)} L. This is not verified
              drainage runoff or flood-risk reduction.
            </p>
          </section>
        ))}
        {data.analysis.periods.length > 1 && (
          <p>
            <strong>
              Three-year SUM of independent annual selected-tank estimates:
            </strong>{" "}
            {n(data.analysis.totals.deliveredL)} L (
            {n(data.analysis.totals.potentialFreshwaterDisplacementM3)} m³)
            delivered; total demand {n(data.analysis.totals.demandL)} L;
            remaining demand {n(data.analysis.totals.unmetL)} L. Longest
            within-year shortage streak:{" "}
            {data.analysis.totals.longestWithinYearShortageStreak} days. Annual
            differences reflect rainfall timing as well as totals; this is
            historical sensitivity, not a continuous multiyear tank or a climate
            trend.
          </p>
        )}
      </section>
      <section className="brief-methodology">
        <h2>Methodology & limitations</h2>
        <p>{data.decisionMethod}</p>
        <p>
          Coverage is used / demand; undefined with zero demand. Shortage means
          any positive daily unmet volume; streaks reset at annual boundaries
          and are not meteorological droughts. Signed coverage differences are
          percentage points. Display values are rounded; source data and engine
          calculations retain full precision.
        </p>
        <p>{data.limitations}</p>
      </section>
      <section>
        <h2>Evidence & reproduction</h2>
        <p>
          Reproduce with the recorded original daily rainfall, physical inputs,
          selected capacity, target and empty starts, using the unchanged
          simulation, sizing and variability engines. Retain the original JSON
          or existing CSV/JSON downloads alongside this brief. See
          docs/DATA_PROVENANCE.md for the reproduction procedure.
        </p>
        <EvidenceSourceRecords source={data.source} />
      </section>
      <footer>
        <p>
          General background: EPA Environmental Benefits of Green
          Infrastructure; EPA Prepare for Drought; Open-Meteo Historical Weather
          API and licence. These sources support harvesting/modeling context,
          not independent verification of CisternLab outputs.
        </p>
        <p>
          https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure
          <br />
          https://www.epa.gov/green-infrastructure/prepare-drought
          <br />
          https://open-meteo.com/en/docs/historical-weather-api
          <br />
          https://open-meteo.com/en/licence
        </p>
      </footer>
    </article>
  );
}
