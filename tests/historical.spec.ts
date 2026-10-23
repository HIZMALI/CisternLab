import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { archiveFixture, edirne, namesakes } from "./fixtures";

async function mockServices(page: Page) {
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { results: [edirne] } }),
  );
  await page.route("https://archive-api.open-meteo.com/**", (route) => {
    const year = Number(
      new URL(route.request().url()).searchParams
        .get("start_date")!
        .slice(0, 4),
    );
    return route.fulfill({ json: archiveFixture(year) });
  });
}
async function chooseEdirne(page: Page) {
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await expect(page.getByLabel("Complete calendar year")).toHaveValue("2025");
  await expect(
    page.getByRole("button", { name: "Load rainfall data", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Search city worldwide").fill("Edirne");
  await page
    .locator(".location-results button")
    .filter({ hasText: "Republic of Türkiye" })
    .click();
}
async function loadEdirne(page: Page) {
  await chooseEdirne(page);
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
}

for (const width of [1440, 768, 390, 320]) {
  test(`mocked historical layout, source details and accessibility at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await mockServices(page);
    await page.goto("/");
    await loadEdirne(page);
    await expect(page.getByText("Your 365-day outlook")).toBeVisible();
    await page
      .getByText("Inspect source & provenance", { exact: true })
      .click();
    await expect(
      page.getByText(
        "2025-01-01 to 2025-12-31 · Europe/Istanbul · rain_sum (mm)",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      a11y.violations.map((v) => ({
        rule: v.id,
        elements: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `docs/screenshots/build-04-mocked-historical-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("Roof area", { exact: true }).fill("2000");
    await page.getByLabel("Daily demand", { exact: true }).fill("3000");
    await page.getByLabel("Tank capacity", { exact: true }).fill("20000");
    await page.getByLabel("Initial storage", { exact: true }).fill("20000");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("switches sources, years and locations explicitly; caches only validated coordinate/year loads", async ({
  page,
}) => {
  const archiveUrls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("archive-api")) archiveUrls.push(request.url());
  });
  await mockServices(page);
  await page.goto("/");
  await loadEdirne(page);
  expect(archiveUrls).toHaveLength(1);
  const url = new URL(archiveUrls[0]);
  expect(url.searchParams.get("daily")).toBe("rain_sum");
  expect(url.searchParams.get("models")).toBe("era5");
  const supplied = await page.getByTestId("water-used").innerText();
  await page.getByLabel("Roof area", { exact: true }).fill("0");
  await expect(page.getByTestId("water-used")).toHaveText("0 L");
  await page.getByLabel("Roof area", { exact: true }).fill("120");
  await expect(page.getByTestId("water-used")).toHaveText(supplied);
  expect(archiveUrls).toHaveLength(1);
  await page.getByLabel("Complete calendar year").selectOption("2024");
  await expect(page.getByTestId("active-dataset")).toContainText("2025");
  expect(archiveUrls).toHaveLength(1);
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByText("Your 366-day outlook")).toBeVisible();
  await page.getByRole("button", { name: "Explore all 366 days" }).click();
  await expect(page.locator(".daily-panel tbody tr")).toHaveCount(366);
  await expect(
    page.getByRole("rowheader", { name: "2024-02-29" }),
  ).toBeVisible();
  expect(archiveUrls).toHaveLength(2);
  await page.getByLabel("Complete calendar year").selectOption("2025");
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("active-dataset")).toContainText("2025");
  expect(archiveUrls).toHaveLength(2);
  await page
    .getByRole("button", { name: "Synthetic Demo", exact: true })
    .click();
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  await expect(page.getByTestId("overflow")).toHaveText("5,650 L");
  await expect(page.getByTestId("final-storage")).toHaveText("1,500 L");
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "DEMO DATA — SYNTHETIC",
  );
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "DEMO DATA — SYNTHETIC",
  );
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
  expect(archiveUrls).toHaveLength(2);
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: namesakes }),
  );
  await page.getByLabel("Search city worldwide").fill("Springfield");
  await expect(page.locator(".location-results button")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Load rainfall data", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".location-results button")
    .filter({ hasText: "Massachusetts" })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("active-dataset")).toContainText(
    "Springfield, Massachusetts",
  );
  expect(new URL(archiveUrls.at(-1)!).searchParams.get("longitude")).toBe(
    "-72.6",
  );
  await expect(
    page.locator('#historical-year option[value="2026"]'),
  ).toBeDisabled();
});

