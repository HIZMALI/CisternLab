# CisternLab · BUILD 01

**Every drop has a second life.** A local, transparent rooftop rainwater harvesting simulator for Green Shift Hacks 2026. Explore illustrative home, school, and small-facility scenarios, adjust inputs, and inspect every simulated liter. This is an original project built in this repository from an empty workspace.

All rainfall is **DEMO DATA**: authored, deterministic synthetic sequences. All outputs are **ESTIMATED RESULTS**, not observations or site-specific recommendations. No backend, account, paid service, external API, or deployment is involved. Fonts are bundled locally. BUILD 02 is not implemented.

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

Playwright starts and stops a local **production preview** on port 4173 automatically. Build first. It tests Chromium at 1440, 768, 390, and 320 pixels; checks keyboard behavior, WCAG A/AA rules with axe, exports, inputs and offline-by-design networking; and writes full-page evidence into `docs/screenshots/`. `npx playwright show-report` opens the generated, ignored HTML report. `npm run preview -- --host 127.0.0.1 --port 4317` serves the production build manually.

## Interface

- Responsive overview and original roof–gutter–tank SVG schematic.
- Editable roof area, tank capacity, non-potable daily demand, collection efficiency, and initial storage, with numerical and keyboard-operable range controls.
- Illustrative starting presets for homes, schools, and small facilities; none represents a real property.
- Three fixed 30-day synthetic rainfall patterns: mixed rainfall, dry spell, and heavy bursts. Change patterns without changing the other inputs.
- Immediate deterministic results; tank-storage and daily-balance Recharts views; demand coverage; overflow; conservation summary; and a complete accessible daily table.
- CSV download with input values, units, synthetic provenance, model assumptions, and unrounded daily records.
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

Roof area is horizontal projected catchment area. A single fixed efficiency represents collection losses. These losses occur before tank inflow; mass-balance assertions cover water entering the tank plus initial storage. Roof-water losses are not an additional tank outflow. There is no separate first-flush, evaporation, leakage, drainage, pump, treatment, or infiltration model. Demand is constant each day. Initial storage is assumed to be previously harvested rainwater. No seasonal or long-term extrapolation is made.

Zero tank capacity spills all incoming water. Zero demand stores water up to capacity, serves zero liters, and shows demand coverage as **undefined (—)** rather than 100%. Dry days can use prior storage. Zero roof area and zero efficiency are valid. Zero demand days count as fully supplied, but the UI replaces that count with “No demand configured.”

## Estimated versus measured impact

Potential freshwater displacement equals `Σ used` liters, or `Σ used / 1000` m³, **only under the explicit assumption that every delivered liter substitutes for one liter of freshwater demand**. This includes any initial storage, assumed to be rainwater. Demand coverage is `Σ used / (D × number of days)` when total demand is positive. Unmet demand is `Σ unmet`.

These quantities describe a modeled scenario. They are not measured savings, proof of freshwater demand reduction, avoided runoff at a site, or verified environmental benefits. No carbon emissions, financial savings, site performance, or drinking-water safety claims are made.

## Architecture and verification

React, strict TypeScript, Vite, Tailwind CSS, Lucide, and Recharts. Vitest tests the pure engine, validation, dataset repeatability, exports, and conservation, including 200 seeded fractional scenarios over 60 days each. Playwright uses the production build and axe for browser checks. See `BUILD_01_REPORT.md` for the verified results and screenshot evidence.

`src/engine/` is independent of React. `src/data/` holds synthetic fixtures. The app derives a fresh simulation from validated scenario state on each change; there is no persistence or backend.

## Current limitations

- A daily rain-before-demand approximation can overstate overflow or understate usable water relative to a finer time-step model.
- Only a 30-day illustrative period with fixed demand is exposed in the UI. No rainfall editing, real location selection, annual sizing, optimization, scenario persistence, or multi-scenario comparison.
- No physical design, structural suitability, water quality, filtration, first flush, pump electricity, costs, or carbon factors.
- Rounded table and balance values can show tiny apparent discrepancies; calculations and CSV retain full precision.
- Browser automation covers Chromium, with visual review at the four requested sizes. Other browsers and assistive technology require further human testing; automated axe checks do not establish full accessibility conformance.
- Dependency installation needs network access; the built app makes no external network requests. This is not a PWA and does not promise a first-ever load without a local server.

## BUILD 02 data-source plan (documentation only)

No BUILD 02 integration has been started. A future build could support permissioned user-uploaded daily rainfall CSVs and separately evaluated official meteorological/open-data sources. Before using any source, record its origin, license, station/location, units, time zone, coverage dates, missing-day policy, resolution, retrieval date, and quality flags. Distinguish measured records, modeled climate data, and synthetic examples in both the UI and exports. Never silently fill missing data or present a synthetic sequence as historical. Validate unit conversions and compare any real-site estimates against independently measured tank/demand records before making measured-savings claims. Review data access, attribution, and licensing before connecting any API.
