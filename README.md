# CisternLab · BUILD 02

**Every drop has a second life.** A local, transparent rooftop rainwater harvesting simulator for Green Shift Hacks 2026. Explore illustrative home, school, and small-facility scenarios using synthetic rainfall or a complete year of historical ERA5 reanalysis. Adjust inputs and inspect every simulated liter. BUILD 02 extends the verified BUILD 01 application and preserves its pure engine and original design.

Choose **DEMO DATA — SYNTHETIC** (offline-ready authored examples) or **HISTORICAL REANALYSIS — ERA5** (modeled climate data from Open-Meteo). All simulation outputs remain **ESTIMATED RESULTS**, not measured savings or site observations. No backend, account, API key, paid API, database, tracker, or deployment is involved. Fonts are bundled locally. BUILD 03 is not started.

## Run locally

Use Node.js **24 LTS** (validated with 24.13.1) and npm. From `D:\Projects\CisternLab`:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 4317 --strictPort
```

Open `http://127.0.0.1:4317`. Port 4317 avoids this machine's Windows reserved range containing 5173. Another available port can be supplied explicitly.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts and stops a local **production preview** on port 4173 automatically. Build first. It tests Chromium at 1440, 768, 390, and 320 pixels in both modes; checks keyboard behavior, WCAG A/AA rules with axe, exports, inputs and networking; and writes full-page evidence into `docs/screenshots/`. Historical requests are intercepted with explicitly synthetic transport fixtures, so the test suite never depends on API uptime. `npx playwright show-report` opens the generated, ignored HTML report. `npm run preview -- --host 127.0.0.1 --port 4317` serves the production build manually.

Optional real-service browser verification, separate from deterministic tests:

```powershell
npm run build
npm run verify:live
```

This starts an owned local production preview on port 4318, searches Edirne, Türkiye, explicitly selects the matching result, loads 2025 ERA5 rain, validates it through the actual app, and records observed response metadata/CORS and screenshots in `docs/verification/live-open-meteo.json` and `docs/screenshots/build-02-live-edirne-*.png`. Dated JSON attempt records retain both successes and failures. It contacts the public APIs and may fail when they are unavailable. It does not assert a hardcoded historical rainfall total. The saved JSON distinguishes a passed live check from failure; deterministic mocks are never reported as live verification.

## Interface

- Responsive overview and original roof–gutter–tank SVG schematic.
- Editable roof area, tank capacity, non-potable daily demand, collection efficiency, and initial storage, with numerical and keyboard-operable range controls.
- Illustrative starting presets for homes, schools, and small facilities; none represents a real property.
- Three fixed 30-day synthetic rainfall patterns: mixed rainfall, dry spell, and heavy bursts. Change patterns without changing the other inputs.
- A source selector and explicit location → year → load flow for historical ERA5 rain. Complete 2023, 2024, and 2025 calendar years are supported; 2025 is the default and incomplete 2026 is disabled.
- Immediate deterministic results; tank-storage and daily-balance Recharts views; demand coverage; overflow; conservation summary; and a complete accessible daily table.
- CSV download with input values, units, synthetic provenance, model assumptions, and unrounded daily records.
- Historical CSV exports also contain full ISO daily dates, original rainfall, model/provider, location and requested/returned coordinates, year/range, timezone/offset, retrieval timestamp, reproducible URL, validation status, attribution/license links, and the conditional impact disclaimer. Synthetic exports retain the original 30-row daily format and column order.
- UI bounds: roof 0–2,000 m², tank 0–20,000 L, demand 0–3,000 L/day, efficiency 0–100%, storage 0–capacity. The engine supports finite nonnegative volumes beyond UI bounds when derived calculations remain representable. Invalid input drafts keep the last valid simulation and display an associated error. Reducing capacity clamps initial storage, visibly, to the new capacity.

## Deterministic model and equations

The pure engine is in `src/engine/simulation.ts`. It has no clock, random source, network, browser state, or hidden default. Identical inputs produce identical results. Inputs are validated before calculation, are never mutated, and results keep JavaScript floating-point precision. Display rounding does not feed the engine.

For each day `t`, define roof catchment `A` (m²), rainfall `P[t]` (mm), efficiency `e` (0–1), capacity `C` (L), fixed daily demand `D` (L), and opening storage `S[t-1]` (L). The given initial storage is `S[0]`.

```text
Incoming I[t]     = A × P[t] × e
Available V[t]    = S[t-1] + I[t]
Overflow O[t]     = max(0, V[t] − C)
Retained R[t]     = min(C, V[t])
Used U[t]         = min(D, R[t])
End storage S[t]  = R[t] − U[t]
Unmet M[t]        = D − U[t]
```

**Rain before demand:** all of a day's incoming water is added first, overflow occurs next, then that day's demand is served. Demand earlier in the day cannot make room for later rainfall. This is a daily approximation and makes no claim to sub-daily precision. Linear chart segments connect daily endpoints for readability; they do not represent within-day water levels.

