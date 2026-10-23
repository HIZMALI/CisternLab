/** One optional real-service browser run, separate from intercepted deterministic tests. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const origin = "http://127.0.0.1:4319";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4319",
    "--strictPort",
  ],
  { windowsHide: true, stdio: "pipe" },
);
const evidence = {
  kind: "LIVE SERVICE VERIFICATION — NOT MOCKED — BUILD 04",
  verifiedAt: new Date().toISOString(),
  status: "failed",
  phase: "owned preview startup",
  browserErrors: [],
  archives: [],
  attribution:
    "Open-Meteo / ERA5 / Copernicus; CC BY 4.0. CisternLab derives estimated tank outputs, not measured savings.",
};
let browser, page, snapshot;
const transfers = [];
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Owned preview did not start; build first and check port 4319.",
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
      reject(new Error(`Owned preview exited (${code}).`));
    });
  });
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => evidence.browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") evidence.browserErrors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    evidence.browserErrors.push(
      `${request.url()}: ${request.failure()?.errorText}`,
    ),
  );
  page.on("response", (response) => {
    if (!response.url().startsWith("https://archive-api.open-meteo.com/"))
      return;
    transfers.push(
      (async () => {
        const payload = await response.json(),
          params = new URL(response.url()).searchParams;
        const item = {
          year: Number(params.get("start_date").slice(0, 4)),
          url: response.url(),
          status: response.status(),
          model: params.get("models"),
          variable: params.get("daily"),
          requestedUnit: params.get("precipitation_unit"),
          requestedCoordinates: {
            latitude: Number(params.get("latitude")),
            longitude: Number(params.get("longitude")),
          },
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
          observedRainfallMm: payload.daily?.rain_sum?.reduce(
            (sum, n) => sum + n,
            0,
          ),
          responseSha256: createHash("sha256")
            .update(await response.body())
            .digest("hex"),
          dailyPayloadSha256: createHash("sha256")
            .update(JSON.stringify(payload.daily ?? null))
            .digest("hex"),
          corsAllowOrigin:
            response.headers()["access-control-allow-origin"] ?? null,
        };
        evidence.archives.push(item);
        if (
          !response.ok() ||
          item.model !== "era5" ||
          item.variable !== "rain_sum" ||
          item.requestedUnit !== "mm" ||
          item.units?.rain_sum !== "mm" ||
          item.days !== (item.year === 2024 ? 366 : 365) ||
          item.corsAllowOrigin !== "*"
        )
          throw new Error(`Live response validation failed for ${item.year}.`);
      })().then(
        () => null,
        (error) => String(error),
      ),
    );
  });
  await page.goto(origin + "/CisternLab/");
  evidence.phase = "live city selection";
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
  evidence.geocoding = {
    url: geoResponse.url(),
    status: geoResponse.status(),
    selected,
    corsAllowOrigin:
      geoResponse.headers()["access-control-allow-origin"] ?? null,
  };
  if (!selected || !geoResponse.ok())
    throw new Error("Live city search failed.");
  await page
    .locator(".location-results button")
    .filter({ hasText: `ID ${selected.id}` })
    .click();
  evidence.phase = "active 2025 annual dataset";
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
    { timeout: 22000 },
  );
  evidence.phase = "explicit three-year load";
  const lab = page.locator("#historical-variability");
  await lab
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect(lab.getByTestId("variability-context")).toBeVisible({
    timeout: 22000,
  });
  const failures = (await Promise.all(transfers)).filter(Boolean);
  if (failures.length) throw new Error(failures.join("; "));
  if (
    evidence.archives.length !== 3 ||
    new Set(evidence.archives.map((r) => r.year)).size !== 3
  )
    throw new Error(
      "Did not observe exactly three independent annual responses.",
    );
  evidence.archives.sort((a, b) => a.year - b.year);
  const downloadPromise = page.waitForEvent("download");
  await lab
    .getByRole("button", { name: "Export reproducibility JSON", exact: true })
    .click();
  const download = await downloadPromise;
  const { readFile } = await import("node:fs/promises");
  snapshot = await readFile(await download.path(), "utf8");
  const parsed = JSON.parse(snapshot);
  evidence.physicalInputs = parsed.inputs;
  evidence.decision = parsed.decision;
  evidence.currentAnnualResults = parsed.currentAnnualResults;
  evidence.variability = parsed.variability;
  evidence.snapshotSha256 = createHash("sha256").update(snapshot).digest("hex");
  await expect(
    lab.locator(".variability-chart .recharts-surface"),
  ).toBeVisible();
  await page.evaluate(() => globalThis.document.fonts.ready);
  await mkdir("docs/screenshots", { recursive: true });
  await lab.screenshot({
    path: "docs/screenshots/build-04-live-edirne-1440.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await lab.screenshot({
    path: "docs/screenshots/build-04-live-edirne-390.png",
    animations: "disabled",
  });
  if (evidence.browserErrors.length)
    throw new Error("Browser errors recorded.");
  evidence.status = "passed";
  evidence.phase = "complete";
  evidence.browserCorsVerified = true;
} catch (error) {
  evidence.error = error instanceof Error ? error.message : String(error);
  evidence.uiErrors = page
    ? await page
        .locator(".data-error")
        .allTextContents()
        .catch(() => [])
    : [];
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await mkdir("docs/verification", { recursive: true });
  const stamp = evidence.verifiedAt.replace(/[^0-9TZ]/g, "");
  const path = `docs/verification/build-04-live-${stamp}`;
  await writeFile(`${path}.json`, JSON.stringify(evidence, null, 2) + "\n");
  if (snapshot) await writeFile(`${path}-snapshot.json`, snapshot);
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        phase: evidence.phase,
        evidence: `${path}.json`,
        error: evidence.error,
      },
      null,
      2,
    ),
  );
}
