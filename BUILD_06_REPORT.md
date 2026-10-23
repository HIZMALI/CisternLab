# CisternLab - BUILD 06 public release report

**Status: COMPLETE.** Public repository created, main pushed normally, GitHub Actions quality gates and Pages deployment succeeded, and the actual HTTPS application was opened and tested on 23 October 2026. No manual account action is required. BUILD 07, Devpost submission and video production were not started.

## A. Git, publication and security

| Item                    | Verified result                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository              | [HIZMALI/CisternLab](https://github.com/HIZMALI/CisternLab), PUBLIC, owned by the authenticated HIZMALI account                                             |
| Remote                  | `origin https://github.com/HIZMALI/CisternLab.git` for fetch and push                                                                                       |
| Branch                  | `main`, tracking `origin/main`; no new branch, worktree, reset or force-push                                                                                |
| Starting HEAD           | `90cc817ec788c0027af0c9bb62734d1fd8523e32`, clean BUILD 05 baseline                                                                                         |
| Verified release source | `d0de0e632d2bec23fd9388430b09e6a722dd1d99`                                                                                                                  |
| Final report commit     | Resolve exactly with `git log -1 --format=%H -- BUILD_06_REPORT.md`; the final handoff supplies the actual commit hash. A commit cannot embed its own hash. |
| Final worktree          | Clean at final handoff, synchronized with remote main; verified with `git status --short --branch` and `git ls-remote origin refs/heads/main`               |
| Public application      | [https://hizmali.github.io/CisternLab/](https://hizmali.github.io/CisternLab/)                                                                              |

Before creation of the public repository, all **10 reachable commits and 185 historical blobs**, plus **210 tracked release files**, were scanned. No credential/private-home-path matches or non-noreply author/committer emails were found. Manual review covered tracked paths, scripts/configuration, provenance, report paths, screenshots and PDF text/metadata. Generic documented project-directory examples and public Edirne/GeoNames metadata are legitimate reproducibility material. No tokens or matched secret values were printed. The audit is pattern-based and is not a guarantee that every possible secret can be detected. The exact [prepublication audit](docs/verification/build-06-prepublication-audit.json), [subsequent release audit](docs/verification/build-06-public-audit.json) and read-only [audit script](scripts/audit-public.mjs) are retained.

`.gitignore` excludes dependencies, dist, coverage, temporary Playwright reports/results, logs, local env files and `tmp/`. Scientific references, original snapshots, licensing and legitimate verification artifacts remain tracked. No existing remote/repository was overwritten: the target was absent before creation. Git uses the user's existing authenticated credential helper; the deployment uses only GitHub's built-in token.

No existing license file or license-history choice was found; package `UNLICENSED` was a placeholder. Original code/documentation now use the standard [MIT license](LICENSE). [Third-party notices](THIRD_PARTY_NOTICES.md) explicitly separate Open-Meteo/ERA5/GeoNames data and service terms from source-code licensing. Full original OFL texts and 47 production-package license/notice files ship in `public/licenses/`. No claim of third-party data ownership or provider affiliation is made.

## B. CI/CD and actual quality gates

Workflow: **Verify and deploy CisternLab**, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

The [initial actual run 40019593113](https://github.com/HIZMALI/CisternLab/actions/runs/40019593113) completed **SUCCESS**, including **Quality gates and production bundle** and **Deploy GitHub Pages**. The deployed artifact came from `dist` after all gates passed. [Machine-readable CI job/step evidence](docs/verification/build-06-initial-ci.json) records the source SHA and actual outcomes. The final documentation/verified canonical-metadata push runs the same complete workflow; final handoff waits for that run and checks the refreshed public site. Its status is available in the [latest main workflow run](https://github.com/HIZMALI/CisternLab/actions/workflows/deploy.yml).

| Gate                   | Local result                                                                | Actual Linux CI result                                   |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `npm ci`               | Existing locked dependencies used; no dependency additions                  | Passed clean install                                     |
| `npm run typecheck`    | Passed                                                                      | Passed                                                   |
| `npm run lint`         | Passed after fixing browser callback globals in the new verification script | Passed                                                   |
| `npm test`             | **242 passed, 10 files**                                                    | **242 passed, 10 files**                                 |
| `npm run build`        | Passed                                                                      | Passed                                                   |
| `npm run format:check` | Passed after formatting generated verification JSON                         | Passed                                                   |
| `npm run test:e2e`     | **68 passed**, no skipped/deleted cases                                     | **68 passed**, no retries; Chromium run took 3.1 minutes |
| `git diff --check`     | Passed                                                                      | Not a separate CI gate                                   |

Node.js 24, `npm ci`, Chromium plus Linux dependencies, push-to-main and manual dispatch are configured. Concurrency allows one Pages release at a time without cancelling an active deployment. The verification job has only `contents: read`; only the dependent deployment job receives `pages: write` and `id-token: write`. Checkout does not persist credentials. The workflow uses official actions pinned to release commits, verified against official GitHub repositories on the release date:

| Official action       | Release | Pinned commit                              |
| --------------------- | ------- | ------------------------------------------ |
| checkout              | v7.0.1  | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| setup-node            | v7.1.0  | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| configure-pages       | v6.0.0  | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| upload-pages-artifact | v5.0.0  | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| deploy-pages          | v5.0.1  | `368f82528645a54fb793d4d04e342629a3f51346` |

Pages is configured with `build_type: workflow` and HTTPS enforced. No PAT, paid service or stored deployment secret is required. The runner emitted an informational Ubuntu image migration annotation; no gate or deployment failed. Setup follows [Vite static deployment documentation](https://vite.dev/guide/static-deploy.html) and [GitHub Pages publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## C. Actual site, production subpath and assets

[Public browser evidence](docs/verification/build-06-public.json) records the **real HTTPS origin**, distinct from [local subpath evidence](docs/verification/build-06-subpath.json). The public run began at `2026-10-23T20:33:56.098Z`. It used Chromium with **no intercepted responses, CORS bypass or weather fixtures**.

HTML, JS/CSS, local fonts, lazy chart/lab chunks, favicon, license files and archived JSON resolved under `/CisternLab/`. Forty same-origin page responses across initial navigation and refresh were observed, including two distinct Latin font files and their repeat responses. There were no missing assets, HTTP errors, nominal console errors, failed nominal requests or uncaught exceptions. Hash navigation and refresh of `/CisternLab/#impact-evidence` returned HTTP 200 with the supported URL preserved. No history router/fallback was introduced. [Development-root evidence](docs/verification/build-06-dev-root.json) independently confirms `http://127.0.0.1:4317/`, the default simulation and root favicon work.

Vite uses `/CisternLab/` for production build and preview, `/` for development. All 68 browser cases now use relative navigation under the production base. Favicon uses Vite's `%BASE_URL%`; archive loading already used a supported `new URL(..., import.meta.url)` asset reference. Existing hash links, Blob downloads and secure source URLs remain valid.

Page title, description, English language, favicon and Open Graph text preserve the branding. Canonical and `og:url` were added only **after the real URL was verified**. No unrelated image, affiliation claim or tracker was introduced.

Initial application JS is **270.05 kB / 84.89 kB gzip**; CSS **78.77 kB / 15.71 kB gzip**. Recharts' shared Cartesian chunk is deferred (**338.26 kB / 99.12 kB gzip**). Labs/charts remain dynamic imports. Archived JSON is a separate **78,537-byte** asset, fetched during deferred preparation rather than inlined in the entry bundle. There is no new runtime dependency, analytics, uncontrolled weather polling or automatic retry loop.

## D. Archived Edirne integrity and reproduction

Actual HTTPS asset: [original-byte archived JSON](https://hizmali.github.io/CisternLab/assets/archived-edirne.snapshot-MX1A3M1A.json).

**SHA-256 PASS:** `2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7`.

The served asset and original-snapshot UI download both match that exact digest. All **1,096** original rainfall values remain: 2023 **365**, 2024 **366**, 2025 **365**. Classification is **ARCHIVED HISTORICAL REANALYSIS - ERA5**, with original requests, dates, requested/returned coordinates, retrieval time, checksum, transformation notice and attribution visible.

Using the unchanged engines with roof **120 m²**, efficiency **0.80**, demand **250 L/day**, empty starts each year, current **2,000 L**, selected/recommended **3,000 L**, target **90%**:

| Year                     | 2,000 L delivery (L) | 3,000 L delivery (L) |
| ------------------------ | -------------------: | -------------------: |
| 2023                     |             39,030.8 |             40,995.6 |
| 2024                     |             41,299.2 |             43,547.6 |
| 2025                     |             34,261.6 |               36,144 |
| Sum of independent years |        **114,591.6** |        **120,687.2** |

Increment: **6,095.6 L** over the three independent years. Browser values are calculated from the original rainfall; expected values are assertions only. No saved precomputed output is used by the app. Unit tests also check the raw-array calculations and ignored precomputed fields. These are **conditional displacement estimates**, not measured freshwater savings; unused ending water is excluded.

There were **zero Open-Meteo requests** throughout the archived phase. Same-page offline operation passed after chart/font/archive preparation, including changing selected capacity and checking recalculated results. First-ever offline access, offline reload and persistent app-shell caching are not supported.

## E. Actual public Open-Meteo browser flow

Live verification **PASSED**, separate from deterministic test fixtures. Through the deployed UI, the run searched **Edirne**, explicitly selected **Republic of Türkiye, ID 747712**, loaded complete 2025 `models=era5`, `daily=rain_sum`, millimeter data, inspected provenance, used Tank Sizing, then explicitly loaded the three-year comparison. Every year passed the actual validators. The active 2025 year was reused; only 2023/2024 were additionally requested. Requested coordinates were **41.67719, 26.55597**. Response and export hashes, actual URLs, inputs and decisions are in the public evidence JSON.

All three archive responses and geocoding returned **HTTP 200** with `Access-Control-Allow-Origin: *`. Observed totals were approximately 2023 **460.3 mm**, 2024 **519.5 mm**, 2025 **417.5 mm**; these were recorded from real responses, **not hardcoded assertions**. Single-year and three-year classification/provenance, sizing, comparison charts, live-data handoff to Impact & Evidence and daily/sizing/comparison CSV plus reproducibility JSON exports passed.

An intentional browser disconnection while searching Bodrum produced the app's explicit **Could not reach Open-Meteo...retry manually** message. After reconnection, an explicit Edirne search recovered. Exactly one failed request/console resource message is retained and labeled **intentional offline error**; there were **no uncaught page errors** or nominal-service failures. No response was mocked and no cross-origin security setting was disabled. Physical-input changes made no further weather requests. The free service can still fail/rate-limit in future; that cannot be guaranteed by this check.

## F. Product workflows and baseline preservation

Dashboard defaults, synthetic patterns, controls, daily tables/charts, CSV and keyboard behavior passed. Tank Sizing and Historical Variability retain empty-start assumptions, tested capacity pool, zero-benefit behavior, adjustable targets and source-rich exports. Impact & Evidence passed environmental-problem text, zero-harvesting baseline, current/recommended/selected annual comparisons, independent totals, source classification and conditional labels. Original and fresh source identities remain distinct.

Clipboard findings contained source/classification, **2023-2025 period**, units, roof/efficiency/demand, zero starts, recommendation and **ONLY IF / not measured savings** language. Original archive JSON, daily CSV, sizing CSV, comparison CSV and reproducibility JSON were downloaded; byte counts/hashes are recorded. The complete walkthrough passed all four stages, keyboard Next, Back, disabled endpoint controls, Exit and focus return.

Git comparison with BUILD 05 confirms **all `src/engine` files, engine tests, data validators/clients, synthetic datasets and archived bytes are unchanged**. Runtime source changes are limited to the BUILD 06 badge; deployment base and HTML metadata are separate configuration changes. Existing browser assertions/cases remain intact, with only relative navigation and new evidence filenames. Original mass-conservation, independent sizing/variability fixtures and all numerical regressions remain passing.

## G. Accessibility, screenshots and public print

**1440, 768, 390 and 320 px** passed no-page-overflow, chart/table access, keyboard table scrolling, mobile navigation and **zero detected axe violations** using `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. The deterministic suite provides **20 scans**; local production verification added **4** and actual public verification added **4**. Stage heading/Exit focus and source/print controls were checked. Automated checks are not full WCAG or assistive-technology certification.

- Public Studio: [1440](docs/screenshots/build-06-public-impact-1440.png), [768](docs/screenshots/build-06-public-impact-768.png), [390](docs/screenshots/build-06-public-impact-390.png), [320](docs/screenshots/build-06-public-impact-320.png).
- Public annual cards: [1440](docs/screenshots/build-06-public-cards-1440.png), [768](docs/screenshots/build-06-public-cards-768.png), [390](docs/screenshots/build-06-public-cards-390.png), [320](docs/screenshots/build-06-public-cards-320.png).
- [Fresh public Edirne comparison](docs/screenshots/build-06-public-live-edirne.png). Existing local screenshots explicitly distinguish synthetic/intercepted historical fixtures from actual archived data.

The actual public **Print / Save Evidence Brief** button triggered Chromium's real `beforeprint` event. Print media excluded main navigation and exposed the separate semantic brief. The [public browser-generated PDF](output/pdf/build-06-public-evidence-brief.pdf) has **four actual A4 pages**, page numbers, tagged structure, complete annual tables/results, methods, source records, SHA-256, attribution and caveats. All pages were rendered with Poppler and visually inspected: no clipping, overlaps, blank pages or missing glyphs observed. Required text was checked with whitespace-normalized extraction because variable fonts can split extracted words. [Print verification](docs/verification/build-06-public-print.json) records the actual result. Tagging does not imply PDF/UA certification; other browsers/settings can paginate differently.

Print renders: [page 1](docs/screenshots/build-06-public-print-page-1.png), [2](docs/screenshots/build-06-public-print-page-2.png), [3](docs/screenshots/build-06-public-print-page-3.png), [4](docs/screenshots/build-06-public-print-page-4.png). Browser Save as PDF remains the primary method; no PDF runtime dependency was added.

## H. Documentation, changed files and limitations

README now leads with verified public links, intended users/problem, quick journeys, preserved equations/provenance/assumptions, local commands, reproduction, CI/deployment and separate code/data licensing. [Production demo checklist](docs/PRODUCTION_DEMO_CHECKLIST.md) gives a first-visit sequence. [Devpost release links](docs/DEVPOST_RELEASE_LINKS.md) links actual public screenshots, docs and status; it explicitly leaves narrative review, optional/required video and human submission for later. Prior build reports, presentation draft and scientific references remain intact.

Release files: `.github/workflows/deploy.yml`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/App.tsx` badge, five browser spec navigation/evidence prefixes, two optional live-script subpaths, package version/license metadata, `.gitignore`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `public/licenses/*`, `scripts/audit-public.mjs`, `scripts/verify-release.mjs`, README/checklist/release links/this report, and `docs/verification/build-06-*`, `docs/screenshots/build-06-*`, `output/pdf/build-06-*` evidence. No dependencies or simulation equations changed.

Remaining limits are explicit: modeled ERA5 grid data rather than rooftop measurements; only three historical years; fixed demand/efficiency and daily rain-before-demand with no sub-daily precision, first-flush, leakage/treatment/installation model, climate forecast or certified engineering; conditional freshwater substitution rather than measured water, carbon, financial or flood-risk benefit. Open-Meteo's public non-commercial service availability is external. Chromium/requested-width/automated checks do not cover every browser, screen reader or physical touch device. Prepared same-page offline behavior is verified; offline reload is not. Security pattern scans are not exhaustive. MIT covers original code, not third-party data/service access.

## Run and reproduce

```powershell
git clone https://github.com/HIZMALI/CisternLab.git
cd CisternLab
npm ci
npm run dev
```

Open `http://127.0.0.1:4317/`. Production verification:

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

Playwright owns/stops its port-4173 preview at `/CisternLab/`. Optional actual public check: `node scripts/verify-release.mjs https://hizmali.github.io/CisternLab/` (uses live APIs; no mocks). It generates new dated-content evidence and PDF; inspect pages and format generated JSON before committing. Linux CI installs Chromium with `--with-deps`. All final checks are completed before handoff; no manual publication action remains.