One millimeter of rainfall over one square meter equals one liter before collection losses. Overflow exits the modeled tank and is not reused. Demand shortfall is reported as water needed from another source; no automatic tank refill occurs.

Conservation is enforced for each day and for the full period:

```text
Opening storage + incoming = overflow + used + end storage
Daily demand = used + unmet demand
Initial storage + Σ incoming = Σ overflow + Σ used + final storage
0 ≤ storage ≤ capacity
```

The assertion tolerance is `1e-10 × max(1, |left|, |right|)` liters to accommodate IEEE-754 arithmetic. Non-finite inputs, negative numbers, efficiencies over 1, initial storage over capacity, empty/sparse/invalid rainfall arrays, and numeric overflow are rejected.

Reference check: `A=100`, `P=[10]`, `e=0.80`, `C=500`, `D=200`, initial storage `0` produces incoming **800 L**, overflow **300 L**, used **200 L**, remaining **300 L**, and unmet demand **0 L**.

## Synthetic data and assumptions

`src/data/demo.ts` contains the actual authored sequences, each exactly 30 days. The sequences have no dates, locations, weather-station identity, or historical/live/forecast status. They illustrate storage behavior under differently timed rain events and do not represent climate probabilities. The default mixed sequence totals **150 mm**. No randomness or external data is used.

Roof area is horizontal projected catchment area. A single fixed efficiency represents collection losses. These losses occur before tank inflow; mass-balance assertions cover water entering the tank plus initial storage. Roof-water losses are not an additional tank outflow. There is no separate first-flush, evaporation, leakage, drainage, pump, treatment, or infiltration model. Demand is constant each day. Initial storage is assumed to be previously harvested rainwater. Each historical analysis covers one complete selected year; no multiyear extrapolation or comparison is made.

## Historical data: exact source and interpretation

