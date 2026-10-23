# CisternLab · BUILD 06

**Every drop has a second life.** A transparent rooftop rainwater harvesting simulator for Green Shift Hacks 2026. Explore illustrative home, school, and small-facility scenarios using synthetic rainfall or a complete year of historical ERA5 reanalysis. Adjust inputs, inspect every simulated liter, and compare storage capacities in the **Tank Sizing & Decision Lab**. BUILD 05 adds an Environmental Impact & Evidence Studio, a verified archived Edirne example and a printable evidence brief while preserving all established engines and workflows.

Choose **DEMO DATA — SYNTHETIC** (offline-ready authored examples) or **HISTORICAL REANALYSIS — ERA5** (modeled climate data from Open-Meteo). All simulation and sizing outputs remain **ESTIMATED RESULTS**, not measured savings or site observations. The application has no backend, account, API key, paid API, database or tracker. Fonts are bundled locally. BUILD 06 prepares GitHub Pages publication and verifies the actual production subpath; release evidence is recorded separately from deterministic tests.

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
npm run format:check
npx playwright install chromium
npm run test:e2e
```

Playwright starts and stops a local **production preview** on port 4173 at `/CisternLab/` automatically. Build first. It tests Chromium at 1440, 768, 390, and 320 pixels in both modes; checks keyboard behavior, WCAG A/AA rules with axe, exports, inputs and networking; and writes full-page evidence into `docs/screenshots/`. Historical requests are intercepted with explicitly synthetic transport fixtures, so the test suite never depends on API uptime. `npx playwright show-report` opens the generated, ignored HTML report. `npm run preview -- --host 127.0.0.1 --port 4317` serves the production build manually at `http://127.0.0.1:4317/CisternLab/`. Development with `npm run dev` stays at `/`.

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
- Tank Sizing navigation, local capacity-versus-supply comparison, adjustable supply targets, a recommendation explanation, candidate and current-versus-recommended tables, marginal-yield analysis, and a separate provenance-rich sizing CSV. It does not change dashboard inputs.

## Tank Sizing & Decision Lab

Select **Tank Sizing** in the navigation. The lab uses only the **active validated dataset** from the dashboard, never an uncommitted city or year choice. All candidates share the same roof, collection efficiency, fixed daily demand, rainfall, and actual period. Sizing makes no network calls.

The standard analysis capacities, in liters, are exactly:

```text
0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000
```

These are analysis candidates, not verified commercial product sizes, prices, or installation recommendations. Zero liters is the no-storage baseline. The current dashboard capacity is also evaluated. A non-standard current capacity is inserted in ascending order for comparison, without changing the standard recommendation pool, its maximum supply, or its standard-neighbor marginal chain. Standard/current duplicates are evaluated once.

### Empty starts and period boundaries

**Every sizing candidate starts with 0 L.** This prevents a larger tank from gaining extra starting water. The dashboard's own initial-storage control and behavior are unchanged. With nonzero dashboard storage, a visible note explains why sizing and dashboard results can differ; current-versus-recommended columns both use the same empty start.

The lab labels the actual period: **30-day synthetic scenario**, **365-day historical reanalysis scenario**, or **366-day historical reanalysis scenario**. Synthetic examples are not extrapolated to a year. Historical comparisons start empty on January 1 with **no carryover from the preceding calendar year**. They are not multiyear climate optima or long-term guarantees.

### Explainable recommendation

The default target is **90%**, adjustable to **80%, 90%, 95%, or 98%**. For each capacity, the lab calls the unchanged `simulate` function in `src/engine/simulation.ts`; there is no second hydrological model.

```text
maxSupply = maximum modeled water used among the TESTED STANDARD capacities
targetSupply = selectedTarget / 100 × maxSupply
recommended = smallest standard capacity with modeled supply ≥ targetSupply
```

The product calls this **Recommended tested capacity**. The maximum is only among tested standard candidates, not a proven global physical maximum. The target is **our transparent user-adjustable decision heuristic**, not a scientifically mandated universal optimum, product purchase recommendation, or financial optimum. A discrete tested capacity may exceed the target substantially.

