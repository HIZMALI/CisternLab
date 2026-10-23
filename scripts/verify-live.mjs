/** Optional live-service verification, deliberately separate from deterministic tests. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const origin = "http://127.0.0.1:4318";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4318",
    "--strictPort",
  ],
  { windowsHide: true, stdio: "pipe" },
);
const evidence = {
  kind: "LIVE SERVICE VERIFICATION — NOT MOCKED",
  verifiedAt: new Date().toISOString(),
  status: "failed",
  phase: "local preview startup",
  browserErrors: [],
  documentation: "https://open-meteo.com/en/docs/historical-weather-api",
  attribution:
    "Weather data by Open-Meteo; ERA5 / Copernicus C3S. API data CC BY 4.0. Simulation is a CisternLab transformation, not measured savings or provider endorsement.",
};
let browser;
let page;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Owned production preview did not become ready. Build first and ensure port 4318 is free.",
          ),
        ),
      10000,
    );
    server.stdout.on("data", (chunk) => {
      if (String(chunk).includes(origin)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Owned production preview exited (${code}). Ensure port 4318 is free.`,
        ),
      );
    });
  });
  if (!(await fetch(origin + "/CisternLab/")).ok)
    throw new Error("Owned production preview returned an HTTP error.");
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  const errors = evidence.browserErrors;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.goto(origin + "/CisternLab/");
  evidence.phase = "live geocoding";
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  const geoResponsePromise = page.waitForResponse(
    (response) =>
      response.url().startsWith("https://geocoding-api.open-meteo.com/"),
    { timeout: 22000 },
  );
  await page.getByLabel("Search city worldwide").fill("Edirne");
  const geoResponse = await geoResponsePromise;
  const geo = await geoResponse.json();
  const selected = geo.results?.find(
    (item) => item.name === "Edirne" && item.country_code === "TR",
  );
  evidence.geocoding = {
    url: geoResponse.url(),
    status: geoResponse.status(),
    resultCount: geo.results?.length,
    selected,
    corsAllowOrigin:
      geoResponse.headers()["access-control-allow-origin"] ?? null,
  };
  if (!geoResponse.ok() || !selected)
    throw new Error("Live geocoding did not return Edirne, Türkiye.");
  await page
    .locator(".location-results button")
    .filter({ hasText: `ID ${selected.id}` })
    .click();
  evidence.phase = "live ERA5 archive";
  const archiveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().startsWith("https://archive-api.open-meteo.com/"),
    { timeout: 22000 },
  );
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  const archiveResponse = await archiveResponsePromise;
  const payload = await archiveResponse.json();
  evidence.archive = {
    url: archiveResponse.url(),
    status: archiveResponse.status(),
    requestModel: new URL(archiveResponse.url()).searchParams.get("models"),
    requestVariable: new URL(archiveResponse.url()).searchParams.get("daily"),
    returnedCoordinates: {
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    timezone: payload.timezone,
    timezoneAbbreviation: payload.timezone_abbreviation,
    utcOffsetSeconds: payload.utc_offset_seconds,
    units: payload.daily_units,
    days: payload.daily?.time?.length,
    firstDate: payload.daily?.time?.[0],
    lastDate: payload.daily?.time?.at(-1),
    rainCount: payload.daily?.rain_sum?.length,
    nullCount: payload.daily?.rain_sum?.filter((value) => value === null)
      .length,
    observedRainfallTotalMm: payload.daily?.rain_sum?.reduce(
      (sum, rain) => sum + rain,
      0,
    ),
    dailyPayloadSha256: createHash("sha256")
      .update(JSON.stringify(payload.daily))
      .digest("hex"),
    corsAllowOrigin:
      archiveResponse.headers()["access-control-allow-origin"] ?? null,
  };
  if (!archiveResponse.ok())
    throw new Error(`Live archive HTTP ${archiveResponse.status()}`);
  await page
    .getByTestId("dataset-classification")
    .filter({ hasText: "HISTORICAL REANALYSIS — ERA5" })
    .waitFor();
  await page.getByText("Your 365-day outlook").waitFor();
  await page.getByText("Inspect source & provenance", { exact: true }).click();
  await page.locator(".recharts-surface").first().waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.mouse.move(0, 0);
  evidence.activeDataset = await page.getByTestId("active-dataset").innerText();
  evidence.observedEstimatedOutputs = {
    used: await page.getByTestId("water-used").innerText(),
    coverage: await page.getByTestId("coverage").innerText(),
    overflow: await page.getByTestId("overflow").innerText(),
    finalStorage: await page.getByTestId("final-storage").innerText(),
  };
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/screenshots/build-02-live-edirne-1440.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "docs/screenshots/build-02-live-edirne-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.locator(".results-column").screenshot({
    path: "docs/screenshots/build-02-live-edirne-results.png",
    animations: "disabled",
  });
  evidence.browserErrors = errors;
  if (errors.length)
    throw new Error("Browser reported errors; inspect browserErrors.");
  evidence.status = "passed";
  evidence.phase = "complete";
  evidence.browserCorsVerified = true;
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.error = error instanceof Error ? error.message : String(error);
  if (page)
    evidence.uiError = await page
      .locator(".data-error")
      .allTextContents()
      .catch(() => []);
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/live-open-meteo.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  const stamp = evidence.verifiedAt.replace(/[^0-9TZ]/g, "");
  await writeFile(
    `docs/verification/live-open-meteo-${stamp}.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
}
