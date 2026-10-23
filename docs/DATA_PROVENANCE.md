# Data provenance and reproducibility

## Source classifications

**DEMO DATA — SYNTHETIC** consists of three fixed 30-day sequences in `src/data/demo.ts`: mixed rainfall, dry spell and heavy bursts. They are authored illustrations without dates, real sites, randomness or historical/live status. They are not climate probabilities and are never extrapolated to an annual benefit.

**HISTORICAL REANALYSIS — ERA5** uses [Open-Meteo's historical API](https://open-meteo.com/en/docs/historical-weather-api). ERA5 is gridded modeled reanalysis combining modeling and observations, not station or rooftop rainfall. Selected city coordinates can differ from the returned ERA5 grid; both remain visible and exported.

**ARCHIVED HISTORICAL REANALYSIS — ERA5** is the preserved Edirne download described below. It requires no fresh weather request. Saved result tables are ignored when recalculating from the original rainfall.

## Exact live requests and validation

[Geocoding](https://open-meteo.com/en/docs/geocoding-api) searches the named city; users explicitly select a stable location ID. The archive query is restricted to `models=era5`, `daily=rain_sum`, `precipitation_unit=mm`, a complete January–December year, `timezone=auto` and `timeformat=iso8601`. `rain_sum` is rain in millimeters; `precipitation_sum`, which includes frozen precipitation, is not substituted.

```text
https://geocoding-api.open-meteo.com/v1/search
  ?name=<city>&count=6&language=en&format=json

https://archive-api.open-meteo.com/v1/archive
  ?latitude=<selected>&longitude=<selected>
  &start_date=YYYY-01-01&end_date=YYYY-12-31
  &daily=rain_sum&models=era5&precipitation_unit=mm
  &timezone=auto&timeformat=iso8601
```

Supported complete years are 2023, 2024 and 2025. Validation requires all 365/366 ordered dates, one finite nonnegative rain value per date, exact units, coordinates, timezone and complete provenance. Missing/null/duplicate/reordered/partial records are rejected, never zero-filled or interpolated. A failed download preserves the labeled active dataset.

Daily sums follow Open-Meteo's returned timezone and fixed UTC offset resolved at retrieval. Historical DST transitions are not reconstructed. Date-only strings are preserved without machine-local date parsing. Retrieval timestamps, source URLs, timezone/abbreviation/offset, requested and returned coordinates, model/variable, dates and validation status remain in UI and exports. A future request can return revised data or a different resolved offset; its URL alone is not an immutable snapshot.

Queries require three trimmed characters and a 350 ms pause. Requests time out after 15 seconds and recover only by explicit user action. The session cache holds up to 12 validated coordinate/year datasets; three-year loading reuses the active year and uses at most two concurrent missing-year requests. Input/capacity/target edits calculate locally without downloading weather again.

Requests go directly to Open-Meteo with credentials omitted and no referrer. The provider receives the search query or requested coordinates/year and can observe the network connection under its [terms/privacy policy](https://open-meteo.com/en/terms). CisternLab adds no tracker or account storage.

## Preserved Edirne archive

- Original download: [edirne-era5-2023-2025.snapshot.json](data/edirne-era5-2023-2025.snapshot.json).
- Identical browser asset: [`src/assets/archived-edirne.snapshot.json`](../src/assets/archived-edirne.snapshot.json).
- SHA-256 for both: `2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`.
- Location: Edirne, Republic of Türkiye, GeoNames ID **747712**; requested coordinates **41.67719, 26.55597**; returned ERA5 grid **41.75, 26.5**.
- Original retrieval: **23 October 2026**. Per-year UTC timestamps and complete requests are preserved in the JSON.
- Calendar: **2023: 365**, **2024: 366**, **2025: 365** daily records; **1,096** values including February 29, 2024.
- Returned daily timezone: **Europe/Istanbul / GMT+3**, fixed offset **10,800 seconds**.

The original file has been relocated for documentation organization without changing any bytes. Its original rainfall, complete source records and original snapshot schema remain intact. The browser verifies its exact SHA-256 before parsing, then applies the same calendar/provenance validation as live data. Unit tests compare both files and reproduce the reference results directly from the arrays. These files are excluded from automatic formatting to preserve their digest.

Verify in PowerShell:

```powershell
Get-FileHash docs/data/edirne-era5-2023-2025.snapshot.json -Algorithm SHA256
Get-FileHash src/assets/archived-edirne.snapshot.json -Algorithm SHA256
npm test
```

## Reproduce an analysis

In the app, select a synthetic sequence, load a validated historical year, or choose **Explore Archived Edirne Example**. Record the physical inputs, selected capacity/target and actual period. Export daily CSV, sizing CSV, historical comparison CSV/reproducibility JSON, or the original archived snapshot as appropriate. Keep raw rain and provenance with derived results. CSV cells preserve full numeric precision and protect formula-leading text; undefined percentages are empty CSV cells or JSON `null`.

To reproduce archived impact programmatically, use the existing pure functions with a parsed copy of the original JSON:

```ts
import { validateArchivedSnapshot } from "./src/data/archivedEvidence";
import {
  buildImpactView,
  comparisonImpactSource,
  currentImpactMetrics,
  evaluateImpactEvidence,
} from "./src/engine/impactEvidence";

const comparison = validateArchivedSnapshot(snapshot);
const evaluation = evaluateImpactEvidence(
  comparisonImpactSource(comparison, true),
  {
    roofAreaM2: 120,
    collectionEfficiency: 0.8,
    dailyDemandL: 250,
    currentCapacityL: 2000,
  },
);
const view = buildImpactView(
  evaluation,
  currentImpactMetrics(evaluation),
  90,
  3000,
);
```

For original-byte validation first, call `readArchivedBytes(new Uint8Array(bytes))` and use its `.comparison`. For a downloaded historical comparison JSON, validate `.datasets` with `validateHistoricalComparison`; feed its three sequences into `evaluateVariability`, then `decideVariability` and `currentAnnualResults`. For an individual period use `simulate` in `src/engine/simulation.ts`. Exact examples are exercised by the retained unit tests. All comparisons start empty independently; the dashboard's own initial-storage setting is separate.

The reference inputs above produce **114,591.6 L** total delivery with 2,000 L and **120,687.2 L** with 3,000 L across the three independent years. The difference is **6,095.6 L**. These are calculated conditional estimates for assumed inputs, not measured savings at a property.

Archived data works on the open page after required assets validate, including when the browser goes offline. First-ever offline access, offline reload and persistent caching are not supported. Live service behavior and revised source data are external dependencies.

## Credits and permissions

Weather data by [Open-Meteo](https://open-meteo.com/) using [ERA5 / Copernicus C3S](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels); location data by [GeoNames](https://www.geonames.org/). Open-Meteo API data is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) under its [licensing information](https://open-meteo.com/en/licence). Preserve attribution, license links and notice of transformation. Original rain is retained; CisternLab derives estimated tank volumes and capacity comparisons without provider endorsement. Public free API use is non-commercial under the service terms. Code licensing does not grant commercial access to that service. See [third-party notices](../THIRD_PARTY_NOTICES.md).
