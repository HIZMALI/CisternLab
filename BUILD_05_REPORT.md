# CisternLab — BUILD 05 report

**Status:** Complete and verified on `main`. 23 October 2026, Europe/Istanbul.

**Workspace:** `D:\Projects\CisternLab` · **Expected and confirmed baseline:** `314e4efc8c325a642de5f1b38c683d0c1a80be4b`.

**Verified source commit:** `6449d900643abffe4c186ce62ef7a2bcafdd1155`.

The source commit contains the application, tests, README, presentation draft, original archive copy, verification metadata, screenshots and PDF print evidence. This report follows in a documentation-only commit; identify its full hash with `git log -1 --format=%H -- BUILD_05_REPORT.md`. The completion message identifies the final commit. The working tree was clean before work; no reset, branch change, worktree or discarded user changes occurred.

## Implemented features

- Navigable **Impact & Evidence** section with environmental challenge, exact data identity/provenance, analyzed physical scenario, quantified conditional resource benefit, capacity decision, reproducibility and explicit limitations, extending the existing CisternLab design.
- Three explicit modes: active dashboard data (synthetic or validated single year), **Explore Archived Edirne Example**, and a validated loaded three-year comparison. The archived mode has separate editable reference inputs and never overwrites the dashboard's location, inputs or initial storage.
- Pure `impactEvidence.ts` maps established simulation/sizing/variability outputs to modeled delivery, potential freshwater displacement in L/m³, demand, coverage, unmet demand, overflow, unused storage, full-demand days, shortage days and longest shortage streak. The three original engines remain unchanged and authoritative.
- Fair zero-start comparisons among **no harvesting (0 L)**, current capacity, recommended tested capacity and a selected standard candidate. Signed supply/unmet/overflow differences and coverage changes in **percentage points**, with zero-demand/no-benefit states rather than meaningless percentages.
- Independent annual results and explicitly labeled three-year sums. No annual-storage concatenation, starting-water advantage, unused-storage displacement or modeled-versus-measured ambiguity.
- Original Edirne 2023/2024/2025 rainfall delivered as a separate hashed local asset, validated against the original SHA-256 plus existing complete-year/provenance rules. All **1,096 dates and rainfall values** are retained. Saved result tables are ignored; production results come from recalculation.
- Deferred local-asset preparation and an explicit **Archive verified** status. Once the archive and app/chart assets are ready, the example works in the same open page with the browser fully offline. Missing/malformed/corrupted assets show a clear error and manual retry without replacing the active analysis with invented data.
- Archived reference **Explore the Evidence** walkthrough with four manual stages: THE PROBLEM, THE DATA, THE DECISION, THE IMPACT. Keyboard-operable Back/Next/Exit, heading focus and restored launch focus; no modal, automatic advancing or loss of selected analysis. Stage changes do not trigger new simulations.
- Recharts capacity/period delivery comparison with labeled liters, persistent legend and equivalent accessible tables. Annual impact cards identify dataset, period, units and estimated status; essential results never depend on hover.
- **Copy Key Findings** with source identity, period, inputs, target, units, decisions and caveats, plus a manual copy fallback. **Print / Save Evidence Brief** uses browser printing and a dedicated semantic print layout; no PDF-generation dependency was added. A screen preview and original archived JSON download are available.
- README methodology/offline/reproduction documentation and `docs/HACKATHON_PRESENTATION_DRAFT.md`: concise English pitch, environmental problem, audience, data/method, modeled example, limits and four-step storyboard. No deployment, video, submission or award is implied.
- Version **0.5.0**, with no dependency additions.

## Environmental interpretation and calculations

**Potential freshwater displacement = modeled harvested rainwater delivered, ONLY IF every delivered liter replaces an otherwise used liter of freshwater.** Equivalent m³ = delivered L / 1000. This is conditional modeled substitution, not measured savings, observed municipal-consumption reduction, carbon reduction or financial benefit.

All comparative simulations start with **0 L in each independent period**. The dashboard retains its original initial-storage behavior. Ending unused storage is reported but excluded from displacement; initial stored water is never counted twice. The original daily rain-before-demand and conservation equations are unchanged.

The no-harvesting baseline is the existing zero-capacity, empty-start simulation under the same roof, efficiency, rain and daily demand. Delivery is 0 L and remaining demand equals total demand. Tank-overflow difference is only a modeled tank-balance difference: drainage routing and real site runoff/flood risk are not simulated.