Capacities are validated, deduplicated, and sorted ascending, with the smallest capacity breaking equal-yield ties. Comparisons allow `1e-10 × maxSupply` liters of floating-point tolerance. There is no absolute tolerance floor that could let a zero-capacity tank pass a tiny positive target. If every standard capacity delivers zero, no tank is recommended; the UI explains zero demand, roof area, efficiency, rainfall, or no usable supply as applicable. Neither supply-target achievement nor demand percentages divide by zero.

### Metrics, marginal benefits, and the current tank

Each candidate reports modeled water supplied, volumetric demand coverage, overflow, unmet demand, final storage, fully supplied days, and period length. **Volumetric coverage** is `used / total demand`; **daily reliability** is `fully supplied days / total days`. Both percentages are undefined when demand is zero. Zero-demand day tallies are not displayed as misleading 100% reliability.

For adjacent **standard** capacities:

```text
additionalSupply = largerSupply − smallerSupply
additionalCapacity = largerCapacity − smallerCapacity
incrementalYieldPer1000L = additionalSupply / additionalCapacity × 1000
```

The last metric means **liters of additional modeled water delivered per 1,000 L of extra storage over the selected simulation period**. It is not a financial return. Zero improvements are retained; no rule forces individual gains to decrease monotonically. The comparison table states each standard predecessor. A current-only capacity has no standard marginal increment.

The current-versus-recommended table shows signed `recommended − current` changes in capacity, supply, demand coverage (percentage points), overflow, and unmet demand. A smaller recommended capacity can supply less water, and negative changes are shown accurately. When both capacities match, the lab explicitly says the current tank is already the recommended standard candidate. No suggested capacity is applied to the dashboard automatically.

The chart distinguishes current and recommended capacities, shows the supply target, and has an equivalent accessible table. Connecting tested points does not evaluate untested capacities. Recommendation rationale and all numeric results are available without hovering.

### Sizing export and reproducibility

**Export sizing CSV** is separate from the existing daily export; `src/engine/csv.ts` remains unchanged. The sizing CSV includes dataset classification/provider/model, location and requested/returned coordinates, year/date range/day count, timezone metadata, retrieval time/source URL/validation, attribution, physical inputs, empty-start assumptions, standard and extra current capacities, all candidate metrics and marginal values, target, decision rule and recommendation, and estimated-versus-measured limitations. It also includes the original unrounded rainfall snapshot so the analysis can be reproduced without another download. Text cells use the established formula-prefix protection and CSV escaping.

To reproduce, load/select a dataset, set roof/demand/efficiency/current tank, open the lab, choose a target, and export. All sizing starts are zero regardless of dashboard storage. Reusing the exported rainfall and physical inputs with the recorded candidate set reproduces the decision.

The pure sizing engine in `src/engine/tankSizing.ts` has no React, clock, randomness, or networking. React memoizes standard evaluations using only rainfall/roof/efficiency/demand. A threshold change only selects among existing results; a non-standard current capacity adds only its own simulation.

### Verified example and scientific background

The independent test fixture uses roof 1 m², rainfall `[10, 0, 10]` mm, efficiency 1, demand 5 L/day, and zero starting storage. Capacities `[0, 5, 10, 20]` L deliver `[0, 10, 15, 15]` L. Maximum tested supply is 15 L; the 90% target is 13.5 L, so the recommendation is 10 L. This fixture is checked directly against the original simulation engine.

For the unmodified default 30-day mixed demo, maximum standard tested supply is 7,250 L, the 90% target is 6,525 L, and the recommended tested capacity is **1,000 L**, delivering 7,250 L (100% of the tested maximum). The dashboard's separate 2,000 L default still shows **7,250 L used, 5,650 L overflow, and 1,500 L ending storage**. Sizing does not overwrite those settings.

Background references for storage assessment and daily water-balance comparison:

