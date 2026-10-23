import type { EvidenceSource } from "../engine/impactEvidence";
import { ARCHIVE_ORIGINAL_PATH } from "../data/archivedEvidence";

export default function EvidenceSourceRecords({
  source,
}: {
  source: EvidenceSource;
}) {
  return (
    <div className="evidence-source-records">
      <p>
        <strong>{source.classification}</strong> · {source.identity} ·{" "}
        {source.period}
      </p>
      {source.mode === "archive" && (
        <p>
          Preserved during BUILD 04 · retrieval date: 23 October 2026 · no new
          live request. Original file: {ARCHIVE_ORIGINAL_PATH}. Browser delivery
          is a byte-for-byte copy; original calculated result tables are
          ignored.
        </p>
      )}
      {source.datasets.map((d, i) => (
        <div key={i} className="evidence-source-record">
          <h4>
            {d.kind === "reanalysis"
              ? `${d.year} · ${d.dates.length} complete daily records`
              : `${d.rainfallMm.length}-day authored synthetic sequence`}
          </h4>
          {d.kind === "reanalysis" ? (
            <dl>
              <dt>Source</dt>
              <dd>
                {d.provider} · {d.model} · {d.variable} · {d.units} ·{" "}
                {d.validationStatus}
              </dd>
              <dt>Coverage</dt>
              <dd>
                {d.startDate} to {d.endDate}
              </dd>
              <dt>Location identity</dt>
              <dd>
                {d.name} · ID {d.location.id}
              </dd>
              <dt>Requested coordinates</dt>
              <dd>
                {d.requestedCoordinates.latitude},{" "}
                {d.requestedCoordinates.longitude}
              </dd>
              <dt>Returned ERA5 grid</dt>
              <dd>
                {d.returnedCoordinates.latitude},{" "}
                {d.returnedCoordinates.longitude}
              </dd>
              <dt>Daily aggregation</dt>
              <dd>
                {d.timezone} / {d.timezoneAbbreviation}, fixed UTC offset{" "}
                {d.utcOffsetSeconds} s
              </dd>
              <dt>Original retrieval</dt>
              <dd>{d.retrievedAt}</dd>
              <dt>Source request</dt>
              <dd>
                <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                  {d.sourceUrl}
                </a>
              </dd>
            </dl>
          ) : (
            <p>
              {d.provider}. No historical dates, real location or measured
              weather is implied.
            </p>
          )}
        </div>
      ))}
      {source.archiveSha256 && (
        <p className="evidence-digest">
          Original and browser-copy SHA-256: <code>{source.archiveSha256}</code>
        </p>
      )}
      {source.datasets.some((d) => d.kind === "reanalysis") && (
        <p>
          Weather data by{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          · ERA5 /{" "}
          <a
            href="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels"
            target="_blank"
            rel="noreferrer"
          >
            Copernicus C3S
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>{" "}
          · Locations:{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
          . Original rain is preserved; CisternLab transforms it into modeled
          estimates. No provider endorsement or station-measured rainfall is
          claimed.
        </p>
      )}
    </div>
  );
}
