# CisternLab — BUILD 02 report

**Status:** Complete, verified, and committed on `main`. 23 October 2026, Europe/Istanbul.

**Baseline:** `d8b9c47` (verified BUILD 01). **Verified BUILD 02 source commit:** `964af80bc9409d445ea4b568796041c6064db3e0`.

The source commit includes the app, README, tests, screenshots, and live-service records. This report follows in a documentation-only commit. Its own commit can be identified with `git log -1 --format=%H -- BUILD_02_REPORT.md`.

## Implemented functionality

- Preserved the original visual identity, roof/gutter/tank SVG, responsive layout, home/school/facility presets, all three authored synthetic patterns, chart modes, keyboard behavior, and CSV downloads.
- Added **Synthetic Demo** and **Historical Reanalysis** source selection. The active dataset remains clearly identified independently of pending search/year selections.
- Worldwide city search requires three characters and a 350 ms debounce, requests at most six matches, and requires explicit result selection. City, region, country, coordinates, timezone when available, and location ID distinguish namesakes.
- Complete historical years **2023, 2024, 2025**, with **2025 default** and **2026 disabled**. One explicit archive request loads a whole coordinate/year; changing physical scenario inputs never downloads weather again.
- Independent typed API adapter validates structure, coordinates, units, timezone/offset, exact requested year, all ordered daily dates, leap-year length, one value per day, and finite nonnegative rain. Missing/null/duplicated/reordered/partial data is rejected without zero-filling, interpolation, or partial annual simulation.
- Abort controllers plus revision guards handle obsolete searches/downloads. Source, year, location, and reset actions cancel pending work. HTTP 429/500, malformed JSON, network errors, no matches, and 15-second timeouts have explicit states and manual retry. Failures preserve the prior valid active dataset.
- In-memory cache holds up to 12 validated coordinate/year responses for the page session, retaining original retrieval timestamps. No database or persistent cache.
- Source summary and inspectable provenance include classification, provider/model, location, requested and returned coordinates, year/range, timezone metadata, variable/units, retrieval timestamp, reproducible URL, and validation status. Synthetic fields that do not apply are labeled accordingly.
- Historical charts retain daily resolution with month-axis labels, thin lines, and no hundreds-of-bars clutter. Full dates remain available in the complete daily table and CSV. Lines do not claim sub-daily tank precision.
- Historical CSV adds all source metadata, original rainfall, full ISO dates, daily simulation outputs, attribution/license links, initial-storage assumptions, and estimated-versus-measured disclaimers. Synthetic column order and 30-row daily behavior remain intact.
- Added visible Open-Meteo, ERA5/Copernicus, GeoNames, and CC BY 4.0 attribution. All results remain **ESTIMATED RESULT**; modeled supply is conditional potential freshwater substitution, not measured savings.
- No new dependencies. Package version is 0.2.0. No authentication, backend, API keys, database, tracker, paid API, deployment, optimization, financial/CO₂ estimate, multiyear comparison, or BUILD 03 work.

## Exact source and model

Geocoding: `https://geocoding-api.open-meteo.com/v1/search`, with `name`, `count=6`, `language=en`, and `format=json`.

Historical archive: `https://archive-api.open-meteo.com/v1/archive`, with selected city coordinates and:

```text
start_date=YYYY-01-01
end_date=YYYY-12-31
daily=rain_sum
models=era5
precipitation_unit=mm
timezone=auto
timeformat=iso8601
```

This is a single explicit **ERA5** model request. There is no best-match blending and no substitution of `precipitation_sum`. Metadata/export classification is **HISTORICAL REANALYSIS — ERA5 MODEL**; the visible compact label is **HISTORICAL REANALYSIS — ERA5**. Synthetic data is labeled **DEMO DATA — SYNTHETIC**.