For a comparison from case A to B:

```text
additional modeled delivery = delivered[B] − delivered[A]
reduction in unmet demand = unmet[A] − unmet[B]
coverage change (percentage points) = 100 × (coverage[B] − coverage[A])
tank overflow change = overflow[B] − overflow[A]
```

Coverage is supplied / demand and remains undefined when demand is zero. A shortage day has any positive unmet volume; a streak is consecutive shortage days within a period. Neither denotes meteorological drought or sub-daily service. Three-year totals sum independent annual outputs; weighted total coverage uses total supplied / total demand, and the longest streak is the maximum within a year, never a joined run. Year-end stocks are not added to delivered water.

The original standard candidates and 80/90/95/98% yield-target algorithms remain unchanged. The three-year capacity must satisfy each annual target with its original `1e-10 × annual maximum` tolerance. Current-only capacities stay outside the standard recommendation pool. Any zero-yield year prevents a meaningful cross-year relative recommendation while preserving other metrics.

## Archived evidence integrity and reproduction

Original file: `docs/verification/build-04-live-20261023T192935527Z-snapshot.json`.

**Original SHA-256:** `2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`.

All of the following independently match that digest and **78,537 bytes**:

1. Original BUILD 04 snapshot, unchanged.
2. Browser delivery copy, `src/assets/archived-edirne.snapshot.json`.
3. Production asset, `dist/assets/archived-edirne.snapshot-MX1A3M1A.json`.

**Transformation:** byte-for-byte file copy only. No rainfall, dates or provenance were transformed. The original embedded precomputed results remain in the preserved file but are never used as production calculation inputs. Both raw snapshots are excluded from formatting to preserve the recorded bytes. JSON stays outside the initial JavaScript bundle; its production gzip size is approximately **8.61 kB**. A deferred local fetch prepares offline availability; the archive does not contact the weather API.

`readArchivedBytes` first verifies SHA-256, then checks the snapshot schema and delegates to the established annual/cross-year validators. Validated records are cloned/frozen without changing values. The exact source classification is **ARCHIVED HISTORICAL REANALYSIS — ERA5**. The archive preserves Edirne ID **747712**, 2023/2024/2025, Open-Meteo, ERA5, `rain_sum`, mm, all original retrieval timestamps from **23 October 2026**, request URLs, requested **41.67719, 26.55597**, returned ERA5 grid **41.75, 26.5**, Europe/Istanbul and fixed UTC offset **10,800 s**.

| Year | Dates / rain values | Original daily-payload SHA-256                                     |
| ---- | ------------------- | ------------------------------------------------------------------ |
| 2023 | 365 / 365           | `2ecbd32418705d28c56bf6f5ca47b588ab0a8603859356d5dc6d4c490280af0d` |
| 2024 | 366 / 366           | `1045e7820b6ec6263e82101b9501361e0e2907857d45ff10ce40f504ba662475` |
| 2025 | 365 / 365           | `88c7d37d3ddf43836e2ad1c001d4cdd7c01197b2c2be6e678f5455d2accbd532` |

Leap day 2024-02-29, complete chronological calendars, finite nonnegative rain, provider/model/units and source metadata are validated. Missing/null/duplicated/corrupted data or inconsistent grids are rejected. **No new live weather verification was performed or claimed in BUILD 05.** This is reproduction of the genuine preserved BUILD 04 capture, distinct from synthetic transport fixtures.

- [Machine-readable integrity verification](docs/verification/build-05-archive-integrity.json)
- [Original unchanged archived evidence](docs/verification/build-04-live-20261023T192935527Z-snapshot.json)

## Calculated archived reference example

Inputs: roof **120 m²**, efficiency **0.80**, fixed non-potable demand **250 L/day**, current tank **2,000 L**, empty start each January 1, **90%** tested-yield target. All figures below are derived from archived raw rainfall using the unchanged engines, with rounding only for presentation.