The independent typed adapter in `src/data/openMeteo.ts` uses the non-commercial public [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api) and [historical weather API](https://open-meteo.com/en/docs/historical-weather-api):

```text
https://geocoding-api.open-meteo.com/v1/search
  ?name=<city>&count=6&language=en&format=json

https://archive-api.open-meteo.com/v1/archive
  ?latitude=<selected>&longitude=<selected>
  &start_date=YYYY-01-01&end_date=YYYY-12-31
  &daily=rain_sum&models=era5&precipitation_unit=mm
  &timezone=auto&timeformat=iso8601
```

**ERA5 only:** no blended best-match dataset. **`rain_sum` only:** daily rain in millimeters; `precipitation_sum` includes frozen precipitation and is never substituted. ERA5 is gridded reanalysis combining modeling and observations, not rainfall measured at a station or the selected roof. Open-Meteo documents ERA5 at 0.25° resolution; returned grid coordinates can differ from the selected city. Both are preserved visibly and in exports. No API key is requested, stored, or sent.

Daily sums aggregate hourly values according to Open-Meteo's returned timezone and **fixed UTC offset resolved at request time**. Per its documentation, DST transitions inside the requested period are ignored for ISO daily boundaries. CisternLab preserves each date-only string without machine-local date parsing, records the returned timezone, abbreviation, and offset, and does not reconstruct DST-aware or sub-daily boundaries. Two downloads at different times may be revised or use a different resolved offset; the timestamp, source URL, and metadata are necessary context.

### Loading, validation, and network behavior

1. Synthetic mode starts immediately and makes no external requests. Selecting the historical form alone does not download rainfall.
2. Search requires at least 3 trimmed characters and a 350 ms pause. At most six matches are shown with city, region, country, coordinates, timezone when available, and a stable ID. A result must be selected explicitly; namesakes are never selected automatically.
3. Choose one allowed complete year and press **Load rainfall data**. This makes one archive request for that coordinate/year, not daily requests. Roof, tank, efficiency, demand, and storage edits recalculate locally with the same rainfall.
4. The adapter checks response structure, coordinate ranges, timezone/offset, millimeter units, date format and requested year, all 365/366 dates in exact chronological order, and one finite nonnegative rainfall value per date. Missing, null, duplicated, reordered, partial, or unexpected data is rejected. It never zero-fills, interpolates, or annualizes a partial dataset.
5. Only a complete validated result replaces the active dataset. Pending edits and errors leave the previous active results visibly labeled. Returning to synthetic data requires an explicit source action. Changing source/year/location or resetting cancels obsolete work; revision guards also ignore transports that deliver late responses.
6. HTTP 429/500, connection errors, malformed JSON, and a 15-second timeout show useful errors with manual retry. There are no continuous retries. Up to 12 validated coordinate/year datasets are cached in memory for the current page session; a reload clears them. Cache hits preserve the original retrieval timestamp. Search and error responses are not cached.

Requests go directly from the browser to Open-Meteo with credentials omitted and no referrer. Searches disclose the query to the geocoding service; downloads disclose city coordinates and year to the archive service. The providers can observe the network connection/IP under their [terms and privacy policy](https://open-meteo.com/en/terms). CisternLab adds no analytics or persistence. Historical loading needs internet access; synthetic examples remain usable if the network is unavailable.

The active dataset summary exposes classification, provider/model, selected city, both coordinate pairs, selected year/range, timezone metadata, variable/units, retrieval timestamp, source URL, and validation status. Synthetic metadata explicitly marks location, year, timezone, and retrieval time as not applicable. Annual charts use month labels, no point markers, and thin daily lines rather than hundreds of grouped bars. All daily dates remain inspectable in the table and CSV; chart connections do not imply within-day behavior.

### Attribution and licensing

Weather data by [Open-Meteo](https://open-meteo.com/), using [ERA5 / Copernicus Climate Change Service (C3S)](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels). Location search is based on [GeoNames](https://www.geonames.org/). Open-Meteo offers its API data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with [attribution requirements](https://open-meteo.com/en/licence): retain appropriate credit, a license link, and notice of transformations when sharing data or derived results; do not suggest provider endorsement. The UI and historical CSV include attribution and explain that original rainfall is preserved while CisternLab derives estimated tank volumes. The public free endpoints are for non-commercial use under the [service terms](https://open-meteo.com/en/terms); a commercial use case needs a separate service/licensing review.

Zero tank capacity spills all incoming water. Zero demand stores water up to capacity, serves zero liters, and shows demand coverage as **undefined (—)** rather than 100%. Dry days can use prior storage. Zero roof area and zero efficiency are valid. Zero demand days count as fully supplied, but the UI replaces that count with “No demand configured.”

## Estimated versus measured impact

Potential freshwater displacement equals `Σ used` liters, or `Σ used / 1000` m³, **only under the explicit assumption that every delivered liter substitutes for one liter of freshwater demand**. This includes any initial storage, assumed to be rainwater. Demand coverage is `Σ used / (D × number of days)` when total demand is positive. Unmet demand is `Σ unmet`.

These quantities describe a modeled scenario. They are not measured savings, proof of freshwater demand reduction, avoided runoff at a site, or verified environmental benefits. No carbon emissions, financial savings, site performance, or drinking-water safety claims are made.

## Architecture and verification

React, strict TypeScript, Vite, Tailwind CSS, Lucide, and Recharts. No additional dependencies were needed for BUILD 02. Vitest preserves all original engine tests and adds adapter, cancellation, cache, schema, leap-year, failure, export, and historical-fixture conservation tests. Playwright preserves original smoke checks and adds intercepted historical workflows and accessibility scans in both modes. See `BUILD_01_REPORT.md` for the baseline and `BUILD_02_REPORT.md` for current verification and screenshots.

`src/engine/simulation.ts` is unchanged from BUILD 01 and independent of React. `src/data/` separates authored demos, typed dataset metadata, and the API adapter/client. `RainfallSource` owns pending selections and loading; `App` keeps the active validated dataset and scenario. Only the rainfall series enters the existing engine. No provenance, timestamp, networking, or source selection affects the mathematical model.

## Current limitations

- A daily rain-before-demand approximation can overstate overflow or understate usable water relative to a finer time-step model.
- Synthetic periods are 30 days; historical analyses are one complete allowed calendar year, with fixed daily demand. No rainfall editor, optimization, multiyear comparison, saved scenarios, or scenario database.
- No physical design, structural suitability, water quality, filtration, first flush, pump electricity, costs, or carbon factors.
- Rounded table and balance values can show tiny apparent discrepancies; calculations and CSV retain full precision.
- Browser automation covers Chromium, with visual review at the four requested sizes. Other browsers and assistive technology require further human testing; automated axe checks do not establish full accessibility conformance.
- Reanalysis is modeled, spatially averaged rain and can be inaccurate for an individual roof. API completeness validation is not an accuracy certificate. No station-measured or independently verified real-site savings are available.
- Historical availability, CORS policy, rate limits, source revisions, and API format can change. The explicit ERA5 request and provenance aid reproducibility but cannot pin a future response to a particular upstream revision.
- Dependency installation and historical requests need network access; synthetic mode does not make external requests. This is not a PWA and does not promise a first-ever load without a local server.

## Reproduce an analysis

Run locally, select Historical Reanalysis, search and explicitly select the desired city, select 2023/2024/2025, and press Load rainfall data. Inspect the active period/provenance, set all five scenario controls, and download CSV. Keep that file with its retrieval timestamp and source URL; roof/tank inputs and original daily rainfall are sufficient to reproduce the same deterministic simulation without fetching again. Identical rainfall and scenario inputs yield identical outputs. API responses themselves may change, so a future download of the same URL is not a pinned snapshot.

BUILD 02 stops at historical integration and verification. No deployment, optimization, financial/CO₂ estimates, multiyear comparison, or BUILD 03 work is included.
