# CisternLab — BUILD 04 report

**Status:** Complete, verified and committed on `main`. 23 October 2026, Europe/Istanbul.

**Workspace:** `D:\Projects\CisternLab` · **Baseline:** `1fb6a270250d6e2010f83291821f46774e7b36e1`.

**Verified source commit:** `c49ce8b11d5eab3df71ba88d8917a7ffae36848d`.

**Final report commit:** the following documentation-only commit that adds this report. Resolve its exact full hash with `git log -1 --format=%H -- BUILD_04_REPORT.md`; the completion message also identifies it. A Git commit cannot embed its own content hash in a tracked file without changing that hash. All application, test, README and browser evidence files belong to the verified source commit above.

## Implemented features

- New navigable **Historical Variability Lab**, extending the original typography, panels, colors and responsive layout. Existing dashboard, synthetic patterns, single-year historical workflow, Tank Sizing & Decision Lab, controls, charts and exports remain available.
- Explicit **Load three-year comparison** action for the **active validated historical city**, comparing 2023, 2024 and 2025. Pending search results, selected locations or years do not supply the lab. Synthetic mode explains the historical-only requirement and provides a keyboard-accessible route to source selection without making weather requests.
- Shared original Open-Meteo client and validated page-session cache. The active annual record is reused; each missing year is requested once, with at most two concurrent archive requests. Requests retain `models=era5`, `daily=rain_sum`, `precipitation_unit=mm`, complete calendars, original timeout/errors, cancellation and manual retry. No candidate-specific downloads or automatic retry loops.
- Atomic comparison validation: exactly 365/366/365 chronological daily values, same selected identity/requested coordinates, complete ERA5/rain_sum/mm provenance, consistent returned grid and daily timezone/offset. Mismatches are reported and block the result. Missing values are never filled. A previous complete comparison remains visibly labeled with its own city after a failed reload or active-source change.
- Pure typed comparison modules that reuse the **unchanged simulation and sizing engines**. Every capacity starts with **0 L separately on each January 1**. No concatenation, December-to-January storage carryover or dashboard initial-storage modification.
- Annual rainfall, modeled supplied water, conditional modeled freshwater displacement, annual demand, volumetric coverage, overflow, unmet demand, full-demand days, shortage days, longest shortage streak and ending storage for every standard candidate and the current tank.
- Original annual 80/90/95/98% recommendations, default 90%, plus a separately labeled **Three-year comparison capacity**. Additional current-only capacities stay outside the standard recommendation pool. Zero-benefit years explain why the cross-year relative target is not meaningful.
- Current-tank high/low supply and coverage years, rainfall range, largest shortage-day count and longest shortage streak, including ties. Rankings are calculated independently; no assumption equates lowest annual rain with lowest coverage or longest shortage streak.
- Capacity-versus-supply Recharts visualization with three distinguishable year lines, labeled liter axes, persistent legend and a full-precision equivalent accessible table. Rainfall and coverage remain separately labeled. Essential findings are readable without hover.
- Separate **Export historical comparison CSV** and **Export reproducibility JSON**, with inputs, provenance, independent-start assumptions, attribution, thresholds, decisions and metrics. JSON preserves all 1,096 original daily dates/rain values and an analysis schema version. Existing daily/sizing exporters are unchanged.
- Standard evaluations memoized by loaded rainfall, roof, efficiency and demand. Changing the target only selects among existing results; changing current capacity only evaluates its additional row when necessary. No physical parameter or threshold edit downloads rain.
- README methodology/reproduction/error/limitations documentation and primary-source references. Package version **0.4.0**, with no dependency additions. An optional, separate live browser script records dated evidence and original JSON snapshots.

## Methodology and equations

The original rain-before-demand sequence is retained for each day: collect roof rainfall, add storage, spill above capacity, serve fixed non-potable demand, and retain the remainder. It is a daily approximation, with no claim to sub-daily service or meteorological drought detection.

For roof A (m²), efficiency e, rain P[t] (mm), capacity C (L), demand D (L/day), and prior storage S[t−1]:

```text
S[0] = 0 L independently in EVERY year
incoming[t] = A × P[t] × e
available[t] = S[t−1] + incoming[t]
overflow[t] = max(0, available[t] − C)
used[t] = min(D, min(C, available[t]))
S[t] = min(C, available[t]) − used[t]
unmet[t] = D − used[t]
```

