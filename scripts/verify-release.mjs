/** Browser verification against an explicit production URL; no intercepted responses. */
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.argv[2];
if (!base || !base.endsWith("/CisternLab/"))
  throw new Error("Supply the full production URL ending /CisternLab/.");
const isPublic = new URL(base).protocol === "https:";
const label = isPublic ? "public" : "subpath";
const prefix = `production-${label}`;
const evidence = {
  kind: isPublic
    ? "ACTUAL PUBLIC HTTPS BROWSER — NO MOCKS"
    : "LOCAL PRODUCTION SUBPATH — NO MOCKS",
  verifiedAt: new Date().toISOString(),
  url: base,
  status: "failed",
  browser: "Chromium",
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  responses: [],
  viewports: [],
  liveWeather: { status: "not requested for local verification" },
};
await mkdir("artifacts/verification", { recursive: true });
await mkdir("artifacts/screenshots", { recursive: true });
await mkdir("artifacts/pdf", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const studio = page.locator("#impact-evidence");
const weatherRequests = [];
const responses = [];
let phase = "core";
page.on("pageerror", (error) =>
  evidence.pageErrors.push({ phase, message: error.message }),
);
page.on("console", (message) => {
  if (message.type() === "error")
    evidence.consoleErrors.push({ phase, message: message.text() });
});
page.on("requestfailed", (r) =>
  evidence.failedRequests.push({
    phase,
    url: r.url(),
    error: r.failure()?.errorText,
  }),
);
page.on("request", (r) => {
  if (r.url().includes("open-meteo.com"))
    weatherRequests.push({ phase, url: r.url() });
});
page.on("response", (r) => {
  evidence.responses.push({ phase, url: r.url(), status: r.status() });
  responses.push(r);
});
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const download = async (button) => {
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  const bytes = await readFile(await file.path());
  return { filename: file.suggestedFilename(), bytes };
};
const csvRecord = (file) => ({
  filename: file.filename,
  bytes: file.bytes.length,
  sha256: sha(file.bytes),
});
try {
  expect((await page.goto(base)).status()).toBe(200);
  await expect(page.getByText(/BUILD\s+\d+/)).toHaveCount(0);
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  await expect(studio.getByText(/Archive verified: 1,096/)).toBeVisible();
  await studio
    .getByRole("button", {
      name: "Explore Archived Edirne Example",
      exact: true,
    })
    .click();
  await expect(studio.getByTestId("impact-context")).toContainText(
    "ARCHIVED HISTORICAL REANALYSIS — ERA5",
  );
  await expect(studio.getByTestId("impact-recommendation")).toHaveText(
    "3,000 L",
  );
  const archiveResponse = responses.find((r) =>
    r.url().includes("archived-edirne.snapshot"),
  );
  expect(archiveResponse?.ok()).toBe(true);
  const raw = await archiveResponse.body();
  expect(sha(raw)).toBe(
    "2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7",
  );
  const snapshot = JSON.parse(raw.toString("utf8"));
  expect(snapshot.datasets.map((d) => d.rainfallMm.length)).toEqual([
    365, 366, 365,
  ]);
  const delivered = { current: [], selected: [] };
  for (const year of [2023, 2024, 2025]) {
    for (const [key, name] of [
      ["current", "Current"],
      ["selected", "Selected-alternative"],
    ]) {
      const value = await studio
        .getByTestId(`impact-row-${year}-${name}`)
        .locator("td")
        .nth(1)
        .innerText();
      delivered[key].push(Number(value.replaceAll(",", "")));
    }
    await expect(
      studio
        .getByTestId(`impact-row-${year}-No-harvesting`)
        .locator("td")
        .nth(1),
    ).toHaveText("0");
  }
  const sum = (v) => v.reduce((a, b) => a + b, 0);
  expect(sum(delivered.current)).toBeCloseTo(114591.6, 6);
  expect(sum(delivered.selected)).toBeCloseTo(120687.2, 6);
  expect(sum(delivered.selected) - sum(delivered.current)).toBeCloseTo(
    6095.6,
    6,
  );
  await expect(studio.getByTestId("impact-three-year-total")).toContainText(
    "120,687.2",
  );
  await expect(studio.locator(".impact-conditional")).toContainText("ONLY IF");
  const original = await download(
    studio.getByRole("button", { name: "Download original archived snapshot" }),
  );
  expect(sha(original.bytes)).toBe(sha(raw));
  await studio.locator(".impact-provenance > summary").click();
  for (const text of [
    "rain_sum",
    "2024 · 366 complete daily records",
    "CC BY 4.0",
    "GeoNames",
    "Copernicus",
  ])
    await expect(studio.locator(".impact-provenance")).toContainText(text);
  await studio.locator(".impact-provenance > summary").click();
  await studio
    .getByRole("button", { name: "Copy Key Findings", exact: true })
    .click();
  await expect(
    studio.getByText(/Key findings copied with source/),
  ).toBeVisible();
  const findings = await page.evaluate(() => navigator.clipboard.readText());
  for (const text of [
    "ARCHIVED HISTORICAL REANALYSIS",
    "2023–2025",
    "120 m²",
    "0 L starting storage",
    "m³",
    "ONLY IF",
    "not measured savings",
  ])
    expect(findings).toContain(text);
  evidence.copy = {
    passed: true,
    characters: findings.length,
    sha256: sha(findings),
  };
  evidence.exports = { originalArchive: csvRecord(original) };
  evidence.exports.daily = csvRecord(
    await download(
      page.getByRole("button", { name: "Export results", exact: true }),
    ),
  );
  evidence.exports.sizing = csvRecord(
    await download(
      page
        .locator("#tank-sizing")
        .getByRole("button", { name: "Export sizing CSV", exact: true }),
    ),
  );
  const launch = studio.getByRole("button", {
    name: "Start evidence walkthrough",
  });
  await launch.focus();
  await page.keyboard.press("Enter");
  const next = studio.getByRole("button", { name: "Next", exact: true });
  for (const [i, title] of [
    "THE PROBLEM",
    "THE DATA",
    "THE DECISION",
    "THE IMPACT",
  ].entries()) {
    await expect(
      studio.getByRole("heading", { name: `${i + 1}. ${title}`, exact: true }),
    ).toBeFocused();
    if (i < 3) {
      await next.focus();
      await page.keyboard.press("Enter");
    }
  }
  await expect(next).toBeDisabled();
  await studio.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    studio.getByRole("heading", { name: "3. THE DECISION", exact: true }),
  ).toBeFocused();
  await studio.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(launch).toBeFocused();
  evidence.walkthrough =
    "All four stages, keyboard Next, Back and Exit focus passed";
  await page.evaluate(() => globalThis.document.fonts.ready);
  await expect(
    studio.locator(".impact-evidence-chart .recharts-surface"),
  ).toBeVisible();
  await context.setOffline(true);
  await studio.getByLabel("Alternative standard tank").selectOption("2000");
  await expect(studio.getByTestId("impact-period-2025")).toContainText(
    "34,261.6",
  );
  await studio.getByLabel("Alternative standard tank").selectOption("3000");
  await context.setOffline(false);
  evidence.archive = {
    url: archiveResponse.url(),
    bytes: raw.length,
    sha256: sha(raw),
    days: snapshot.datasets.map((d) => ({
      year: d.year,
      days: d.rainfallMm.length,
    })),
    deliveredL: delivered,
    currentTotalL: sum(delivered.current),
    selectedTotalL: sum(delivered.selected),
    incrementL: sum(delivered.selected) - sum(delivered.current),
    samePageOffline: "passed after assets prepared",
    weatherRequests: weatherRequests.length,
  };
  expect(weatherRequests).toHaveLength(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    if (width <= 600)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("link", { name: "Impact & Evidence", exact: true })
      .click();
    expect(new URL(page.url()).pathname).toBe("/CisternLab/");
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
    ).toBe(true);
    await studio.locator(".impact-provenance > summary").click();
    await studio.locator(".impact-methodology > summary").click();
    const region = studio.getByRole("region", {
      name: "Impact capacity comparison",
      exact: true,
    });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    evidence.viewports.push({
      width,
      pageOverflow: false,
      axeViolations: 0,
      keyboardTable: "passed",
      mobileNavigation: width <= 600 ? "passed" : "desktop",
    });
    await studio.locator(".impact-provenance > summary").click();
    await studio.locator(".impact-methodology > summary").click();
    await studio.screenshot({
      path: `artifacts/screenshots/${prefix}-impact-${width}.png`,
      animations: "disabled",
    });
    await studio.locator(".impact-annual-cards").screenshot({
      path: `artifacts/screenshots/${prefix}-cards-${width}.png`,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() =>
    globalThis.addEventListener(
      "beforeprint",
      () => {
        globalThis.document.documentElement.dataset.beforeprint = "true";
      },
      { once: true },
    ),
  );
  await studio
    .getByRole("button", { name: "Print / Save Evidence Brief", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-beforeprint",
    "true",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#root")).toBeHidden();
  const brief = page.locator("body > .impact-print-root");
  for (const text of [
    "Impact Evidence Brief",
    "ONLY IF",
    "CC BY 4.0",
    "SHA-256",
    "2023",
    "2024",
    "2025",
  ])
    await expect(brief).toContainText(text);
  const pdfPath = `artifacts/pdf/${prefix}-evidence-brief.pdf`;
  await page.pdf({
    path: pdfPath,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate:
      '<div style="width:100%;font-size:8px;text-align:center;color:#53614f">CisternLab - Estimated evidence - <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  evidence.print = {
    actualBeforeprintEvent: true,
    navigationHidden: true,
    pdf: pdfPath,
    pagination:
      "Inspect with pdfinfo and render all pages; not inferred by this script",
  };
  await page.emulateMedia({ media: "screen" });
  const refresh = await page.reload();
  expect(refresh.status()).toBe(200);
  expect(page.url()).toBe(base + "#impact-evidence");
  await expect(studio.getByText(/Archive verified: 1,096/)).toBeVisible();
  evidence.hashRefresh = "200, supported hash URL preserved";
  expect((await page.request.get(base + "favicon.svg")).status()).toBe(200);
  for (const file of ["DM-Sans-OFL.txt", "Space-Grotesk-OFL.txt"])
    expect((await page.request.get(base + "licenses/" + file)).status()).toBe(
      200,
    );
  const localResponses = evidence.responses.filter(
    (r) => new URL(r.url).origin === new URL(base).origin,
  );
  expect(localResponses.filter((r) => r.status >= 400)).toEqual([]);
  expect(
    localResponses.every((r) =>
      new URL(r.url).pathname.startsWith("/CisternLab/"),
    ),
  ).toBe(true);
  evidence.assets = {
    count: localResponses.length,
    fontFiles: localResponses.filter((r) => r.url.endsWith(".woff2")).length,
    nestedPathsOnly: true,
    httpErrors: 0,
  };
  expect(evidence.pageErrors).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
  expect(evidence.failedRequests).toEqual([]);
  evidence.coreStatus = "passed";
  evidence.status = "passed";
  if (isPublic) {
    phase = "live weather";
    const live = (evidence.liveWeather = { status: "failed", archives: [] });
    try {
      await page
        .getByRole("button", { name: "Historical Reanalysis", exact: true })
        .click();
      const geoPromise = page.waitForResponse(
        (r) => r.url().startsWith("https://geocoding-api.open-meteo.com/"),
        { timeout: 22000 },
      );
      await page.getByLabel("Search city worldwide").fill("Edirne");
      const geoResponse = await geoPromise,
        geo = await geoResponse.json();
      const selected = geo.results?.find(
        (r) => r.name === "Edirne" && r.country_code === "TR",
      );
      expect(selected).toBeTruthy();
      live.geocoding = {
        url: geoResponse.url(),
        status: geoResponse.status(),
        selected,
        corsAllowOrigin:
          geoResponse.headers()["access-control-allow-origin"] ?? null,
      };
      await page
        .locator(".location-results button")
        .filter({ hasText: `ID ${selected.id}` })
        .click();
      await page
        .getByRole("button", { name: "Load rainfall data", exact: true })
        .click();
      await expect(page.getByTestId("dataset-classification")).toHaveText(
        "HISTORICAL REANALYSIS — ERA5",
        { timeout: 22000 },
      );
      await page.locator(".provenance-details > summary").click();
      await expect(page.locator(".provenance-details")).toContainText(
        "rain_sum",
      );
      await page.locator(".provenance-details > summary").click();
      await expect(page.locator("#tank-sizing")).toContainText(
        "365-day historical reanalysis scenario",
      );
      live.daily = csvRecord(
        await download(
          page.getByRole("button", { name: "Export results", exact: true }),
        ),
      );
      live.sizing = csvRecord(
        await download(
          page
            .locator("#tank-sizing")
            .getByRole("button", { name: "Export sizing CSV", exact: true }),
        ),
      );
      const lab = page.locator("#historical-variability");
      await lab
        .getByRole("button", {
          name: "Load three-year comparison",
          exact: true,
        })
        .click();
      await expect(lab.getByTestId("variability-context")).toBeVisible({
        timeout: 22000,
      });
      const exported = await download(
        lab.getByRole("button", {
          name: "Export reproducibility JSON",
          exact: true,
        }),
      );
      const parsed = JSON.parse(exported.bytes.toString("utf8"));
      expect(parsed.datasets.map((d) => d.rainfallMm.length)).toEqual([
        365, 366, 365,
      ]);
      live.export = csvRecord(exported);
      live.inputs = parsed.inputs;
      live.decision = parsed.decision;
      for (const r of responses.filter((r) =>
        r.url().startsWith("https://archive-api.open-meteo.com/"),
      )) {
        const body = await r.json();
        live.archives.push({
          url: r.url(),
          status: r.status(),
          corsAllowOrigin: r.headers()["access-control-allow-origin"] ?? null,
          days: body.daily.time.length,
          rainfallMm: body.daily.rain_sum.reduce((s, n) => s + n, 0),
          responseSha256: sha(await r.body()),
        });
      }
      expect(live.archives).toHaveLength(3);
      expect(
        live.archives.every(
          (r) => r.status === 200 && r.corsAllowOrigin === "*",
        ),
      ).toBe(true);
      await studio
        .getByRole("button", { name: "Use loaded three-year comparison" })
        .click();
      await expect(studio.locator(".impact-annual-card")).toHaveCount(3);
      live.comparisonCsv = csvRecord(
        await download(
          lab.getByRole("button", {
            name: "Export historical comparison CSV",
            exact: true,
          }),
        ),
      );
      await lab.screenshot({
        path: `artifacts/screenshots/${prefix}-live-edirne.png`,
        animations: "disabled",
      });
      const before = weatherRequests.length;
      await page.getByLabel("Roof area", { exact: true }).fill("121");
      await expect(
        page.locator("#tank-sizing").locator(".sizing-chart .recharts-surface"),
      ).toBeVisible();
      expect(weatherRequests.length).toBe(before);
      live.scenarioEditsMakeNoWeatherRequests = true;
      live.apiFlowStatus = "passed";
      phase = "intentional offline error";
      await context.setOffline(true);
      await page.getByLabel("Search city worldwide").fill("Bodrum");
      await expect(page.locator(".data-error")).toContainText(
        /network|connect|fetch|reach/i,
        { timeout: 22000 },
      );
      live.manualError = {
        method: "Intentional browser offline, no intercepted API responses",
        message: await page.locator(".data-error").innerText(),
      };
      await context.setOffline(false);
      await page.getByLabel("Search city worldwide").fill("Edirne");
      await expect(
        page
          .locator(".location-results button")
          .filter({ hasText: "ID 747712" }),
      ).toBeVisible({ timeout: 22000 });
      live.manualError.recovery =
        "Explicit repeated city search after reconnect succeeded; no automatic retry";
      expect(evidence.pageErrors).toEqual([]);
      expect(
        evidence.consoleErrors.filter(
          (e) => e.phase !== "intentional offline error",
        ),
      ).toEqual([]);
      expect(
        evidence.failedRequests.filter(
          (e) => e.phase !== "intentional offline error",
        ),
      ).toEqual([]);
      live.status = "passed";
    } catch (error) {
      await context.setOffline(false);
      live.error = error.message;
      live.uiErrors = await page.locator(".data-error").allTextContents();
      evidence.status = "failed";
      process.exitCode = 1;
    }
  }
} catch (error) {
  evidence.error = error.message;
  process.exitCode = 1;
} finally {
  evidence.weatherRequests = weatherRequests;
  await browser.close();
  const path = `artifacts/verification/${prefix}.json`;
  await writeFile(path, JSON.stringify(evidence, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        liveWeather: evidence.liveWeather.status,
        error: evidence.error,
        liveError: evidence.liveWeather.error,
        evidence: path,
      },
      null,
      2,
    ),
  );
}