- [U.S. Department of Energy — Rainwater Harvesting Systems Technology Review](https://www.energy.gov/cmei/femp/rainwater-harvesting-systems-technology-review).
- Imteaz, Ahsan & Shanableh (2013), [Reliability analysis of rainwater tanks using daily water balance model: Variations within a large city](https://doi.org/10.1016/j.resconrec.2013.05.006).
- Santos & Taveira-Pinto (2013), [Analysis of different criteria to size rainwater storage tanks using detailed methods](https://doi.org/10.1016/j.resconrec.2012.11.004).

These references motivate transparent tank comparison; **they do not establish CisternLab's exact 90% rule as a universal optimum**. This lab is model-based decision support, not certified engineering design, physical installation design, drinking-water advice, a drought-proof guarantee, or measured savings.

## Historical Variability Lab · BUILD 04

Select **Historical Variability Lab** in navigation. First activate a validated historical city in the source panel, then press **Load three-year comparison**. Synthetic data has no historical location; its lab entry routes to historical selection without making requests. A pending search result, selected city or selected year does not replace the active validated location.

The lab accepts **2023 (365 days), 2024 (366 days) and 2025 (365 days)** together. It reuses the active annual dataset and the existing page-session validated cache. At most two archive requests run concurrently, with one request per missing year, using the established `models=era5`, `daily=rain_sum`, `precipitation_unit=mm` client. There are no candidate-specific downloads or automatic retries. Roof, efficiency, demand, capacity and target edits run entirely locally. Standard evaluations are memoized separately from threshold decisions and the additional current tank.

All three years must pass the existing exact-calendar validator plus comparison checks for selected location identity, requested coordinates, ERA5/model/variable/units, complete provenance, date range, and consistent returned grid and daily timezone metadata. City coordinates can differ from the returned ERA5 grid; both remain visible and exported. Different grids or fixed offsets **block the comparison** and report the mismatch. Investigate the provider's selection; a page reload clears session cache if a fresh download is needed. No missing date/year is filled or partial analysis accepted.

Requests keep the existing 15-second timeout, HTTP/rate-limit messages, abort and revision guards. Changing the active source or cancelling aborts a pending batch; late results cannot commit. Successful individual transfers can remain cached after another year fails, but the displayed analysis changes only atomically after all three validate. A previous complete comparison remains explicitly labeled with its original city on reload failure or source change, and uses the current physical scenario inputs. Its export records that displayed comparison city. Source records expose every original URL, retrieval timestamp, date count, requested/returned coordinate pair and fixed UTC offset.

### Independent annual model and metrics

Each candidate/year uses the **unchanged daily simulator and unchanged sizing engine**. All candidates share roof, efficiency, fixed daily demand and standard capacities. Every year starts at **0 L on January 1**. December storage never enters the next January: the years are three separate simulations, not a concatenated 1,096-day storage run. Dashboard initial storage is never changed or used by this comparison.

For every candidate and year the lab reports rainfall (mm), supplied water (L), modeled freshwater displacement (L, conditional one-for-one substitution only), annual demand (L), volumetric coverage (fraction or displayed %), overflow, unmet demand, fully supplied days, shortage days, longest shortage streak and ending storage. Full precision is retained in calculations, exact tables and exports. Only presentation cards round.

A fully supplied day has `unmetDemandL === 0`. A **shortage day** has `unmetDemandL > 0`, including any fractional positive amount. Its **longest shortage streak** is the longest consecutive run of those days, reset at each year boundary. This is modeled unmet demand, not meteorological drought or sub-daily service. With zero demand, all days are literally fully supplied but coverage/reliability percentages are **undefined**, supply is zero and there is no recommendation.

### Annual and three-year decisions

Each year uses the existing 80/90/95/98% rule, default 90%, against its own maximum standard tested supply. Define for year y:

```text
M[y] = maximum supplied L over standard capacities
T[y] = targetPercent / 100 × M[y]
tolerance[y] = 1e-10 × M[y] L
Three-year comparison capacity = smallest positive STANDARD C such that
  supply[y,C] + tolerance[y] ≥ T[y] for EVERY year
```

The current-only tank never alters the standard pool, annual maxima or recommendation. If any M[y] is zero, its relative yield target is not informative: the three-year recommendation is absent with an explanation (zero demand, roof, efficiency, rain, or other no benefit). Available individual annual decisions and metrics remain visible. The cross-year rule is a conservative historical comparison heuristic over the selected three years, not a calibrated risk measure, global optimum or guarantee.

At the current tank capacity the lab identifies all tied highest/lowest supply and coverage years, rainfall range, largest shortage-day count and longest shortage streak. The least rainy year need not have the lowest coverage because timing matters. Ranges describe **only these three years**, with no recurrence probability, climate normal, forecast or trend significance. No annual outputs are aggregated by carrying tank storage across boundaries.

### Comparison exports and reproduction

**Export historical comparison CSV** yields one header plus 33 standard capacity/year rows, with unrounded metrics, annual/cross-year decisions, target/tolerance, physical inputs, empty starts, JSON-encoded provenance, attribution and assumptions repeated in consistent columns. Undefined percentages/capacities are empty CSV cells. Formula-leading text is protected; quotes, commas and line breaks are escaped. Existing daily and sizing CSV exports remain unchanged.

**Export reproducibility JSON** records schema `cisternlab.historical-comparison.v1`, all three original datasets including every date/rain value and complete provenance, physical inputs/current capacity, standard candidates, threshold, assumptions, attribution, decisions, annual results and current-tank variability. Undefined numbers are `null`. It is a downloaded local analysis record, not server persistence. Identical inputs and source metadata produce identical export bytes; no export-time clock or random value is introduced.

To reproduce without network, parse the JSON; validate its `datasets` through `validateHistoricalComparison` in `src/data/historicalComparison.ts`; call `evaluateVariability(snapshot.inputs, snapshot.datasets.map(d => ({ key: String(d.year), rainfallMm: d.rainfallMm })), snapshot.standardCapacitiesL)`, then `decideVariability(evaluation, snapshot.targetPercent)` and `currentAnnualResults(evaluation, snapshot.inputs.currentTankCapacityL)` from `src/engine/variability.ts`. The unit tests exercise this exact round trip. There is no file-import interface in this build.

The independent **short synthetic engine fixture** has roof 1 m², efficiency 1, demand 5 L/day, capacities `[0,5,10,20]`, and sequences A `[10,0,10]`, B `[5,5,5]`, C `[0,5,5]`. At 90%, annual decisions are **10, 5, 5 L** and the three-year decision is **10 L**. These three-day fixtures are never presented as complete historical years; complete 365/366 transport fixtures are tested separately.

### Scientific interpretation and limited records

[Open-Meteo's historical documentation](https://open-meteo.com/en/docs/historical-weather-api) describes ERA5 and the daily aggregation source. [Imteaz, Ahsan & Shanableh (2013)](https://doi.org/10.1016/j.resconrec.2013.05.006) provides daily water-balance reliability background. [Hazaymeh & Lange (2026), “Effect of rainfall variability and temporal resolution on rainwater harvesting tank sizing in a case study from Jordan and Germany”](https://doi.org/10.1007/s43832-026-00344-z) examines rainfall variability, seasonality, record length and temporal resolution in selected sites in those two regions. Their results favor longer daily records for their scenarios and show why short records need caution; these findings are not a universal site-design rule.

Our three-year demonstration is intentionally limited. It cannot establish reliable long-term site-specific storage design or climate-change trends. These studies **do not validate CisternLab's exact cross-year decision heuristic**. ERA5 is gridded modeled rain, outputs are conditional estimates, and the daily rain-before-demand model omits finer timing and installation processes. No measured savings, design certification, economic optimum or climate prediction is claimed.

Optional live three-year verification is separate from mocked tests:

```powershell
npm run build
npm run verify:historical-live
```

This uses the actual browser UI and public endpoints once for Edirne, 2023–2025, on an owned preview at port 4319. Dated metadata/response-hash records and an original reproducibility snapshot are saved under `docs/verification/build-04-live-*`. A failure is recorded honestly without automatic retries. BUILD 02 live records are preserved. See the BUILD 04 report for the actual observed outcome.

## Impact & Evidence Studio · BUILD 05

Choose **Impact & Evidence** in navigation. The studio explains the environmental problem, source evidence, a capacity decision, its conditional resource benefit and the limits of that claim. It reuses `simulation.ts`, `tankSizing.ts` and `variability.ts` unchanged; `impactEvidence.ts` maps their outputs into a shared screen/copy/print data model without recreating water-balance equations.

Three explicit modes are available:

- **Use active dashboard data**: the active 30-day synthetic sequence or validated single historical year, with current dashboard physical inputs. Pending source selections never enter this analysis.
- **Explore Archived Edirne Example**: three original complete ERA5 years with separate editable reference inputs (120 m², efficiency 0.80, 250 L/day, current 2,000 L). It never overwrites the dashboard's scenario or location.
- **Use loaded three-year comparison**: an explicit handoff from a successfully validated Historical Variability Lab result. Its original location stays visible even when dashboard source selection changes.

### Conditional impact and the no-harvesting baseline

**Potential freshwater displacement equals modeled rainwater delivered to non-potable demand ONLY IF every delivered liter replaces an otherwise used liter of freshwater.** It is a conditional estimate, not measured savings, an observed municipal-consumption change, carbon reduction or financial benefit. Unused ending storage is excluded; it has not yet served demand. Comparative evidence always starts at **0 L independently in every period**, leaving dashboard initial storage unchanged.

The hypothetical no-harvesting baseline uses the existing zero-capacity simulation with zero initial storage, identical roof/rain/efficiency and unchanged demand. It delivers 0 L and leaves the entire demand unmet. Positive capacities are compared with that baseline, the current tank, the original recommended tested capacity and a selected standard alternative. A current-only capacity never changes the recommendation pool. All existing yield targets/rules remain unchanged; the studio's default is 90%.

`impactEvidence.ts` derives displacement L from supplied L, m³ as L / 1000, remaining freshwater requirement from unmet demand, and coverage from supplied / demand. The latter is undefined when demand is zero. Shortage counts/streaks follow BUILD 04's any-positive-unmet definition. Signed additional supply is compared minus current/baseline; reduction in unmet demand is current/baseline minus compared; coverage changes are **percentage points**. Tank-overflow differences are not verified runoff, drainage-network or flood-risk reductions.

Three-year totals are explicitly **sums of independent annual outputs**, not annual figures or a concatenated tank simulation. Demand totals account for 2024's 366 days; weighted overall coverage uses total used / total demand, not an average of annual percentages. The longest streak is the maximum within any year, never a cross-year run. Sum of independent year-end stocks is not counted as displacement. Every large result identifies units, period, dataset and estimated status.

### Archived Edirne provenance and offline behavior

The preserved BUILD 04 file is `docs/verification/build-04-live-20261023T192935527Z-snapshot.json`. Its original SHA-256 is **`2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`**. `src/assets/archived-edirne.snapshot.json` is a **byte-for-byte copy** with the same checksum, not a replacement or fabricated weather fixture. The original evidence is unchanged. Vite serves the copy as a separate hashed asset (78,537 bytes, about 8.6 kB gzip), outside the initial JavaScript bundle. Its original saved result tables are ignored: every displayed result is recalculated from its raw rainfall.

A deferred local-asset warmup runs after the studio module loads. SHA-256, snapshot schema and existing complete-year/metadata validators must pass before the UI reports **Archive verified**. The record preserves Edirne ID 747712, 2023/2024/2025, all **1,096 original dates and rain values**, Open-Meteo, ERA5, rain_sum, mm, original 23 October 2026 retrieval timestamps, requested city coordinates **41.67719, 26.55597**, returned grid **41.75, 26.5**, original URLs, Europe/Istanbul and fixed UTC offset 10,800 s. The exact classification is **ARCHIVED HISTORICAL REANALYSIS — ERA5**; it is a preserved capture, not a new live request or station-measured rainfall.

After **Archive verified** appears and application/chart assets have loaded, archive selection and recalculation work with the browser fully offline in the same open page. No Open-Meteo request is made for the example. First access still needs the local application assets. A full offline reload/first-ever offline load is not promised; there is no service worker or PWA app-shell cache. Missing, malformed or corrupted local assets show an error and manual retry; active analysis stays available. No fake archive or synthetic fallback is substituted. **Download original archived snapshot** retains the exact original bytes, even after switching modes.

Reference reproduction with the unchanged engines yields current-2,000 L annual supplies **39,030.8 / 41,299.2 / 34,261.6 L** and coverage **42.77 / 45.14 / 37.55%**. The three-year 90% comparison capacity is **3,000 L**. At 3,000 L, annual supplies are **40,995.6 / 43,547.6 / 36,144 L**: a three-year sum of **120,687.2 L (120.6872 m³)** under the substitution assumption. These are conditional modeled examples for assumed inputs, not measured savings at an Edirne property. Reference figures appear only in tests/documentation; production results come from raw rain.

### Judge walkthrough, copy and print

**Explore the Evidence** has four manually advanced stages: THE PROBLEM → THE DATA → THE DECISION → THE IMPACT. Its separate archived reference case never changes the selected studio analysis. Next/Back/Exit are native keyboard-operable buttons, stage headings receive focus, and exiting restores launch focus. No modal trap or automatic advancing is used; changing stage does not rerun simulations.

**Copy Key Findings** writes the selected analysis's identity, period, inputs, units, target, decisions, annual/totals and caveats. If clipboard access fails, a copyable text summary remains available. **Print / Save Evidence Brief** invokes browser printing, with a separate semantic print layout containing scenario, annual baseline/current/selected/recommended results, signed changes, methodology, provenance, checksum, license and limitations. Navigation and the rest of the app are excluded. Chromium's verified four-page A4 evidence capture is in `output/pdf/build-05-evidence-brief.pdf`; actual Save as PDF metadata and pagination depend on the user's browser. No PDF library was added. A screen preview is also available.

### Reproduce and verify

Retain the original JSON and recorded inputs/target/capacity. `readArchivedBytes(bytes)` verifies the original digest and calls `validateArchivedSnapshot`; pass its `.comparison` to `comparisonImpactSource(data, true)`, then `evaluateImpactEvidence(source, inputs)`, `currentImpactMetrics(evaluation)` and `buildImpactView(evaluation, current, target, selectedCapacityL)`. `evidenceBriefData` and `impactKeyFindings` consume this same view. Synthetic/active historical modes use `activeImpactSource(dataset)` instead. Full computation precision is retained; presentation rounds only. Source retrieval metadata remains original.

Run all commands in Run locally above, plus `git diff --check`. Unit tests include the genuine archived case separately from explicitly authored mock fixtures; browser tests intercept weather APIs and verify fully offline archive use, corruption/retry, copies, walkthrough and browser print output. See `BUILD_05_REPORT.md` for final totals and screenshot evidence. `docs/HACKATHON_PRESENTATION_DRAFT.md` provides a concise English pitch and four-step storyboard; it is not a submission or published site.

General context: EPA describes [capturing rain for reuse](https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure) and [non-potable rainwater use in drought preparation](https://www.epa.gov/green-infrastructure/prepare-drought). [Open-Meteo historical documentation](https://open-meteo.com/en/docs/historical-weather-api) and [licensing](https://open-meteo.com/en/licence) explain data and attribution. These sources support the general context and methodology; they do not independently verify CisternLab's calculated outcomes. Real implementation depends on physical installation, water quality, actual use and relevant regulations. Previous scientific references remain accessible in the earlier labs.

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

Roof area is horizontal projected catchment area. A single fixed efficiency represents collection losses. These losses occur before tank inflow; mass-balance assertions cover water entering the tank plus initial storage. Roof-water losses are not an additional tank outflow. There is no separate first-flush, evaporation, leakage, drainage, pump, treatment, or infiltration model. Demand is constant each day. Initial storage is assumed to be previously harvested rainwater. The dashboard and sizing lab cover one complete selected year. The historical variability lab compares three independent complete years without extrapolation.

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

React, strict TypeScript, Vite, Tailwind CSS, Lucide, and Recharts. No additional dependencies were needed for BUILDs 02–05. Vitest preserves all original engine/data tests and adds pure sizing, threshold, marginal, no-benefit, fractional, fairness, provenance, spreadsheet-safety, and conservation tests. Playwright retains the original workflows and adds sizing/reactivity/export/keyboard tests and accessibility scans. Historical requests are mocked in deterministic tests. See `BUILD_01_REPORT.md`, `BUILD_02_REPORT.md`, `BUILD_03_REPORT.md`, `BUILD_04_REPORT.md`, and `BUILD_05_REPORT.md` for verification and screenshots.

`src/engine/simulation.ts` is unchanged from BUILD 01 and independent of React. `src/data/` separates authored demos, typed dataset metadata, and the API adapter/client. `RainfallSource` owns pending selections and loading; `App` keeps the active validated dataset and scenario. Only the rainfall series enters the existing engine. No provenance, timestamp, networking, or source selection affects the mathematical model.

## Current limitations

- A daily rain-before-demand approximation can overstate overflow or understate usable water relative to a finer time-step model.
- Synthetic periods are 30 days; historical analyses are one complete allowed calendar year, with fixed daily demand. Sizing uses a finite candidate set and a water-yield heuristic. A three-year historical sensitivity comparison is available; there is no rainfall editor, long-term optimization, saved account scenario or database.
- Every sizing run starts empty with no preceding-period carryover. Recommendation thresholds and tank candidates are transparent project choices, not certified design standards, verified products, uncertainty estimates, or financial/carbon optimization.
- No physical design, structural suitability, water quality, filtration, first flush, pump electricity, costs, or carbon factors.
- Rounded table and balance values can show tiny apparent discrepancies; calculations and CSV retain full precision.
- Browser automation covers Chromium, with visual review at the four requested sizes. Other browsers and assistive technology require further human testing; automated axe checks do not establish full accessibility conformance.
- Reanalysis is modeled, spatially averaged rain and can be inaccurate for an individual roof. API completeness validation is not an accuracy certificate. No station-measured or independently verified real-site savings are available.
- Historical availability, CORS policy, rate limits, source revisions, and API format can change. The explicit ERA5 request and provenance aid reproducibility but cannot pin a future response to a particular upstream revision.
- Dependency installation and historical requests need network access; synthetic mode does not make external requests. This is not a PWA and does not promise a first-ever load without a local server.

## Reproduce an analysis

Run locally, select Historical Reanalysis, search and explicitly select the desired city, select 2023/2024/2025, and press Load rainfall data. Inspect the active period/provenance, set all five scenario controls, and download CSV. Keep that file with its retrieval timestamp and source URL; roof/tank inputs and original daily rainfall are sufficient to reproduce the same deterministic simulation without fetching again. Identical rainfall and scenario inputs yield identical outputs. API responses themselves may change, so a future download of the same URL is not a pinned snapshot.

BUILD 05 stops at verified impact evidence and presentation preparation. No deployment, submission, video, financial payback, CO₂ estimates, forecasting, purchasing, installation design or BUILD 06 work is included.

## Public release and licensing

Original CisternLab code and documentation are [MIT licensed](LICENSE). Weather/location data, fonts, icons and dependencies keep their separate licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). The bundled [DM Sans](public/licenses/DM-Sans-OFL.txt) and [Space Grotesk](public/licenses/Space-Grotesk-OFL.txt) licenses ship with the production site. MIT does not grant commercial access to Open-Meteo’s non-commercial public service.

The [GitHub Actions workflow](.github/workflows/deploy.yml) uses Node.js 24, `npm ci`, TypeScript, lint, deterministic unit tests, production build, formatting and all Chromium browser tests before deployment. Chromium Linux dependencies are installed explicitly. Official actions are pinned to verified release commits. Only the deployment job receives Pages write and OIDC permissions; no personal token or stored deployment secret is required.

For a fork, change the build/preview `base` in `vite.config.ts`, the Playwright base URL and release links to the actual repository name. In repository Settings → Pages, select GitHub Actions. Push to `main` or manually run **Verify and deploy CisternLab**. Both build and preview use `/CisternLab/`; hash navigation needs no history-router fallback. Local development remains on port 4317 at `/`. `dist` is the deployed artifact, not a tracked build folder.

`npm run audit:public` performs a read-only pattern audit of reachable history and tracked files without printing matched secrets. It supplements manual review; it cannot prove the absence of every possible secret. Do not publish a discovered historical credential without remediation.

Use the [production demo checklist](docs/PRODUCTION_DEMO_CHECKLIST.md) for the main user journey. [Release links](docs/DEVPOST_RELEASE_LINKS.md) and [BUILD 06 report](BUILD_06_REPORT.md) will record actual public status and verification evidence.