The original engine enforces daily and period conservation for every run:

```text
opening + incoming = overflow + used + remaining
Σ incoming = Σ overflow + Σ used + ending storage  (empty annual start)
annual demand = D × year length = Σ used + Σ unmet
```

Its existing scale-relative tolerance remains `1e-10 × max(1, |left|, |right|)` L. Full floating-point precision is retained. The additional metrics module calls the original daily simulator to inspect shortages; the existing sizing engine remains authoritative for its metrics and recommendation. This additional daily pass avoids changing either established engine. Threshold selection performs no simulation.

A **fully supplied day** has `unmet === 0`. A **shortage day** has any `unmet > 0`, including fractional positive volumes. A **shortage streak** is a consecutive run of those days, reset at each annual boundary. These are modeled unmet-demand measures, not rainfall-drought classifications. Coverage is annual used / annual demand; when demand is zero, coverage and daily reliability are undefined (`null` in JSON, blank in CSV). Literal full-day counts can still equal the year length and are explicitly explained without displaying 100% reliability.

### Exact capacity decision

All years share standard capacities **0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000 L**, physical inputs and target. For each year y:

```text
M[y] = maximum modeled supply among standard candidates
T[y] = selectedTarget / 100 × M[y]
epsilon[y] = 1e-10 × M[y] L
```

The original sizing function supplies each annual decision. The **Three-year comparison capacity** is the smallest positive standard C satisfying `supply[y,C] + epsilon[y] >= T[y]` for every year. There is no absolute tolerance floor. Current-only capacities do not affect M, the standard pool or either decision. If any M is zero, the cross-year recommendation is absent with its specific reason; other annual metrics/recommendations remain available.

This is a conservative historical sensitivity heuristic over these three years, not a calibrated risk measure, certified design, proven global optimum or long-term guarantee.

## Computed independent fixture and preserved regression

The required **short synthetic pure-engine fixture** has roof 1 m², efficiency 1, demand 5 L/day, zero annual starts and candidates `[0,5,10,20]` L. It is separate from the full historical transport adapter.

| Synthetic sequence | Rain (mm)   | Annual/sequence recommendation at 90% | Supply at the shared 10 L capacity | Shortage days / longest streak | Ending storage |
| ------------------ | ----------- | ------------------------------------- | ---------------------------------- | ------------------------------ | -------------- |
| A                  | `[10,0,10]` | 10 L                                  | 15 L                               | 0 / 0 days                     | 5 L            |
| B                  | `[5,5,5]`   | 5 L                                   | 15 L                               | 0 / 0 days                     | 0 L            |
| C                  | `[0,5,5]`   | 5 L                                   | 10 L                               | 1 / 1 day                      | 0 L            |

The computed three-year/sequence comparison capacity is **10 L**. All values are calculated with the original simulator; there is no hardcoded outcome implementation. These are three-day synthetic fixtures, never claimed as actual historical years. Separate mocked complete-year tests cover 365/366/365 dates.

The original default synthetic dashboard still reports **7,250 L used**, **5,650 L overflow**, and **1,500 L ending storage**. Its BUILD 03 independent sizing fixture and 1,000 L demo recommendation remain correct.

## Final verification results

| Gate                                       | Result                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                        | PASS — strict application, adapter, engine and browser-test types                                                                             |
| `npm run lint`                             | PASS — zero allowed warnings                                                                                                                  |
| `npm test`                                 | PASS — **202 tests in 8 files**, all original 132 preserved; **70 added**                                                                     |
| `npm run build`                            | PASS — production build, no bundle-size warning                                                                                               |
| `npm run format:check`                     | PASS, including final report/evidence metadata                                                                                                |
| `npm run test:e2e`                         | PASS — **52 Chromium tests**, approximately 2.1 minutes; all original 36 preserved; **16 added**                                              |
| `git diff --check`                         | PASS                                                                                                                                          |
| Optional genuine live browser verification | PASS — one run, actual Edirne 2023/2024/2025 public responses and UI, no interceptions                                                        |
| Snapshot integrity                         | PASS — original downloaded JSON SHA-256 and all three daily-payload hashes independently matched saved metadata                               |
| Engine/export preservation                 | PASS — original simulator, sizing engine, their tests, daily/sizing CSV modules and tests, and authored demo data unchanged against `1fb6a27` |

