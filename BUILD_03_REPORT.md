# CisternLab — BUILD 03 report

**Status:** Implemented and verified on `main`. 23 October 2026, Europe/Istanbul.

**Workspace:** `D:\Projects\CisternLab` · **Baseline:** `a5aa4e5` · **Verified implementation commit:** `319cb1516fe5eebe3dd9e2b6cc874913978f0a20`.

That commit contains the application, README, tests, and screenshot evidence. This report is a following documentation-only commit; identify its own commit with `git log -1 --format=%H -- BUILD_03_REPORT.md`.

## Implemented features

- A **Tank Sizing & Decision Lab**, reachable from the existing navigation, within the original visual system. Existing dashboard, illustration, presets, synthetic patterns, historical loading/cache/provenance, daily charts, and daily CSV remain functional.
- Eleven standard capacity candidates: **0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000 L**. The current dashboard capacity is also evaluated, sorted, and deduplicated. A current-only capacity never alters the standard recommendation pool or standard-neighbor marginal chain.
- Every sizing candidate starts with **0 L**, including the current-capacity comparison. Nonzero dashboard storage triggers the required visible explanation; no sizing action modifies dashboard inputs.
- A pure, deterministic, typed engine in `src/engine/tankSizing.ts`, independent of React and networking. It invokes the unchanged daily simulation for each capacity rather than recreating water balance equations.
- **80%, 90%, 95%, 98%** supply targets, with **90% default**; “Recommended tested capacity,” maximum standard tested supply, target volume, achieved fraction, supply/coverage, and an explanation. Zero-benefit scenarios show no recommendation and a contextual reason.
- Capacity-versus-supply chart with current/recommended markers and target line; equivalent accessible candidate table; marginal supply and normalized yield; signed current-versus-recommended comparison; explicit already-recommended state.
- Analysis summary identifies active source, city/year when applicable, actual day count/date range, physical inputs, classification, and empty-start policy. Historical attribution and model disclaimers remain visible. Pending city/year edits do not change the sizing dataset.
- Memoized standard evaluations depend only on rainfall, roof, efficiency, and demand. Threshold selection performs no simulation. A non-standard current tank adds only its own simulation. No candidate or threshold change downloads weather.
- A separate **tank-sizing CSV** with complete source metadata, inputs, period, candidates/metrics/marginals, target/rule/recommendation, explicit zero starting water, disclaimers, formula-safe text fields, and an unrounded rainfall snapshot for reproduction. The existing daily CSV module is unchanged.
- README documentation and linked scientific background. Version 0.3.0, with **no dependency additions**.

## Mathematical methodology

All candidates use identical rainfall, roof area, efficiency, demand, period, and zero initial storage. The existing rain-before-demand sequence remains: collect rainfall, add to storage, spill above capacity, serve demand, and carry remaining storage to the next day. Its numerical validation and daily/period mass-conservation assertions run for every candidate.

The engine reports capacity, used water, volumetric coverage, overflow, unmet demand, final storage, fully supplied days, total days, and daily reliability. Coverage is `used / total demand`. Reliability is `fully supplied days / total days`. These are distinct metrics; neither percentage is defined when daily demand is zero. The UI displays an undefined indicator instead of misleading 100% values. Calculations and exports retain full precision; presentation alone is rounded.

For adjacent **standard** capacities:

```text
additionalSupply = largerSupply − smallerSupply
additionalCapacity = largerCapacity − smallerCapacity
incrementalYieldPer1000L = additionalSupply / additionalCapacity × 1000
```

The normalized yield is **additional modeled liters delivered per 1,000 L additional storage over the selected period**, not a financial return. Zero increments remain zero. No decreasing-gain assumption is imposed. The additional current-only row is excluded from this sequence.

Current-versus-recommended changes are `recommended − current`, preserving negative capacity/supply/coverage changes and positive increases in overflow or unmet demand. Coverage changes are shown in **percentage points**, not relative percentages.

## Exact recommendation algorithm

1. Validate, deduplicate, and sort the standard candidates ascending.
2. Run the original simulation at each capacity with initial storage forced to zero.
3. Let `maxSupply` be the maximum used-water volume **among these standard candidates only**.
4. Compute `targetSupply = targetPercent / 100 × maxSupply`.
5. If `maxSupply = 0`, return no recommendation, no achieved fraction, and an explanatory reason.
6. Otherwise, select the smallest positive standard capacity whose supply plus tolerance meets the target. The tolerance is `1e-10 × maxSupply` L, with no absolute floor. Ascending order provides deterministic tie-breaking.
7. Report selected supply divided by `maxSupply` as the achieved fraction.

A separate current capacity can exceed or fall below a standard result without affecting this algorithm. The maximum is **the maximum tested standard supply**, not a proven physical global maximum. The default 90% is **CisternLab's transparent, user-adjustable decision heuristic**, not a universal scientific optimum, certified engineering recommendation, or product recommendation. A discrete candidate can exceed the target substantially.

## Calculated examples

The exact independent fixture uses roof **1 m²**, rainfall **[10, 0, 10] mm**, efficiency **1**, demand **5 L/day**, and zero starting storage:

| Capacity | Used | Overflow | Unmet | Final storage |
| -------- | ---- | -------- | ----- | ------------- |
| 0 L      | 0 L  | 20 L     | 15 L  | 0 L           |
| 5 L      | 10 L | 10 L     | 5 L   | 0 L           |
| 10 L     | 15 L | 0 L      | 0 L   | 5 L           |
| 20 L     | 15 L | 0 L      | 0 L   | 5 L           |

Maximum tested supply is **15 L**; the 90% target is **13.5 L**; the recommended tested capacity is **10 L**. Tests directly compare these results against the original simulation engine.

For the **unmodified 30-day synthetic mixed demo** (120 m², 80% efficiency, 250 L/day), maximum standard supply is **7,250 L**, the 90% target is **6,525 L**, and the recommended tested capacity is **1,000 L**, supplying **7,250 L** (100% of the tested maximum). The smaller tested 500 L tank supplies 5,692 L, below the target. The dashboard itself remains at its original 2,000 L setting: **7,250 L used, 5,650 L overflow, 1,500 L ending storage**.

Negative differences are also checked: with the same synthetic rain/roof/efficiency, demand 1,000 L/day, current capacity 20,000 L, and an 80% target, the recommended tested capacity is 2,000 L. Modeled supply decreases from 14,400 to 14,288 L (**−112 L**), while overflow and unmet demand each increase by **112 L**. These are conditional simulated outcomes, not measured site savings.

## Final verification