| Year | Rain     | Current 2,000 L delivery | Current coverage | Selected/recommended 3,000 L delivery | Additional modeled delivery | Selected unused end storage |
| ---- | -------- | ------------------------ | ---------------- | ------------------------------------- | --------------------------- | --------------------------- |
| 2023 | 460.3 mm | 39,030.8 L               | 42.77%           | 40,995.6 L                            | +1,964.8 L                  | 0 L                         |
| 2024 | 519.5 mm | 41,299.2 L               | 45.14%           | 43,547.6 L                            | +2,248.4 L                  | 1,644 L                     |
| 2025 | 417.5 mm | 34,261.6 L               | 37.55%           | 36,144 L                              | +1,882.4 L                  | 26 L                        |

The three-year comparison capacity is **3,000 L**. At that selected capacity, independent annual deliveries total **120,687.2 L (120.6872 m³)** across 2023–2025. The current-2,000 L total is **114,591.6 L**, so the modeled increment is **+6,095.6 L across those three years**. No-harvesting delivers **0 L**, with total remaining demand **274,000 L**. Selected remaining demand totals **153,312.8 L**. Year-end stocks are excluded from all displacement figures. The maximum within-year selected-tank shortage streak is **57 days**; no streak joins years.

These are conditional resource-use estimates for assumed inputs, **not measured savings at an Edirne property**. Reference constants exist only in tests/documentation; the UI and production calculation logic derive values from original rainfall. No model-reference mismatch remains unresolved.

## Final quality results

| Gate                                    | Result                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                     | PASS — strict application and test types                                                            |
| `npm run lint`                          | PASS — zero allowed warnings                                                                        |
| `npm test`                              | PASS — **242 tests, 10 files**; original 202 retained, **40 added**                                 |
| `npm run build`                         | PASS — production build, separate archive asset, no bundle-size warning                             |
| `npm run format:check`                  | PASS, including final documentation and verification metadata                                       |
| `npm run test:e2e`                      | PASS — **68 Chromium tests**, about **3.5 minutes**; original 52 retained, **16 added**             |
| `git diff --check`                      | PASS                                                                                                |
| Original/copy/production archive hashes | PASS — identical original digest and all three daily-payload hashes                                 |
| Archived reference calculations         | PASS — original annual rain/supply/coverage and 3,000 L decision reproduced                         |
| Browser offline archived mode           | PASS — context fully offline after asset verification, then archive selected and capacity changed   |
| Browser print / PDF inspection          | PASS — dedicated brief, tagged four-page A4 capture, all four pages rendered and visually inspected |

Added unit coverage includes the exact zero-capacity baseline, conditional displacement and L/m³ conversion, exclusion of unused storage and starting water, signed current/selected/recommended differences, percentage points, independent annual resets and leap demand, three-year totals and within-year streaks, zero/identical/below/above recommendation cases, fractional conservation, nonmutation/determinism, no additional simulations for thresholds/copy/brief, original archive/schema/hash/date/metadata integrity, and genuine archive reproduction distinct from mocked fixtures.

Added browser coverage includes Studio navigation, real archived example without Open-Meteo calls, fully offline recalculation, standard capacity/target and physical input edits without refetch, baseline/signed changes, complete provenance/original-byte download, historical single-year and typed three-year compatibility, keyboard walkthrough focus/Back/Next/Exit and analysis preservation, clipboard content, no-benefit/zero states, missing/malformed/corrupted archive errors and manual retry, print invocation/layout, chart/table accessibility and four responsive widths. All 52 previous browser cases remain; only their screenshot filenames advanced to BUILD 05. No public service uptime is required.

### Baseline preservation

Git comparison against `314e4ef` confirms the original simulator, sizing engine and variability engine, their tests, original daily/sizing/historical exporters, Open-Meteo adapter/client, historical comparison validator, authored demos and original archived snapshot are unchanged. The only existing-lab behavior addition is an optional typed callback after successful complete comparison validation. No recommendation rule or water-balance equation was rewritten.

The BUILD 01 dashboard still yields **7,250 L used / 5,650 L overflow / 1,500 L ending storage**. BUILD 03's independent sizing fixture and BUILD 04's A/B/C three-year fixture remain correct. All original unit and browser tests pass.

## Responsive, accessibility and print evidence