Added unit tests cover the short independent fixture, all targets and no-resimulation selection, per-year tolerance, zero-benefit and one-zero-year behavior, annual resets/no carryover, positive fractional shortages and streak boundaries, zero demand, current-only separation, rainfall-timing counterexamples, ties/ranges, fractional precision and conservation, deterministic recomputation, complete calendars/leap day, missing/duplicate/null dates, invalid rain and provenance, locations/coordinates/model/units/grid mismatch, atomic loading, bounded concurrency, cache reuse, partial failure/manual retry, cancellation/late transports, formula-safe CSV and JSON round-trip reproduction.

Added browser tests cover explicit historical-only entry/loading, active-versus-pending selections, cache reuse and full year counts, annual/cross-year decisions and every target, local edits without refetch, initial-storage independence, partial-year rejection, HTTP/manual retry with retained old-location results, grid mismatch, cancellation and return to the same city, superseding active historical cities, zero-yield states, chart/table equivalence, both downloads, keyboard navigation and four-width accessibility/layout. No deterministic test depends on live uptime. Original browser tests changed only their screenshot filenames to retain BUILD 03 evidence.

### Accessibility and browser evidence

Final tests cover **1440, 768, 390 and 320 px**. There are **16 axe scans** across full synthetic/historical pages, the sizing lab and the fully loaded variability lab, explicitly using `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`: **zero detected violations**. Expanded source, candidate and methodology details are scanned in the new lab. Tests check keyboard radio navigation, source routing, scrollable labeled table regions, mobile navigation, chart rendering and absence of horizontal page overflow. The final responsive lab tests collect no console errors or browser exceptions. Automated checks do not establish complete assistive-technology conformance.

Screenshots were visually reviewed at all requested widths. Tables intentionally scroll within their labeled regions. The mobile navigation wraps to keep all links available.

| Evidence                                              | Files                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical variability, mocked full-year data         | [1440](docs/screenshots/build-04-variability-mocked-1440.png), [768](docs/screenshots/build-04-variability-mocked-768.png), [390](docs/screenshots/build-04-variability-mocked-390.png), [320](docs/screenshots/build-04-variability-mocked-320.png)                                    |
| Entire page with completed mocked comparison          | [1440](docs/screenshots/build-04-page-mocked-1440.png), [768](docs/screenshots/build-04-page-mocked-768.png), [390](docs/screenshots/build-04-page-mocked-390.png), [320](docs/screenshots/build-04-page-mocked-320.png)                                                                |
| Existing synthetic dashboard, BUILD 04                | [1440](docs/screenshots/build-04-synthetic-1440.png), [768](docs/screenshots/build-04-synthetic-768.png), [390](docs/screenshots/build-04-synthetic-390.png), [320](docs/screenshots/build-04-synthetic-320.png), [mobile results](docs/screenshots/build-04-synthetic-390-results.png) |
| Existing historical dashboard with transport fixtures | [1440](docs/screenshots/build-04-mocked-historical-1440.png), [768](docs/screenshots/build-04-mocked-historical-768.png), [390](docs/screenshots/build-04-mocked-historical-390.png), [320](docs/screenshots/build-04-mocked-historical-320.png)                                        |
| Existing sizing lab                                   | [1440](docs/screenshots/build-04-sizing-1440.png), [768](docs/screenshots/build-04-sizing-768.png), [390](docs/screenshots/build-04-sizing-390.png), [320](docs/screenshots/build-04-sizing-320.png), [mocked leap-year mobile](docs/screenshots/build-04-sizing-mocked-366-390.png)    |
| Actual live Edirne comparison                         | [1440](docs/screenshots/build-04-live-edirne-1440.png), [390](docs/screenshots/build-04-live-edirne-390.png)                                                                                                                                                                            |

The **22 deterministic screenshots** use synthetic authored demo/transport fixtures, not actual Edirne weather. The **two live screenshots** below use genuinely downloaded reanalysis. Earlier build screenshots and BUILD 02 live records are unchanged.

## Genuine live API result