| Gate                             | Result                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`              | PASS — strict TypeScript, including new modules and tests                                                                                               |
| `npm run lint`                   | PASS — zero allowed warnings                                                                                                                            |
| `npm test`                       | PASS — **132 tests**, 5 files; all 89 original tests retained                                                                                           |
| `npm run build`                  | PASS — production bundle; no bundle-size warning                                                                                                        |
| `npm run format:check`           | PASS                                                                                                                                                    |
| `npm run test:e2e`               | PASS — **36 Chromium tests**, approximately 1.2 minutes; all 24 original tests retained                                                                 |
| `git diff --check`               | PASS                                                                                                                                                    |
| Baseline preservation comparison | PASS — original simulator, its tests, daily CSV/export test, datasets/adapter, source component, daily chart component, and live-check script unchanged |

The **43 new unit tests** comprise 37 sizing-engine tests and six export tests. They cover candidate ordering/deduplication, standard/current separation, determinism, increasing-capacity supply behavior, zero cases, plateaus/ties, all thresholds and boundary tolerances, fractional precision, forced empty starts, unsupported inputs, signed changes, marginal values, tiny positive yields, 30-day synthetic and 365/366-day historical fixtures, provenance, spreadsheet safety, and conservation for every candidate. A spy verifies that changing thresholds invokes no new simulations; adding a current-only capacity invokes one. Historical fixture tests independently inspect each candidate's daily and period balances. Sixty seeded fractional scenarios check expected supply behavior.

The **12 new browser tests** cover navigation, correct recommendation/targets, immediate control changes, chart/table equivalence, current-only and already-recommended cases, negative changes, the dashboard initial-water warning, zero-benefit states, active historical period versus pending year, no weather refetch, sizing CSV content, keyboard radio interaction, accessible tables, responsive layout, and unexpected browser errors. Original daily-table assertions were scoped to `.daily-panel` so the new tables do not contaminate their row counts. Their expected values/behavior were preserved. Screenshot names now use BUILD 03, retaining older evidence.

### Accessibility and responsive findings

All **1440, 768, 390, and 320 px** layouts pass page-overflow and chart checks. Both data tables scroll inside labeled, focusable regions; keyboard scrolling and target-radio arrow navigation are tested. Screenshots at all four widths, plus a mocked 366-day mobile scenario, were visually inspected.

There are **12 automated axe scans** across synthetic/historical full pages and the lab with expanded methodology. Final scans explicitly include `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa`, with **zero detected violations**. Adding the explicit WCAG 2.1 A tag exposed an inherited header-brand accessible-name mismatch: its override omitted visible text. Removing that redundant override lets the accessible name follow the visible brand content. The production suite then passed at every width. These automated checks do not constitute a complete assistive-technology/conformance audit.

## Screenshot evidence

Lab captures below are section crops within the stated viewport width; whole-page captures retain dashboard/source context.

| Evidence                            | Files                                                                                                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sizing lab, 1440 / 768 px viewports | [1440 lab](docs/screenshots/build-03-sizing-1440.png), [768 lab](docs/screenshots/build-03-sizing-768.png)                                                                                                                                                                       |
| Sizing lab, 390 / 320 px viewports  | [390 lab](docs/screenshots/build-03-sizing-390.png), [320 lab](docs/screenshots/build-03-sizing-320.png)                                                                                                                                                                         |
| Mocked historical leap-year lab     | [366-day fixture, 390 px](docs/screenshots/build-03-sizing-mocked-366-390.png)                                                                                                                                                                                                   |
| Synthetic whole page                | [1440](docs/screenshots/build-03-synthetic-1440.png), [768](docs/screenshots/build-03-synthetic-768.png), [390](docs/screenshots/build-03-synthetic-390.png), [320](docs/screenshots/build-03-synthetic-320.png)                                                                 |
| Synthetic dashboard results detail  | [390 results](docs/screenshots/build-03-synthetic-390-results.png)                                                                                                                                                                                                               |
| Mocked historical whole page        | [1440 fixture](docs/screenshots/build-03-mocked-historical-1440.png), [768 fixture](docs/screenshots/build-03-mocked-historical-768.png), [390 fixture](docs/screenshots/build-03-mocked-historical-390.png), [320 fixture](docs/screenshots/build-03-mocked-historical-320.png) |

**No new live historical service verification was performed in BUILD 03.** Historical tests and screenshots use explicitly synthetic, intercepted transport fixtures, not actual Edirne weather. Previous BUILD 02 live records remain unchanged and are not counted as new BUILD 03 evidence. No live rainfall totals were hardcoded as sizing test expectations.

## Scientific background and limitations

The interface and README link to [U.S. Department of Energy's technology review](https://www.energy.gov/cmei/femp/rainwater-harvesting-systems-technology-review), [Imteaz, Ahsan & Shanableh (2013)](https://doi.org/10.1016/j.resconrec.2013.05.006), and [Santos & Taveira-Pinto (2013)](https://doi.org/10.1016/j.resconrec.2012.11.004) as background for storage assessment and daily water-balance comparison. They do not establish our exact 90% rule as universally optimal.

- Recommendations depend on the finite standard set, chosen target, active period, roof/efficiency/demand assumptions, and empty start. They are model-based decision support, not certified engineering design or product/installation advice.
- Thirty synthetic days are not extrapolated to an annual result. Annual comparisons cover one selected year starting empty, with no prior-year carryover, multiyear climate optimum, uncertainty model, drought-proof claim, or long-term guarantee.
- Rain-before-demand daily timing and collection-loss assumptions remain. No sub-daily precision, physical installation design, water-quality/treatment assessment, financial return, or carbon estimate is introduced.
- Reanalysis is gridded modeled rain, not station/site measurements. Existing timezone, fixed-offset daily aggregation, data revision, service availability, and attribution limitations remain documented.
- Chart lines connect evaluated capacities; intermediate sizes are not evaluated. Volumetric coverage and full-demand-day reliability are different. Compact display rounding can differ slightly from unrounded CSV values.
- Browser tests cover Chromium, requested widths, and keyboard smoke behavior. Other browsers, assistive technology, and real touch hardware need further human verification.

## Files changed

| Files                                                             | Purpose                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/engine/tankSizing.ts`                                        | Pure candidate evaluation, metrics, standard/current separation, target selection, marginals and signed changes |
| `src/engine/tankSizing.test.ts`                                   | 37 new sizing tests, direct reference fixture, conservation and memoization-boundary checks                     |
| `src/engine/tankSizingCsv.ts`, `src/engine/tankSizingCsv.test.ts` | Separate provenance-rich sizing export and six integrity/safety tests                                           |
| `src/components/TankSizingLab.tsx`                                | Analysis summary, controls, recommendation, tables, comparison, methodology and export integration              |
| `src/components/SizingChart.tsx`                                  | Capacity/supply chart, target, current/recommended markers, tooltips, no animation                              |
| `src/App.tsx`                                                     | Navigation and lazy lab integration with active dataset/scenario; BUILD 03 badge; accessible brand fix          |
| `src/styles.css`                                                  | Responsive lab styling extending the existing visual system                                                     |
| `tests/sizing.spec.ts`                                            | 12 new browser tests and lab screenshot evidence                                                                |
| `tests/app.spec.ts`, `tests/historical.spec.ts`                   | Existing tests retained; daily-row selectors scoped, screenshot names advanced, WCAG 2.1 A scans strengthened   |
| `README.md`                                                       | Exact capacities, algorithm, fairness, periods, no-benefit handling, exports, references and reproduction       |
| `package.json`, `package-lock.json`                               | Version/description 0.3.0; dependency set unchanged                                                             |
| `index.html`                                                      | Description includes tank comparison                                                                            |
| `docs/screenshots/build-03-*.png`                                 | 14 new browser evidence images; earlier build evidence preserved                                                |
| `BUILD_03_REPORT.md`                                              | This report                                                                                                     |

## Run locally and reproduce

Validated with Node.js 24.13.1 and npm 11.8.0:

```powershell
cd D:\Projects\CisternLab
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. Select a synthetic pattern or explicitly load a historical dataset, set the dashboard's roof/efficiency/demand/current capacity, and choose **Tank Sizing** in navigation. All sizing comparisons start at zero; target selection is local. Export the sizing CSV to preserve inputs, source context, raw rainfall, and all candidate results. The separate dashboard export is unchanged.

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

Playwright owns a temporary production preview on port 4173 and mocks historical APIs. The existing optional `npm run verify:live` remains separate and was not used as a BUILD 03 gate. No deployment, BUILD 04, multiyear optimization, payback, purchasing, CO₂ estimate, installation design, account, database, paid API, or unrelated AI feature was added. Work stops at verified BUILD 03.