**1440, 768, 390 and 320 px** layouts pass overflow, chart-container, table and keyboard checks. The full suite performs **20 axe scans**, using `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, with **zero detected violations**. New Studio scans expand source/methodology details and the data stage of the walkthrough. The nominal archive layout tests collect **no console errors or browser exceptions**. Intentional HTTP/corruption cases are handled explicitly. Automated scans are not a complete assistive-technology conformance audit.

The browser-print test invokes the app's print button, confirms the main app/navigation is hidden under print media, checks essential content and creates the artifact below with Chromium. It contains **four A4 pages**, a PDF structure tree (tagged output), page numbers, complete annual tables, scenario/decision/differences, original source metadata/checksum, license, reproducibility and caveats. Text content was checked with whitespace normalization because PDF extraction can split variable-font words; visual review confirmed intact wording. Poppler renders of **all four final pages** were inspected: no clipping, overlap, missing glyphs or broken tables observed. Tagging does not constitute PDF/UA certification. PDF metadata/pagination may vary with browser settings.

- [Four-page browser print capture](output/pdf/build-05-evidence-brief.pdf)
- [Machine-readable browser print verification](docs/verification/build-05-browser-print.json)

| Screenshot evidence                             | Files                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Studio using genuine archived data, all widths  | [1440](docs/screenshots/build-05-impact-archive-1440.png), [768](docs/screenshots/build-05-impact-archive-768.png), [390](docs/screenshots/build-05-impact-archive-390.png), [320](docs/screenshots/build-05-impact-archive-320.png) |
| Annual impact card detail, all widths           | [1440](docs/screenshots/build-05-impact-cards-1440.png), [768](docs/screenshots/build-05-impact-cards-768.png), [390](docs/screenshots/build-05-impact-cards-390.png), [320](docs/screenshots/build-05-impact-cards-320.png)         |
| Final printed pages                             | [1](docs/screenshots/build-05-print-page-1.png), [2](docs/screenshots/build-05-print-page-2.png), [3](docs/screenshots/build-05-print-page-3.png), [4](docs/screenshots/build-05-print-page-4.png)                                   |
| Previous dashboard/sizing/variability workflows | `build-05-synthetic-*`, `build-05-mocked-historical-*`, `build-05-sizing-*`, `build-05-page-mocked-*`, `build-05-variability-mocked-*` in `docs/screenshots/`                                                                        |

There are **34 new screenshots**: eight genuine-archive Studio/card captures, four genuine-archive print pages and 22 retained-workflow captures using authored demos or explicitly synthetic transport fixtures. Earlier build evidence remains intact. All requested widths and final printed pages were visually inspected.

## Architecture and changed files

The verified source commit changes/adds **61 files**; this report is the following documentation file.

| Files                                                                       | Purpose                                                                                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/engine/impactEvidence.ts`, `.test.ts`                                  | Pure impact mapping, baseline/capacity differences, independent totals, copy/print data and tests                 |
| `src/data/archivedEvidence.ts`, `.test.ts`                                  | Original digest/schema/provenance validation, immutable original records, genuine reproduction/integrity tests    |
| `src/data/archiveClient.ts`                                                 | Deferred local asset preparation, cached validated bytes, clear failures/manual retry                             |
| `src/assets/archived-edirne.snapshot.json`                                  | Unmodified byte-for-byte browser copy of original evidence                                                        |
| `src/components/ImpactEvidenceStudio.tsx`                                   | Modes, separate archived inputs, decisions, annual cards, totals, comparisons, provenance, copy and print actions |
| `src/components/ImpactEvidenceChart.tsx`                                    | Modeled delivered-liter chart with table equivalent                                                               |
| `src/components/JudgeWalkthrough.tsx`                                       | Four manual reference stages, memoized reference calculation and keyboard focus                                   |
| `src/components/EvidenceBrief.tsx`, `EvidenceSourceRecords.tsx`             | Shared print/screen brief and complete source records                                                             |
| `src/App.tsx`                                                               | Navigation, lazy Studio integration, BUILD 05 badge and minimal validated-comparison handoff state                |
| `src/components/HistoricalVariabilityLab.tsx`                               | Optional callback on complete successful validation; existing flow retained                                       |
| `src/styles.css`                                                            | Coherent responsive Studio styles, narrower navigation spacing, table regions and isolated A4 print rules         |
| `tests/impact.spec.ts`                                                      | 16 new browser integration/offline/copy/print/accessibility cases                                                 |
| Four prior `tests/*.spec.ts` files                                          | Previous cases unchanged; screenshot filename prefixes advanced only                                              |
| `README.md`, `docs/HACKATHON_PRESENTATION_DRAFT.md`                         | Methodology, archive/claims/offline/reproduction documentation and concise English demo narrative                 |
| `package.json`, `package-lock.json`, `.prettierignore`                      | Version/description 0.5.0 and byte-preserving snapshot exclusion; no dependency additions                         |
| `docs/verification/build-05-*.json`                                         | Archive integrity and browser-print verification metadata                                                         |
| `docs/screenshots/build-05-*.png`, `output/pdf/build-05-evidence-brief.pdf` | Responsive and print evidence                                                                                     |
| `BUILD_05_REPORT.md`                                                        | This report                                                                                                       |

