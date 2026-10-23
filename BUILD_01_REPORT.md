# CisternLab — BUILD 01 report

**Status:** Complete and verified. 23 October 2026, Europe/Istanbul.

**Project:** Green Shift Hacks 2026 · `D:\Projects\CisternLab` · branch `main`.

**Verified implementation commit:** `5a1ecf836cc0e2d059c901d2f6e38fa4243cf23c`

This commit contains the application, configuration, README, tests, and screenshot evidence described below. This report is a separate documentation-only commit following that verified source commit; a report cannot contain its own Git content hash. To identify the report commit, run `git log -1 --format=%H -- BUILD_01_REPORT.md`.

## Implemented features

- New Git repository initialized on `main` in the requested empty workspace. Original application and SVG illustration; no source copied from other hackathon projects.
- React, strict TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts. Locally bundled DM Sans and Space Grotesk fonts; no runtime third-party requests.
- Responsive overview with roof-to-gutter-to-tank illustration, scenario configuration, daily results, water-balance charts, estimated impact summary, and visible methodology.
- Numeric and keyboard-operable range controls for roof area, tank capacity, collection efficiency, daily non-potable demand, and initial storage. Illustrative home, school, and small-facility presets; reset to defaults.
- Three authored, fixed 30-day synthetic rainfall patterns, explicitly labeled **DEMO DATA**. No dates, live weather, historical claims, or real sites.
- Immediate recalculation, tank-storage and daily-balance chart modes, demand coverage, overflow, end storage, unmet demand, and a complete daily table. Charts use daily endpoints and no transition animation for volume changes.
- Pure deterministic engine with finite/nonnegative input validation, bounded efficiency and initial storage, daily and total conservation assertions, numeric-overflow rejection, and unrounded calculations.
- Explicit daily **rain-before-demand** model: collect, spill above capacity, serve demand, carry remaining storage. No claim of sub-daily precision.
- **ESTIMATED RESULT** labels and conditional potential freshwater displacement, stated as one liter substituted per liter served. Initial storage is assumed to be harvested rainwater. No measured, carbon, cost, or real-site environmental savings claims.
- CSV export containing all scenario inputs, synthetic provenance, model assumptions, units, and all 30 unrounded daily records.
- English UI, semantic headings and tables, associated labels and validation messages, skip navigation, visible keyboard focus, keyboard-operable menu and charts, reduced-motion support, and a focusable horizontal table region on narrow screens.
- README covering purpose, setup, equations, assumptions, estimates versus measurement, limitations, and a documentation-only BUILD 02 data-source plan.

## Final verification results

All required checks ran successfully against the final application source. There are no unresolved test failures.

| Check                  | Result                                                |
| ---------------------- | ----------------------------------------------------- |
| `npm run typecheck`    | PASS — strict TypeScript, including test/config files |
| `npm run lint`         | PASS — ESLint with zero allowed warnings              |
| `npm test`             | PASS — 30 tests in 2 files                            |
| `npm run build`        | PASS — production build; no bundle-size warning       |
| `npm run test:e2e`     | PASS — 9 Chromium browser tests, 11.6 seconds         |
| `npm run format:check` | PASS — Prettier                                       |
| `git diff --check`     | PASS                                                  |

The unit suite includes the required reference scenario, rain-before-demand ordering with a full tank, zero rain, empty tank, zero demand, zero capacity, zero roof, efficiency endpoints, overflow, multi-day storage and shortfall, fractional precision, immutable inputs, repeated determinism, invalid and non-finite inputs, sparse/empty rainfall arrays, and derived numeric overflow. A seeded test also verifies **12,000 daily balances** (200 scenarios × 60 days), storage bounds, demand balances, and period conservation. Each demo dataset is separately checked for repeatability, length, and conservation. CSV testing checks provenance, escaping, units, and precision.

Required reference scenario: roof 100 m², rain 10 mm, efficiency 0.80, capacity 500 L, demand 200 L/day, initial storage 0 L.

| Incoming | Overflow | Used  | Remaining | Unmet |
| -------- | -------- | ----- | --------- | ----- |
| 800 L    | 300 L    | 200 L | 300 L     | 0 L   |

The default illustrative home scenario uses a 120 m² roof, 80% efficiency, a 2,000 L tank, 250 L/day demand, and zero initial storage. The mixed synthetic sequence totals 150 mm. Its independently asserted browser outputs are **7,250 L used**, **96.7% demand coverage**, **5,650 L overflow**, and **1,500 L final storage**. Conservation: `0 + 14,400 = 7,250 + 5,650 + 1,500 L`.