test("invalid year data preserves prior valid results and a manual retry can recover", async ({
  page,
}) => {
  await mockServices(page);
  await page.goto("/");
  await loadEdirne(page);
  const used = await page.getByTestId("water-used").innerText();
  const invalid = archiveFixture(2024);
  invalid.daily.rain_sum.pop();
  await page.route("https://archive-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: invalid }),
  );
  await page.getByLabel("Complete calendar year").selectOption("2024");
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Data-quality error");
  await expect(page.getByRole("alert")).toContainText(
    "No partial annual output",
  );
  await expect(page.getByTestId("active-dataset")).toContainText("2025");
  await expect(page.getByTestId("water-used")).toHaveText(used);
  await page.route("https://archive-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: archiveFixture(2024) }),
  );
  await page.getByRole("button", { name: "Retry rainfall data" }).click();
  await expect(page.getByText("Your 366-day outlook")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const failure of ["429", "500", "network", "invalid JSON"] as const) {
  test(`historical ${failure} failure is explicit and never replaces synthetic data`, async ({
    page,
  }) => {
    let calls = 0;
    await mockServices(page);
    await page.route("https://archive-api.open-meteo.com/**", (route) => {
      calls++;
      return failure === "network"
        ? route.abort("failed")
        : failure === "invalid JSON"
          ? route.fulfill({ body: "not json", contentType: "application/json" })
          : route.fulfill({ status: Number(failure), json: { error: true } });
    });
    await page.goto("/");
    await chooseEdirne(page);
    await page
      .getByRole("button", { name: "Load rainfall data", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      failure === "network"
        ? "Check your connection"
        : failure === "invalid JSON"
          ? "valid JSON"
          : `HTTP ${failure}`,
    );
    await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
    await expect(
      page.getByRole("button", { name: "Historical Reanalysis", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(calls).toBe(1);
  });
}

test("search has threshold, debounce, empty, error and retry states with no automatic selection", async ({
  page,
}) => {
  let searches = 0;
  await page.route("https://geocoding-api.open-meteo.com/**", (route) => {
    searches++;
    return route.fulfill({ json: { generationtime_ms: 0.1 } });
  });
  await page.goto("/");
  await page.clock.install();
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await page.getByLabel("Search city worldwide").fill("Ed");
  await page.clock.runFor(500);
  expect(searches).toBe(0);
  await page.getByLabel("Search city worldwide").fill("Edi");
  await page.clock.runFor(100);
  await page.getByLabel("Search city worldwide").fill("Edirne");
  await page.clock.runFor(351);
  await expect(
    page.getByText("No matching locations.", { exact: false }),
  ).toBeVisible();
  expect(searches).toBe(1);
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.getByLabel("Search city worldwide").fill("Berlin");
  await page.clock.runFor(351);
  await expect(page.getByRole("alert")).toContainText("HTTP 500");
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: namesakes }),
  );
  await page.getByRole("button", { name: "Retry location search" }).click();
  await page.clock.runFor(351);
  await expect(page.locator(".location-results button")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Load rainfall data", exact: true }),
  ).toBeDisabled();
});

test("obsolete search and historical downloads cannot overwrite newer selections or reset", async ({
  page,
}) => {
  let releaseSearch: () => void = () => {};
  const searchGate = new Promise<void>((resolve) => {
    releaseSearch = resolve;
  });
  let searchStarted: () => void = () => {};
  const searching = new Promise<void>((resolve) => {
    searchStarted = resolve;
  });
  await mockServices(page);
  await page.route("https://geocoding-api.open-meteo.com/**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("name") === "Oldcity") {
      searchStarted();
      await searchGate;
      await route.fulfill({ json: namesakes }).catch(() => {});
    } else await route.fulfill({ json: { results: [edirne] } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await page.getByLabel("Search city worldwide").fill("Oldcity");
  await searching;
  await page.getByLabel("Search city worldwide").fill("Edirne");
  await page
    .locator(".location-results button")
    .filter({ hasText: "Republic of Türkiye" })
    .click();
  releaseSearch();
  await expect(page.locator("#search-status")).toContainText(
    "Selected: Edirne",
  );
  let releaseLoad: () => void = () => {};
  const loadGate = new Promise<void>((resolve) => {
    releaseLoad = resolve;
  });
  let loadStarted: () => void = () => {};
  const loading = new Promise<void>((resolve) => {
    loadStarted = resolve;
  });
  await page.route("https://archive-api.open-meteo.com/**", async (route) => {
    loadStarted();
    await loadGate;
    await route.fulfill({ json: archiveFixture() }).catch(() => {});
  });
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await loading;
  await page
    .getByRole("button", { name: "Reset scenario to defaults" })
    .click();
  releaseLoad();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "DEMO DATA — SYNTHETIC",
  );
  await expect(
    page.getByRole("button", { name: "Synthetic Demo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
});

test("stalled archive requests time out once and recover only after manual retry", async ({
  page,
}) => {
  let calls = 0;
  let started: () => void = () => {};
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockServices(page);
  await page.route("https://archive-api.open-meteo.com/**", async (route) => {
    calls++;
    started();
    await gate;
    await route.fulfill({ json: archiveFixture() }).catch(() => {});
  });
  await page.goto("/");
  await chooseEdirne(page);
  await page.clock.install();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await requested;
  await page.clock.runFor(15001);
  await expect(page.getByRole("alert")).toContainText(
    "timed out after 15 seconds",
  );
  expect(calls).toBe(1);
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  release();
  await page.route("https://archive-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: archiveFixture() }),
  );
  await page.getByRole("button", { name: "Retry rainfall data" }).click();
  await expect(page.getByText("Your 365-day outlook")).toBeVisible();
});

test("changing year cancels an in-flight download and late data cannot replace the new year", async ({
  page,
}) => {
  let calls = 0;
  let started: () => void = () => {};
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockServices(page);
  await page.route("https://archive-api.open-meteo.com/**", async (route) => {
    calls++;
    const year = Number(
      new URL(route.request().url()).searchParams
        .get("start_date")!
        .slice(0, 4),
    );
    if (year === 2025) {
      started();
      await gate;
    }
    await route.fulfill({ json: archiveFixture(year) }).catch(() => {});
  });
  await page.goto("/");
  await chooseEdirne(page);
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await requested;
  await page.getByLabel("Complete calendar year").selectOption("2024");
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByText("Your 366-day outlook")).toBeVisible();
  release();
  await expect(page.getByTestId("active-dataset")).toContainText("2024");
  expect(calls).toBe(2);
});

test("historical CSV contains dated full-year records and provenance", async ({
  page,
}) => {
  await mockServices(page);
  await page.goto("/");
  await loadEdirne(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("cisternlab-era5-747712-2025.csv");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  for (const value of [
    "HISTORICAL REANALYSIS — ERA5 MODEL",
    "ESTIMATED RESULT",
    "rain_sum",
    "Europe/Istanbul",
    "41.67719",
    "41.75",
    "2025-01-01",
    "2025-12-31",
    "CC BY 4.0",
    "not measured savings",
  ])
    expect(csv).toContain(value);
  expect(
    csv.split("\r\n").filter((row) => /^"2025-\d{2}-\d{2}",/.test(row)),
  ).toHaveLength(365);
});
