# CisternLab demo guide

[Open CisternLab](https://hizmali.github.io/CisternLab/) · [Source code](https://github.com/HIZMALI/CisternLab) · [Methodology](METHODOLOGY.md) · [Data provenance](DATA_PROVENANCE.md)

CisternLab helps schools, households and small facilities compare rain timing, tank capacity and non-potable demand. Every result is an estimate with visible inputs, source and assumptions.

## Explore in five minutes

1. **Simulator:** Start with the labeled 30-day synthetic demo. It delivers 7,250 L, spills 5,650 L and ends with 1,500 L at the default inputs. Change roof area, demand or capacity and inspect the daily chart/table. These are illustrative inputs, not a real property.
2. **Tank Sizing:** Compare standard capacities and the adjustable 90% relative-yield heuristic. Read the empty-start assumption and marginal-benefit table. Export sizing CSV; a recommendation never changes the dashboard automatically.
3. **Impact & Evidence:** Wait for **Archive verified**, then choose **Explore Archived Edirne Example**. Use roof 120 m², efficiency 80%, demand 250 L/day, current capacity 2,000 L, alternative 3,000 L and target 90%. All three years start empty independently.
4. **Inspect the evidence:** Current delivery totals 114,591.6 L; the selected capacity totals 120,687.2 L. Their increment is 6,095.6 L over 2023–2025. Expand original provenance to see 365/366/365 records, ERA5 classification, original requests/coordinates/timestamps, credits and checksum. Download the original snapshot.
5. **Walk through the result:** Start **Explore the Evidence** and use Next through problem → data → decision → impact. Check Back and Exit; focus follows stage headings and returns to the launch control. The selected analysis stays intact.
6. **Share responsibly:** Use **Copy Key Findings** or the manual text fallback. Retain source, period, units, inputs, empty starts, target and **ONLY IF** substitution caveat. Use **Print / Save Evidence Brief**, choose A4 and Save as PDF. A [four-page example](evidence/edirne-impact-brief.pdf) includes annual results, methodology and all source records. Browser settings can change pagination.

Potential freshwater displacement equals delivered rainwater only if it replaces otherwise used freshwater. These are conditional model estimates, not measured site savings. Ending storage is excluded; overflow differences do not establish actual runoff/flood reduction.

## Try a fresh historical source

In **Simulator → Historical Reanalysis**, search Edirne and explicitly select Türkiye / ID 747712. Choose a complete year and **Load rainfall data**. Inspect the validated period, requested/grid coordinates, source URL, timezone and retrieval timestamp. Tank Sizing now uses that active dataset.

Open **Historical Variability Lab → Load three-year comparison**. All 2023/2024/2025 data must validate before comparison. Export comparison CSV and reproducibility JSON, then choose **Use loaded three-year comparison** in Impact & Evidence. This remains distinct from the dated archived example. The free service may be unavailable or rate-limited; the app reports errors and offers manual retry. The archive needs no weather request.

## Product gallery

| View                                                             | Dataset context                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| [Simulator](screenshots/simulator.png)                           | Authored synthetic 30-day demo                            |
| [Tank Sizing](screenshots/tank-sizing.png)                       | Same synthetic demo; empty-start capacity comparison      |
| [Historical Variability](screenshots/historical-variability.png) | Actual Edirne ERA5 three-year browser load                |
| [Impact & Evidence](screenshots/impact-evidence.png)             | Preserved Edirne reanalysis with full original provenance |
| [Archived annual example](screenshots/archived-edirne.png)       | Conditional delivery estimates from original rainfall     |

## Submission reference

The [Green Shift Hacks requirements](https://green-shift-hacks.devpost.com/) ask for the problem, users, approach, expected benefit, tools and limitations, plus a complete project page with a video or walkthrough and source/build instructions. The [published rules](https://green-shift-hacks.devpost.com/rules) require credit for pre-existing tools and datasets. This guide supplies a written walkthrough; it does not claim a submitted entry or a completed video.

Tools used: React, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, Vitest, Playwright and axe; OpenAI Codex for development assistance. Open-Meteo, ERA5/Copernicus and GeoNames supply credited data. No provider or organizer endorsement is claimed.

## Scope

Keyboard navigation, scrolling data regions and responsive layouts are available. Automated axe checks do not constitute accessibility certification. The archive is usable offline on the already prepared page; offline reload is not promised. This is daily, fixed-demand, limited-record decision support, with no sub-daily, financial, carbon, forecast, water-safety or certified-design claim. See the [methodology](METHODOLOGY.md) and [source records](DATA_PROVENANCE.md) before interpreting results.