One actual browser run started **2026-10-23T19:29:35.527Z** (**22:29:35 Europe/Istanbul**) and passed without retry or intercepted responses. It selected **Edirne, Edirne, Republic of Türkiye**, ID **747712**, requested **41.67719, 26.55597**, activated 2025 and explicitly loaded the comparison. All three archive requests returned **HTTP 200**, `models=era5`, `daily=rain_sum`, millimeter units and full requested date ranges. Both geocoding and archive responses exposed `Access-Control-Allow-Origin: *`; the actual browser successfully fetched and used them, with **no browser exceptions or console errors**.

All years returned the same ERA5 grid **41.75, 26.5**, timezone **Europe/Istanbul**, abbreviation **GMT+3**, fixed UTC offset **10,800 s**. These differ from city coordinates and are preserved independently.

Illustrative physical assumptions: roof **120 m²**, efficiency **0.8**, fixed demand **250 L/day**, current tank **2,000 L**, empty independent annual starts, default **90%** yield target.

| Year | Dates | Observed reanalysis rain | Modeled supply at current 2,000 L | Demand coverage | Shortage days | Longest shortage streak | Individual recommendation |
| ---- | ----- | ------------------------ | --------------------------------- | --------------- | ------------- | ----------------------- | ------------------------- |
| 2023 | 365   | 460.3 mm                 | 39,030.8 L                        | 42.77%          | 235           | 57 days                 | 2,000 L                   |
| 2024 | 366   | 519.5 mm                 | 41,299.2 L                        | 45.14%          | 223           | 29 days                 | 2,000 L                   |
| 2025 | 365   | 417.5 mm                 | 34,261.6 L                        | 37.55%          | 251           | 51 days                 | 3,000 L                   |

**Three-year comparison capacity: 3,000 L.** At 3,000 L, 2025 supplies approximately **36,144 L**, exceeding its **36,048.6 L** target (90% of maximum standard tested supply **40,054 L**). Current-tank supply/coverage are highest in 2024 and lowest in 2025, while the longest shortage streak occurs in 2023. These rankings are computed independently. Annual demand differs because 2024 has one additional day. The table is rounded; the saved snapshot retains original full precision.

These are observed service responses and conditional model outputs for assumed inputs, **not measured performance of an Edirne roof or verified freshwater savings**. No annual rainfall total was hardcoded as a test expectation. A future provider response may change.

- [Dated live metadata, original URLs, response-body/daily hashes and outputs](docs/verification/build-04-live-20261023T192935527Z.json)
- [Original downloaded reproducibility snapshot](docs/verification/build-04-live-20261023T192935527Z-snapshot.json)

| Year | SHA-256 of the original daily payload                              |
| ---- | ------------------------------------------------------------------ |
| 2023 | `2ecbd32418705d28c56bf6f5ca47b588ab0a8603859356d5dc6d4c490280af0d` |
| 2024 | `1045e7820b6ec6263e82101b9501361e0e2907857d45ff10ce40f504ba662475` |
| 2025 | `88c7d37d3ddf43836e2ad1c001d4cdd7c01197b2c2be6e678f5455d2accbd532` |

Original snapshot SHA-256: `2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`. Downloaded snapshot files are intentionally excluded from automatic formatting to preserve those bytes. Metadata JSON is formatted normally. All hashes were independently checked after capture; the original BUILD 02 verification files were not overwritten.

## Changed files

The source commit contains **49 changed/added files**; this report is the following documentation file.