Standard evaluations, current metrics, selected-capacity/target views and brief data are memoized in React. Selecting another standard alternative or target uses existing evaluated results without weather downloads or additional simulations. The walkthrough's fixed reference memo excludes its stage state. Existing lab state was not broadly refactored; App receives only a typed complete comparison after validation. All actual water accounting stays in established engines.

## Sources and known limitations

- [EPA environmental benefits](https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure) and [EPA drought preparation](https://www.epa.gov/green-infrastructure/prepare-drought) provide general rain capture/non-potable reuse context. [Open-Meteo historical documentation](https://open-meteo.com/en/docs/historical-weather-api) and [licence](https://open-meteo.com/en/licence) explain source and attribution. Earlier scientific references remain accessible. None independently verifies these calculated site outcomes or validates the exact capacity heuristic.
- The official Devpost competition URL could not be read by the browsing tool. The presentation draft explicitly uses the judging focus supplied in the project request; no independent contest verification or submission is claimed.
- ERA5 is gridded modeled reanalysis, not roof/station observations. Three years cannot establish long-term reliable site design, climate normals/trends, guaranteed drought resilience or a proven optimum. Daily fixed-offset aggregation and source-revision limits remain.
- Fixed daily demand/efficiency and daily rain-before-demand timing omit sub-daily timing, first flush, evaporation, leakage, treatment and installation processes. Actual implementation depends on physical suitability, water quality, actual usage and applicable regulations. No measured environmental, carbon, financial or flood-risk outcome is inferred.
- Deferred local preparation must finish before offline use. Same-page offline use is verified; first-ever offline access, offline reload/app-shell caching and persistence across restarts are not promised. There is no service worker, account, database or backend. Clipboard availability varies; a manual text fallback remains.
- Browser print settings can change pagination and metadata. Chromium, the requested widths, keyboard smoke behavior and automated axe were tested; other browsers, screen readers and real touch hardware need human verification. Tagged PDF output is not a full PDF accessibility audit.
- Display values round to two fractional digits; engines retain floating-point precision. A printed m³ figure may therefore be rounded relative to its liter value. End storage is excluded even when visible rounding obscures a small amount.

No final quality gate or archived reference verification remains failed or unresolved.

## Launch locally and reproduce

Validated with Node.js **24.13.1** and npm **11.8.0**:

```powershell
cd D:\Projects\CisternLab
npm ci
npm run dev
```

Open **http://127.0.0.1:4317**, choose **Impact & Evidence**, wait for **Archive verified**, then choose **Explore Archived Edirne Example**. The reference scenario is separate from the dashboard. Change an alternative/target, inspect annual comparisons, walk through the evidence, copy findings, or choose **Print / Save Evidence Brief** and the browser's Save as PDF destination. The archive makes no Open-Meteo request.

To reproduce programmatically, verify/read original bytes with `readArchivedBytes`, use `.comparison` in `comparisonImpactSource(data, true)`, call `evaluateImpactEvidence(source, inputs)`, `currentImpactMetrics(evaluation)`, then `buildImpactView(evaluation, current, target, alternativeCapacityL)`. The brief and copy text consume that same view. README documents all inputs and exported-source reproduction.

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

Playwright owns and stops its production preview on port 4173. All deterministic weather tests use intercepted responses; the archived example uses the real preserved local file. No new live-service run is needed for BUILD 05. Temporary verification servers are stopped after completion.

Work stops at verified BUILD 05 on `main` with a clean working tree. No deployment, GitHub Pages publication, Devpost submission, video creation/upload, BUILD 06, backend/account/database, paid service/API key, unrelated AI, financial payback, CO₂ calculation, climate forecast or changed simulation equation was added.
