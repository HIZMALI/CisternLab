# Scientific methodology

CisternLab compares modeled rainwater supply with a fixed non-potable demand. Its daily water balance is deterministic: identical inputs and rainfall yield identical outputs. Results support early exploration, not certified engineering design or measured site savings.

## Daily rain-before-demand balance

Inputs are projected roof area `A` (m²), daily rain `P[t]` (mm), collection efficiency `e` (0–1), tank capacity `C` (L), fixed daily demand `D` (L/day) and initial storage `S[0]` (L). One millimeter over one square meter equals one liter before collection losses.

```text
Incoming I[t]    = A × P[t] × e
Available V[t]   = S[t−1] + I[t]
Overflow O[t]    = max(0, V[t] − C)
Retained R[t]    = min(C, V[t])
Delivered U[t]   = min(D, R[t])
End storage S[t] = R[t] − U[t]
Unmet M[t]       = D − U[t]
```

All of a day's rain enters first, excess spills next, then demand is served. Demand earlier in that day cannot make room for later rain. This is a **daily approximation with no sub-daily precision**. Chart lines join daily endpoints; they do not show within-day levels. Overflow leaves the modeled tank, and unmet demand never refills it automatically.

Collection efficiency accounts for losses before tank inflow. Initial dashboard storage is assumed to be previously harvested rainwater. Conservation covers this starting water and water entering the tank:

```text
Opening storage + incoming = overflow + delivered + end storage
Demand = delivered + unmet
Initial storage + Σ incoming = Σ overflow + Σ delivered + final storage
0 ≤ storage ≤ capacity
```

The engine asserts daily and whole-period conservation with tolerance `1e-10 × max(1, |left|, |right|)` L for floating-point arithmetic. It rejects non-finite/negative values, efficiency above 1, starting storage above capacity, empty/sparse/invalid rainfall arrays and derived numeric overflow. Calculations and exports retain full precision; UI values round.

Reference: roof 100 m², rain 10 mm, efficiency 0.8, capacity 500 L, demand 200 L and empty storage produce **800 L incoming, 300 L overflow, 200 L delivered, 300 L ending storage and 0 L unmet demand**.

## Tank sizing

All candidates use identical rainfall, roof, efficiency and demand, and start at **0 L**. Dashboard initial storage does not advantage a candidate. The tested standard capacities are:

```text
0, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000 L
```

These are analysis candidates, not verified commercial products. A non-standard current tank is evaluated separately and never changes the standard recommendation pool or its marginal-benefit chain.

For the selected target `q` (80%, 90%, 95% or 98%; default 90%):

```text
M = maximum delivered L among tested STANDARD capacities
T = q / 100 × M
Recommended tested capacity = smallest positive standard C with
  delivered[C] + 1e-10 × M ≥ T
```

If `M = 0`, no meaningful relative-yield recommendation exists. Equal yields prefer the smallest capacity. There is no absolute tolerance floor that makes a zero-capacity tank meet a tiny positive target. Discrete capacities may exceed the target.

This is an explicit user-adjustable **decision heuristic**, not a universal optimum, financial recommendation, design standard or reliability guarantee. Connecting chart points does not evaluate intermediate capacities.

For adjacent standard capacities:

```text
Additional delivery = larger delivery − smaller delivery
Incremental yield per 1,000 L = additional delivery / added capacity × 1,000
```

This is additional modeled water over the actual simulation period, not financial return. Signed current-versus-recommended changes are retained, including decreases. Choosing a recommendation never changes dashboard settings automatically.

## Historical variability

The comparison uses exactly 2023, 2024 and 2025 as **three independent simulations**. Each starts empty on January 1; December water is never carried into the next year. Dates/rainfall, location, requested coordinates, ERA5 model, variable/units, source URLs and returned grid/timezone metadata must all validate before a complete comparison replaces the prior one. Different grids or fixed offsets block a combination.

Each year has its own maximum `M[y]` and target `T[y]`. The three-year comparison chooses the smallest positive standard capacity satisfying **every** annual target with that year's relative tolerance. If any `M[y] = 0`, the cross-year recommendation is absent. Current-only capacity never enters the standard pool.

Metrics include delivered water, overflow, unmet demand, ending storage, full-demand days, shortage days and longest shortage streak. A shortage day has any `unmetDemandL > 0`, including fractional shortages. Streaks reset at annual boundaries; they are not meteorological droughts. The least rainy year need not have the lowest delivery because timing matters.

Volumetric coverage is `delivered / total demand`. Daily reliability is `full-demand days / days`. Both percentages are undefined at zero demand, rather than misleadingly 100%. Three-year coverage is weighted by demand, and the longest streak remains within a year. Ranges describe these years only, without recurrence probabilities, trends or climate-normal claims.

## Environmental impact interpretation

The no-harvesting baseline has zero tank capacity and empty starts, identical roof/rain/efficiency/demand, zero delivery and all demand unmet. Positive capacities are compared with that baseline and with each other.

**Potential freshwater displacement equals delivered harvested rainwater ONLY IF every delivered liter replaces an otherwise used liter of freshwater.** Liters convert to m³ by dividing by 1,000. This is a conditional model estimate, not measured municipal demand reduction or real-site savings.

Unused ending storage has not yet displaced freshwater. Independent annual totals sum deliveries without carrying tank storage across years; they are not a single-year estimate. Overflow differences are modeled tank balances, not verified stormwater runoff or flood-risk reduction. No financial, carbon, water-quality or drinking-water safety benefit is calculated.

## Scope and background references

Roof area is horizontal projected catchment area. Demand and efficiency are fixed. The model omits within-day timing, first flush, evaporation, leakage, infiltration, pumps, treatment, drainage routing and physical installation constraints. Three years cannot establish long-term site reliability, climate-change trends or a proven optimum. ERA5 completeness validation does not certify local rainfall accuracy.

- [U.S. Department of Energy: Rainwater Harvesting Systems Technology Review](https://www.energy.gov/cmei/femp/rainwater-harvesting-systems-technology-review).
- Imteaz, Ahsan & Shanableh (2013), [Reliability analysis of rainwater tanks using daily water balance model: Variations within a large city](https://doi.org/10.1016/j.resconrec.2013.05.006).
- Santos & Taveira-Pinto (2013), [Analysis of different criteria to size rainwater storage tanks using detailed methods](https://doi.org/10.1016/j.resconrec.2012.11.004).
- Hazaymeh & Lange (2026), [Effect of rainfall variability and temporal resolution on rainwater harvesting tank sizing in a case study from Jordan and Germany](https://doi.org/10.1007/s43832-026-00344-z).
- [EPA environmental benefits of green infrastructure](https://www.epa.gov/green-infrastructure/environmental-benefits-green-infrastructure) and [preparing for drought](https://www.epa.gov/green-infrastructure/prepare-drought): general context for rain capture and non-potable reuse.
- [Open-Meteo historical API documentation](https://open-meteo.com/en/docs/historical-weather-api): source and aggregation.

These references provide background; they do not independently validate CisternLab's calculated site outcomes or establish its exact capacity heuristic as a universal rule. See [data provenance and reproduction](DATA_PROVENANCE.md) for original records and request metadata.