| Files                                                                             | Purpose                                                                                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/historicalComparison.ts`, `.test.ts`                                    | Complete triplet validation, grid/timezone checks, atomic two-worker acquisition, cache/progress/error/abort tests                             |
| `src/data/weatherClient.ts`                                                       | One shared validated page-session client/cache                                                                                                 |
| `src/data/openMeteo.ts`                                                           | Read-only cache-status query; original request/validation behavior retained                                                                    |
| `src/components/RainfallSource.tsx`                                               | Uses shared client; original selection and loading workflow retained                                                                           |
| `src/engine/variability.ts`, `.test.ts`                                           | Independent annual evaluations, shortages/streaks, annual/cross-year selection, current-tank ranges and 3-day engine fixtures                  |
| `src/engine/variabilityExport.ts`, `.test.ts`                                     | Separate CSV/JSON schema, full provenance, safe text, deterministic snapshots and reproduction checks                                          |
| `src/components/HistoricalVariabilityLab.tsx`                                     | Explicit loading/progress/status, source identity, scenario summary, annual cards/decisions/ranges, accessible tables, methodology and exports |
| `src/components/VariabilityChart.tsx`                                             | Capacity/year supply chart with distinguishable lines and labeled units                                                                        |
| `src/App.tsx`, `src/styles.css`                                                   | Lazy lab/navigation, BUILD 04 badge, coherent responsive styles and wrapping mobile menu                                                       |
| `tests/variability.spec.ts`                                                       | 16 new deterministic browser integration/layout/accessibility tests                                                                            |
| `tests/app.spec.ts`, `tests/historical.spec.ts`, `tests/sizing.spec.ts`           | Original 36 cases retained; screenshot filenames advanced only                                                                                 |
| `scripts/verify-historical-live.mjs`                                              | Optional one-run real browser check, owned preview lifecycle, provenance/hashes/snapshot/screenshot recording                                  |
| `README.md`, `index.html`, `package.json`, `package-lock.json`, `.prettierignore` | Documentation/description, version 0.4.0, live command and original-snapshot formatting exclusion; no dependency additions                     |
| `docs/screenshots/build-04-*.png`                                                 | 24 screenshots, including four requested widths and two live captures                                                                          |
| `docs/verification/build-04-live-20261023T192935527Z*.json`                       | Dated live metadata and unchanged original snapshot                                                                                            |
| `BUILD_04_REPORT.md`                                                              | This report, committed after the verified source                                                                                               |

## Interpretation and limitations

- The three selected years are intentionally limited. They cannot establish a climate normal, recurrence probability, significant climate trend or reliable long-term site-specific design. The cross-year rule is an exploratory conservative heuristic, not a guarantee or statistically calibrated risk measure.
- The [Open-Meteo historical documentation](https://open-meteo.com/en/docs/historical-weather-api) explains ERA5 and daily aggregation. [Imteaz et al. (2013)](https://doi.org/10.1016/j.resconrec.2013.05.006) supplies daily water-balance reliability background. [Hazaymeh & Lange (2026)](https://doi.org/10.1007/s43832-026-00344-z) studies how rainfall variability, record length and temporal resolution affect tank sizing in selected Jordanian/German sites. Its findings motivate caution about short records; neither study validates this exact cross-year heuristic.
- ERA5 is gridded modeled reanalysis, not rooftop or station measurements. Daily fixed-offset aggregation ignores historical DST changes; provenance records the returned aggregation metadata. Grid/offset inconsistencies block comparison and may require investigation plus a fresh page-session download.
- Fixed efficiency and demand, rain-before-demand ordering, independent empty starts, finite standard candidates, and omitted first flush, evaporation, leakage, treatment and installation processes affect results. Annual reset deliberately discards preceding-year storage; this is sensitivity comparison, not a continuous operational simulation.
- Modeled freshwater displacement assumes one-for-one substitution for existing freshwater demand. No measured environmental savings, water-quality assurance, financial optimum, payback or carbon estimate is claimed.
- Public service availability, rate limits, CORS and upstream revisions can change. Cache is in memory only (12 records); raw dated arrays/provenance in JSON are needed for a persistent reproducibility record. There is no account, backend, database, file-import UI or pinned upstream revision.
- Browser verification covers Chromium, requested viewport sizes, keyboard smoke checks and automated axe rules. Other browsers, screen readers and real touch devices need further human testing. Chart segments connect tested capacities; they do not simulate untested sizes or sub-daily tank levels.

## Run locally and reproduce

Validated with Node.js **24.13.1**, npm **11.8.0**:

```powershell
cd D:\Projects\CisternLab
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. Activate a validated historical city in the source panel, navigate to **Historical Variability Lab**, and explicitly load the three years. Edit dashboard roof/efficiency/demand/current capacity and the lab's target locally. Each annual comparison still starts at zero regardless of dashboard initial water. Export CSV for tabular records or JSON for all original daily data and reproducible results. README documents the pure-function JSON round trip without another download.

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

Playwright owns and stops a production preview on port 4173 and intercepts weather services with deterministic fixtures. The separate optional `npm run verify:historical-live` uses the actual UI/public service on an owned preview at port 4319, records success or failure, and stops its browser/server. Local previews used for verification are stopped after completion.

Work stops at verified BUILD 04 on `main`, with a clean working tree. No deployment, BUILD 05, database, account, paid API, chatbot, forecast, financial payback, carbon feature, engineering certification or expansion to a 30-year analysis was added.