Browser tests use the actual production build served locally on port 4173. They verify immediate input changes, pattern selection, all presets, reset, both chart modes, expanding/collapsing the 30-day table, zero demand/capacity, storage clamping, invalid input drafts, keyboard navigation and range adjustment, mobile navigation, a real CSV download, and absence of external network requests. Layout tests report zero browser exceptions or console errors.

## Browser and screenshot evidence

All four requested widths passed automated page-overflow checks, section-bound checks, chart-rendering checks, and axe WCAG 2 A/AA plus WCAG 2.1 AA scans, with **zero detected violations**. Full-page screenshots were also visually reviewed. The daily table scrolls inside its own labeled region rather than overflowing the page. A separate mobile results capture makes the chart and complete conservation equation easy to inspect.

| Viewport              | Evidence                                                                        |
| --------------------- | ------------------------------------------------------------------------------- |
| 1440 × 1000           | [Desktop full page](docs/screenshots/build-01-1440.png)                         |
| 768 × 1000            | [Tablet full page](docs/screenshots/build-01-768.png)                           |
| 390 × 844             | [Mobile full page](docs/screenshots/build-01-390.png)                           |
| 320 × 844             | [Narrow mobile full page](docs/screenshots/build-01-320.png)                    |
| 390 px results detail | [Mobile chart, metrics, and balance](docs/screenshots/build-01-390-results.png) |

These PNGs are committed. Playwright's additional HTML report and failure traces are reproducible local artifacts ignored by Git. Automated accessibility checks and keyboard smoke tests do not replace a full assistive-technology audit.

## Changed files

All files are additions in this new repository:

| Files                                                                                           | Purpose                                                                                               |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.gitattributes`, `.gitignore`, `.prettierignore`                                               | Line-ending policy and generated-artifact exclusions                                                  |
| `package.json`, `package-lock.json`                                                             | Locked application/tool dependencies and run/check scripts                                            |
| `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`                   | Strict TypeScript, local Vite/Tailwind/Vitest, lint, and production browser-test configuration        |
| `index.html`, `public/favicon.svg`                                                              | Document metadata and original droplet favicon                                                        |
| `src/main.tsx`                                                                                  | React entry and bundled font imports                                                                  |
| `src/App.tsx`                                                                                   | Overview, original diagram, controls, metrics, impact, daily table, model explanation, CSV download   |
| `src/styles.css`                                                                                | Responsive visual system, focus states, contrast, and reduced-motion treatment                        |
| `src/components/WaterChart.tsx`                                                                 | Lazy-loaded Recharts views, daily chart accessibility and tooltips                                    |
| `src/data/demo.ts`                                                                              | Authored synthetic rainfall and default scenario                                                      |
| `src/engine/simulation.ts`, `src/engine/simulation.test.ts`                                     | Pure validated model and 29 engine/dataset tests                                                      |
| `src/engine/csv.ts`, `src/engine/csv.test.ts`                                                   | Context-preserving CSV serialization and unit test                                                    |
| `tests/app.spec.ts`                                                                             | 9 production browser, responsive, accessibility, interaction, and networking tests                    |
| `docs/screenshots/build-01-{1440,768,390,320}.png`, `docs/screenshots/build-01-390-results.png` | Five browser evidence screenshots                                                                     |
| `README.md`                                                                                     | Run instructions, equations, assumptions, impact interpretation, limitations, future data-source plan |
| `BUILD_01_REPORT.md`                                                                            | This completion report                                                                                |

## Limitations

- Daily rain-before-demand timing can produce different overflow/use than a finer time-step model. No sub-daily behavior is inferred from connecting chart lines.
- The interface exposes a synthetic 30-day period and constant demand, with explicit parameter bounds. It has no real-site data, rainfall editor, annual sizing, optimization, saved scenarios, or comparison workspace.
- Fixed efficiency aggregates collection losses. No separate first flush, evaporation, leakage, treatment, pump, structural, plumbing, water-quality, cost, or emissions model.
- Potential freshwater displacement assumes substitution for existing demand; it is not measured savings or verified environmental performance. Initial stored water is assumed to be harvested rainwater.
- Displayed values are rounded; independently rounded balance terms can differ slightly. The engine and CSV retain floating-point precision, with documented scale-relative conservation tolerance.
- Chromium was browser-tested. Other browsers, real touch hardware, and screen readers need further human verification. Local installation requires npm/browser downloads; the served application itself makes no external network requests and is not a PWA.

## Run locally

Validated on Windows with Node.js 24.13.1 and npm 11.8.0:

```powershell
cd D:\Projects\CisternLab
npm ci
npm run dev
```

Open `http://127.0.0.1:4317`. Port 4317 is configured explicitly because this machine reserves the range containing Vite's common port 5173.

To reproduce verification:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

No external APIs were connected, no backend was added, no site was deployed, and BUILD 02 was not started. Its data-source plan exists only in the README. Work stops at verified BUILD 01.
