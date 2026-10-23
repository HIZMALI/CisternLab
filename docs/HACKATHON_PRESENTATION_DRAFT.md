# CisternLab — hackathon presentation draft

Draft for Green Shift Hacks 2026. Not deployed, submitted or published. Competition reference: [Green Shift Hacks](https://green-shift-hacks.devpost.com/). The narrative addresses the environmental-impact criterion supplied in the project brief.

## One-sentence pitch

CisternLab helps homes, schools and small facilities turn rooftop rainfall data into a transparent comparison of tank sizes and potential freshwater displacement for non-potable demand.

## The environmental problem and audience

Rain arriving in bursts can overflow a tank while demand on later dry days goes unmet. Annual rainfall totals alone cannot tell a school, homeowner or small-facility manager how much usable water storage can deliver. CisternLab supports early exploration of non-potable needs such as irrigation, cleaning and toilet flushing before installation decisions.

## What it does and why it helps

Adjust roof area, collection efficiency, tank size and fixed daily demand. Inspect daily storage, overflow and unmet demand; compare tested capacities; then examine sensitivity across three independent historical years. The Impact & Evidence Studio compares no harvesting, the current tank, a recommended tested capacity and a selected alternative. Every result carries its source, units, period and assumptions. A guided walkthrough, copyable findings and printable evidence brief make the reasoning reviewable.

## Historical data and methodology

Weather data comes from Open-Meteo's ERA5 gridded historical reanalysis, using daily `rain_sum` in millimeters. The archived Edirne example preserves 365/366/365 dated daily values for 2023–2025, captured on 23 October 2026 during BUILD 04. It is not a new live request or station-measured rainfall.

The daily model collects rain, spills water above tank capacity, serves demand and carries remaining storage within the year. Every comparative year starts with 0 L, with no December-to-January carryover. The recommended tested capacity reaches a user-selected fraction of maximum supply among standard candidates; the three-year capacity must meet each annual target. This is an explicit historical heuristic, not a proven optimum or design guarantee.

## Quantified modeled example

Assume a 120 m² roof, 80% collection efficiency, 250 L/day non-potable demand, empty annual starts and the saved Edirne rainfall:

| Year | Supply with 2,000 L | Supply with 3,000 L | Additional modeled delivery |
| ---- | ------------------- | ------------------- | --------------------------- |
| 2023 | 39,030.8 L          | 40,995.6 L          | +1,964.8 L                  |
| 2024 | 41,299.2 L          | 43,547.6 L          | +2,248.4 L                  |
| 2025 | 34,261.6 L          | 36,144 L            | +1,882.4 L                  |

At the default 90% tested-yield target, the three-year comparison capacity is 3,000 L. Its **sum of independent annual modeled deliveries** is **120,687.2 L (120.6872 m³)** across 2023–2025, versus 0 L delivered by the zero-capacity baseline. It is not a single-year figure or continuous multiyear tank simulation.

**Potential freshwater displacement equals delivered water only if each liter replaces an otherwise used liter of freshwater. These are conditional model outputs for assumed inputs, not measured savings at an Edirne property. Unused ending storage is excluded.** Overflow differences are tank-balance estimates, not verified stormwater or flood-risk reductions. No carbon, financial, drinking-water safety or certified-engineering benefit is claimed.

## Evidence and reproducibility

The original archived JSON remains unchanged at `docs/verification/build-04-live-20261023T192935527Z-snapshot.json`, SHA-256 `2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`. Its browser asset is an identical copy. All 1,096 daily records and complete original provenance are retained and validated; saved result tables are ignored when recalculating. Requested city coordinates, returned ERA5 grid, dates, retrieval timestamps and URLs remain inspectable. Existing CSV/JSON downloads, original-archive download and the evidence brief preserve the analysis trail.

## Technical implementation

React, strict TypeScript, Vite, Tailwind, Lucide and Recharts, with pure deterministic simulation, sizing, historical-comparison and impact modules. Browser-only calculations; no backend, accounts, paid API or keys. Vitest checks reference cases, conservation, data integrity and reproduction; Playwright checks workflows, downloads, offline archived evidence, print layout, keyboard behavior and responsive accessibility. All previous tests are retained.

## Known limitations

ERA5 is spatially averaged modeled rainfall. Three years cannot establish long-term climate reliability, a climate normal, trend significance or guaranteed performance. Fixed demand/efficiency and daily rain-before-demand timing omit finer timing, first flush, evaporation, leakage and treatment. Real implementation depends on installation, water quality, actual use and regulations. Archived evidence works offline in the open page after its local assets validate; first-ever offline loading or an offline page reload is not guaranteed.

## Four-step demo storyboard

1. **THE PROBLEM:** Open Impact & Evidence. Explain why rain timing and storage matter alongside rainfall totals; show the conditional resource-use indicator.
2. **THE DATA:** Choose Explore Archived Edirne Example. Show the archived classification, three complete years, original retrieval date, provenance and checksum. Explain that no live API call is needed.
3. **THE DECISION:** Compare the current 2,000 L tank with the computed 3,000 L recommendation. Show yearly differences, the target rule and a smaller/larger standard alternative. Identify changes as modeled liters and percentage points.
4. **THE IMPACT:** Show annual conditional displacement and the clearly labeled three-year sum. State the substitution condition and limitations, copy findings, then open Print / Save Evidence Brief. Exit the walkthrough without changing the selected analysis.

## Background sources

- [EPA environmental benefits of green infrastructure](https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure) and [EPA drought preparation](https://www.epa.gov/green-infrastructure/prepare-drought): general rain capture and non-potable reuse context.
- [Open-Meteo historical API](https://open-meteo.com/en/docs/historical-weather-api) and [licence](https://open-meteo.com/en/licence): ERA5 source, aggregation and attribution. Weather data by Open-Meteo / ERA5 / Copernicus C3S, CC BY 4.0; geocoding by GeoNames. CisternLab derives modeled tank estimates; no provider endorsement is implied.
- Earlier daily-model and rainfall-variability papers remain linked in the product and README. These sources do not independently verify our calculated site outcomes or validate our exact decision heuristic.

No submission, award, uniqueness claim, deployment or completed video is implied by this draft.