The implementation follows the official [historical weather documentation](https://open-meteo.com/en/docs/historical-weather-api), [geocoding documentation](https://open-meteo.com/en/docs/geocoding-api), [non-commercial terms](https://open-meteo.com/en/terms), and [attribution requirements](https://open-meteo.com/en/licence). ERA5 is gridded modeled reanalysis, not station-measured rainfall or verified roof observations. Daily dates use the returned fixed UTC offset; the API does not reconstruct DST changes inside the ISO daily period. Date-only strings are preserved without machine-timezone date parsing. README and provenance explain these limits.

## BUILD 01 preservation and mathematical behavior

Git comparison against `d8b9c47` confirms **no changes** to `src/engine/simulation.ts`, `src/engine/simulation.test.ts`, `src/data/demo.ts`, or the original CSV unit test. The adapter supplies only a validated rainfall array to the existing engine. Rain-before-demand ordering, efficiency, tank overflow, storage carryover, unmet demand, and daily/period conservation assertions remain unchanged.

All original 30 unit tests and nine browser smoke tests are retained. The only modification to the original browser test file redirects screenshot output to BUILD 02 filenames, preserving BUILD 01 screenshot evidence.

The original synthetic default remains exactly **7,250 L used**, **5,650 L overflow**, and **1,500 L ending storage**. The required one-day reference still produces 800 L incoming, 300 L overflow, 200 L used, 300 L remaining, and zero unmet demand.

## Final quality gates

| Command                | Final result                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `npm run typecheck`    | PASS — strict application, adapter, test, and configuration types                   |
| `npm run lint`         | PASS — zero allowed warnings; includes optional verification script                 |
| `npm test`             | PASS — **89 tests**, 3 files; includes all original 30                              |
| `npm run build`        | PASS — production build, no bundle-size warning                                     |
| `npm run format:check` | PASS                                                                                |
| `npm run test:e2e`     | PASS — **24 Chromium tests**, approximately 1.5 minutes; includes all original nine |
| `git diff --check`     | PASS                                                                                |
| `npm run verify:live`  | PASS on final manual live run; separate from deterministic gates                    |

Added unit coverage includes query parameters, duplicate-name/empty geocoding, invalid schemas and coordinates, correct ERA5/rain_sum URLs, complete 365/366-day calendars, missing/null/negative/non-finite rainfall, missing/duplicate/reordered/wrong-year dates, wrong units, invalid timezone metadata, HTTP 429/500, connection failure, malformed JSON, timeout, cancellation/revision guards, cache integrity, stable recalculation, CSV provenance, and daily/annual conservation with transport fixtures.

Added browser coverage uses intercepted responses for city selection, source/year/location switching, manual loading, caching, no refetch on scenario edits, leap-day display, failure preservation and retry, HTTP/network/JSON errors, search threshold/debounce/empty/retry states, obsolete searches, resetting during a download, timed-out downloads, superseded years, historical CSV, and historical layout/accessibility. Transport fixtures are authored synthetic test data shaped like API responses; they are **not actual ERA5 observations or the basis of live-verification claims**.

## Real API and browser CORS verification

Final successful live run started **2026-10-23 21:09:47 Europe/Istanbul** (`2026-10-23T18:09:47.532Z`). The optional script used a real Chromium browser with the production app, no intercepted API responses, no keys, and no CORS bypass.

| Observed field             | Actual response / outcome                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| City search                | Edirne; HTTP 200; 3 results                                                                          |
| Explicit selected location | Edirne, Edirne, Republic of Türkiye; ID 747712                                                       |
| Requested coordinates      | latitude 41.67719, longitude 26.55597                                                                |
| Archive request            | HTTP 200; `models=era5`, `daily=rain_sum`                                                            |
| Returned grid coordinates  | latitude 41.75, longitude 26.5                                                                       |
| Date range                 | 2025-01-01 through 2025-12-31                                                                        |
| Daily coverage             | 365 dates and 365 rainfall values; zero null rainfall values; accepted by the adapter                |
| Units                      | `daily_units.time=iso8601`, `daily_units.rain_sum=mm`                                                |
| Timezone                   | Europe/Istanbul; GMT+3; fixed UTC offset 10,800 seconds                                              |
| Observed rainfall total    | approximately **417.5 mm**, computed from the fetched response; never a hardcoded test expectation   |
| Browser CORS               | both endpoints returned `Access-Control-Allow-Origin: *`; app successfully fetched and used the data |
| Browser errors             | none in the successful final run                                                                     |
| Daily-payload SHA-256      | `88c7d37d3ddf43836e2ad1c001d4cdd7c01197b2c2be6e678f5455d2accbd532`                                   |

With the illustrative default home inputs, the browser displayed approximately **34,262 L modeled supply**, **37.5% demand coverage**, **5,792 L overflow**, and **26 L ending storage**. These rounded outputs describe the model and assumed inputs, not a measured Edirne property or verified environmental savings.

An earlier browser run also succeeded. An intermediate repeat at `2026-10-23T18:07:30.808Z` timed out waiting for a geocoding response. Its cause was not established; a subsequent direct request returned HTTP 200 and the deliberate browser rerun above passed. The failed attempt is retained rather than hidden. There are no automatic live-verification retry loops, and live availability is not a deterministic test requirement.

- [Latest complete observed live metadata](docs/verification/live-open-meteo.json)
- [Dated successful attempt](docs/verification/live-open-meteo-20261023T180947532Z.json)
- [Retained timed-out attempt](docs/verification/live-open-meteo-20261023T180730808Z.json)

## Responsive, accessibility, and screenshot evidence

Both synthetic and mocked historical modes passed at **1440, 768, 390, and 320 px**, including the expanded provenance block. All eight axe scans detected **zero WCAG 2 A/AA or WCAG 2.1 AA violations**. The tests verified no horizontal page overflow, including historical scenarios with maximum UI inputs. The daily table intentionally scrolls inside its own labeled region. Existing keyboard navigation remains tested. Automated scans are not a full screen-reader/conformance audit.

The following captures were visually reviewed. Historical transport-fixture images are explicitly distinguished from the real-service captures.

| Evidence                         | Screenshots                                                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synthetic, 1440 / 768 px         | [1440](docs/screenshots/build-02-synthetic-1440.png), [768](docs/screenshots/build-02-synthetic-768.png)                                                                                           |
| Synthetic, 390 / 320 px          | [390](docs/screenshots/build-02-synthetic-390.png), [320](docs/screenshots/build-02-synthetic-320.png)                                                                                             |
| Synthetic mobile results detail  | [390 results](docs/screenshots/build-02-synthetic-390-results.png)                                                                                                                                 |
| Mocked historical, 1440 / 768 px | [1440 fixture](docs/screenshots/build-02-mocked-historical-1440.png), [768 fixture](docs/screenshots/build-02-mocked-historical-768.png)                                                           |
| Mocked historical, 390 / 320 px  | [390 fixture](docs/screenshots/build-02-mocked-historical-390.png), [320 fixture](docs/screenshots/build-02-mocked-historical-320.png)                                                             |
| Real Edirne 2025 API data        | [1440 live](docs/screenshots/build-02-live-edirne-1440.png), [390 live](docs/screenshots/build-02-live-edirne-390.png), [mobile results detail](docs/screenshots/build-02-live-edirne-results.png) |

## Files changed

| Files                                     | Change                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/data/rainfall.ts`                    | New discriminated dataset/location types, synthetic provenance, allowed years, calendar construction                                 |
| `src/data/openMeteo.ts`                   | New React-independent URL builders, validators, typed errors, abort/revision handling, HTTP client and bounded cache                 |
| `src/data/openMeteo.test.ts`              | 59 new adapter, transport, calendar, export, integration, and conservation tests                                                     |
| `src/components/RainfallSource.tsx`       | New source selector, historical form, pending/error states, active summary and provenance                                            |
| `src/App.tsx`                             | Active validated dataset integration, variable period/date labels, historical CSV selection, BUILD 02 label                          |
| `src/components/WaterChart.tsx`           | Annual daily lines, month ticks, full-date tooltips; original synthetic views preserved                                              |
| `src/engine/csv.ts`                       | Historical metadata/dates/disclaimers and formula-safe text cells; synthetic daily format preserved                                  |
| `src/styles.css`                          | Source/provenance layout and responsive states using existing visual system; tooltip contrast and unfocused skip-link capture polish |
| `tests/fixtures.ts`                       | Explicitly synthetic, independent transport fixtures                                                                                 |
| `tests/historical.spec.ts`                | 15 new intercepted browser tests                                                                                                     |
| `tests/app.spec.ts`                       | Original nine tests preserved; screenshot filenames updated only                                                                     |
| `scripts/verify-live.mjs`                 | Optional live browser verification, owned preview lifecycle, metadata hashes, success/failure history, screenshots                   |
| `package.json`, `package-lock.json`       | Version/description and `verify:live` command; dependency set unchanged                                                              |
| `eslint.config.js`                        | Node globals for optional verification script                                                                                        |
| `index.html`                              | Updated description for available historical mode                                                                                    |
| `README.md`                               | Current functionality, equations/assumptions, endpoints/model, licensing, network behavior, data limits, reproduction and setup      |
| `docs/screenshots/build-02-*.png`         | 12 new synthetic, fixture, and live browser captures; BUILD 01 images retained                                                       |
| `docs/verification/live-open-meteo*.json` | Latest successful metadata plus dated success and timeout records                                                                    |
| `BUILD_02_REPORT.md`                      | This completion report                                                                                                               |

## Known limitations

- ERA5 is a coarse gridded modeled dataset, not measured rainfall at an individual roof. Validating completeness and units does not establish site accuracy.
- Daily rain-before-demand timing, fixed demand, and previously harvested initial storage assumptions remain. There is no first-flush, evaporation, treatment, leakage, pump, or plumbing model.
- API ISO daily boundaries use a request-time fixed UTC offset; dates are not corrected for historical DST transitions. Returned grid and city timezones can differ near boundaries and are recorded separately.
- Upstream data, geocoding, CORS behavior, and availability can change. A transient live timeout was observed. Full-year data is retained only in the current page's memory; raw rainfall in downloaded CSV plus provenance is needed to preserve an analysis snapshot.
- The model choice is explicit in the request, but the response does not supply a pinned upstream model-revision identifier. A future response from the same URL is not guaranteed identical.
- Compact/rounded overview numbers can show small apparent balance differences. The engine retains precision and enforces conservation; CSV contains unrounded daily values.
- Browser verification covers Chromium and the requested widths. Real assistive technology, other browsers, and touch hardware require further human testing.
- No measured savings, tank optimization, multiyear comparisons, financial/CO₂ estimates, deployment, or BUILD 03 features.

## Run and reproduce locally

Validated on Windows with Node.js 24.13.1 and npm 11.8.0:

```powershell
cd D:\Projects\CisternLab
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. For historical mode: choose Historical Reanalysis, search/select the intended city, select a complete year, press Load rainfall data, inspect the active source, adjust the scenario, and export CSV. Synthetic mode needs no external requests.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npx playwright install chromium
npm run test:e2e
git diff --check
```

Run `npm run verify:live` separately for actual Edirne 2025 service verification. It uses port 4318, needs internet access, and stops its own preview afterward. Playwright's deterministic suite owns port 4173 and uses mocks for historical requests.

Work stops at verified, committed BUILD 02. Nothing was deployed or published.
