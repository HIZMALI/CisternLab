import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { archiveFixture, edirne } from "./fixtures";
import { readFile } from "node:fs/promises";

const lab = (page: Page) => page.locator("#historical-variability");
const yearOf = (route: Route) =>
  Number(
    new URL(route.request().url()).searchParams.get("start_date")!.slice(0, 4),
  );
async function mock(page: Page, archive?: (route: Route) => Promise<void>) {
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({
      json: {
        results: [
          edirne,
          { ...edirne, id: 999, name: "Other city", latitude: 40 },
        ],
      },
    }),
  );
  await page.route(
    "https://archive-api.open-meteo.com/**",
    archive ??
      ((route) => route.fulfill({ json: archiveFixture(yearOf(route)) })),
  );
}
async function activeHistorical(page: Page) {
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await page.getByLabel("Search city worldwide").fill("Edirne");
  await page
    .locator(".location-results button")
    .filter({ hasText: "ID 747712" })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
}
async function compare(page: Page) {
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect(lab(page).getByTestId("variability-context")).toBeVisible();
}
async function downloaded(page: Page, name: string) {
  const promise = page.waitForEvent("download");
  await lab(page).getByRole("button", { name, exact: true }).click();
  const download = await promise;
  return {
    name: download.suggestedFilename(),
    text: await readFile((await download.path())!, "utf8"),
  };
}

test("synthetic entry makes no weather requests and routes keyboard users to historical selection", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("open-meteo.com")) requests.push(r.url());
  });
  await page.goto("/");
  await expect(lab(page)).toContainText(
    "Synthetic examples have no real location",
  );
  const button = lab(page).getByRole("button", {
    name: "Choose historical data",
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search city worldwide")).toBeFocused();
  expect(requests).toEqual([]);
  await expect(lab(page).getByTestId("three-year-capacity")).toHaveCount(0);
});

test("loads only on explicit action, reuses active/cache years and ignores pending selections", async ({
  page,
}) => {
  const calls: number[] = [];
  await mock(page, async (route) => {
    calls.push(yearOf(route));
    await route.fulfill({ json: archiveFixture(yearOf(route)) });
  });
  await page.goto("/");
  await activeHistorical(page);
  expect(calls).toEqual([2025]);
  await page.getByLabel("Complete calendar year").selectOption("2024");
  await page.getByLabel("Search city worldwide").fill("Other");
  await page
    .locator(".location-results button")
    .filter({ hasText: "ID 999" })
    .click();
  await compare(page);
  expect(calls.sort()).toEqual([2023, 2024, 2025]);
  await expect(lab(page).getByTestId("variability-context")).toContainText(
    "Edirne",
  );
  await expect(lab(page).getByTestId("variability-context")).not.toContainText(
    "Other city",
  );
  await expect(
    lab(page).getByRole("list", { name: "Annual loading progress" }),
  ).toContainText("active dataset");
  await lab(page)
    .getByRole("button", { name: "Reload three-year comparison" })
    .click();
  await expect(
    lab(page).getByText("validated cache", { exact: false }),
  ).toHaveCount(2);
  expect(calls).toHaveLength(3);
  await lab(page)
    .getByText("Inspect all three original source records", { exact: true })
    .click();
  await expect(
    lab(page).getByRole("heading", { name: "2024 · 366 validated dates" }),
  ).toBeVisible();
  await expect(lab(page)).toContainText("2024-01-01 to 2024-12-31");
});

test("shows annual and cross-year decisions, all targets and exact chart-equivalent rows", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await activeHistorical(page);
  await compare(page);
  for (const year of [2023, 2024, 2025]) {
    await expect(lab(page).getByTestId(`annual-${year}`)).toContainText(
      `${year === 2024 ? 366 : 365} days`,
    );
    await expect(
      lab(page).getByTestId(`annual-recommendation-${year}`),
    ).toHaveText(/\d.* L/);
  }
  await expect(lab(page).getByTestId("three-year-capacity")).toHaveText(
    /\d.* L/,
  );
  for (const target of [80, 90, 95, 98]) {
    await lab(page)
      .getByRole("radio", { name: `${target}%`, exact: true })
      .check();
    await expect(
      lab(page).getByRole("article", { name: "Three-year capacity decision" }),
    ).toContainText(`${target}%`);
  }
  await lab(page).locator(".variability-candidates > summary").click();
  await expect(
    lab(page).locator(".variability-candidates tbody tr"),
  ).toHaveCount(33);
  await expect(
    lab(page).locator(".variability-chart .recharts-line"),
  ).toHaveCount(3);
  const json = JSON.parse(
    (await downloaded(page, "Export reproducibility JSON")).text,
  );
  for (const year of json.annualResults)
    for (const c of year.candidates) {
      await expect(
        lab(page)
          .getByTestId(`historical-row-${year.year}-${c.capacityL}`)
          .locator("td")
          .nth(1),
      ).toHaveText(String(c.supplyL));
    }
});

test("scenario edits and target changes recalculate locally with independent empty starts", async ({
  page,
}) => {
  let calls = 0;
  await mock(page, async (route) => {
    calls++;
    await route.fulfill({ json: archiveFixture(yearOf(route)) });
  });
  await page.goto("/");
  await activeHistorical(page);
  await compare(page);
  const original = (await lab(page).getByTestId("annual-2023").textContent())!;
  await page.getByLabel("Initial storage", { exact: true }).fill("500");
  await expect(lab(page).getByTestId("annual-2023")).toHaveText(original);
  await page.getByLabel("Roof area", { exact: true }).fill("150");
  await expect(lab(page).getByTestId("annual-2023")).not.toHaveText(original);
  await page.getByLabel("Collection efficiency", { exact: true }).fill("85");
  await page.getByLabel("Daily demand", { exact: true }).fill("300");
  await page.getByLabel("Tank capacity", { exact: true }).fill("1234.5");
  await lab(page).getByRole("radio", { name: "95%", exact: true }).check();
  await expect(lab(page).getByTestId("variability-context")).toContainText(
    "1,234.5 L",
  );
  expect(calls).toBe(3);
  const raw = JSON.parse(
    (await downloaded(page, "Export reproducibility JSON")).text,
  );
  expect(raw.inputs).toEqual({
    roofAreaM2: 150,
    collectionEfficiency: 0.85,
    dailyDemandL: 300,
    currentTankCapacityL: 1234.5,
  });
  expect(raw.assumptions.initialStorageEachYearL).toBe(0);
  expect(raw.standardCapacitiesL).not.toContain(1234.5);
  expect(raw.targetPercent).toBe(95);
  await expect(page.getByLabel("Initial storage", { exact: true })).toHaveValue(
    "500",
  );
});

test("rejects a partial year atomically and recovers only on manual retry", async ({
  page,
}) => {
  let invalid = true,
    calls = 0;
  await mock(page, async (route) => {
    const year = yearOf(route),
      f = archiveFixture(year);
    calls++;
    if (year === 2024 && invalid) f.daily.time.splice(59, 1);
    await route.fulfill({ json: f });
  });
  await page.goto("/");
  await activeHistorical(page);
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect(lab(page).getByRole("alert")).toContainText("366");
  await expect(lab(page).getByTestId("variability-context")).toHaveCount(0);
  const before = calls;
  await page.waitForTimeout(450);
  expect(calls).toBe(before);
  invalid = false;
  await lab(page)
    .getByRole("button", { name: "Retry three-year comparison" })
    .click();
  await expect(lab(page).getByTestId("variability-context")).toBeVisible();
});

test("HTTP failure retains an explicitly identified old-location comparison", async ({
  page,
}) => {
  let fail = false;
  await mock(page, async (route) => {
    const url = new URL(route.request().url()),
      year = yearOf(route);
    if (fail && url.searchParams.get("latitude") === "40" && year === 2023)
      await route.fulfill({ status: 429, body: "rate limit" });
    else await route.fulfill({ json: archiveFixture(year) });
  });
  await page.goto("/");
  await activeHistorical(page);
  await compare(page);
  await page.getByLabel("Search city worldwide").fill("Other");
  await page
    .locator(".location-results button")
    .filter({ hasText: "ID 999" })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("active-dataset")).toContainText("Other city");
  await expect(lab(page).getByTestId("variability-context")).toContainText(
    "Previous comparison location",
  );
  fail = true;
  await lab(page)
    .getByRole("button", { name: "Reload three-year comparison" })
    .click();
  await expect(lab(page).getByRole("alert")).toContainText("429");
  await expect(lab(page).getByRole("alert")).toContainText(
    "Previous valid comparison retained: Edirne",
  );
  await expect(lab(page).getByTestId("variability-context")).toContainText(
    "Edirne",
  );
});

test("grid mismatch blocks combination and reports the differing coordinates", async ({
  page,
}) => {
  await mock(page, async (route) => {
    const y = yearOf(route),
      f = archiveFixture(y);
    if (y === 2024) f.latitude = 42;
    await route.fulfill({ json: f });
  });
  await page.goto("/");
  await activeHistorical(page);
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect(lab(page).getByRole("alert")).toContainText(
    "ERA5 grid mismatch",
  );
  await expect(lab(page).getByRole("alert")).toContainText("42");
  await expect(lab(page).getByTestId("three-year-capacity")).toHaveCount(0);
});

test("source switching cancels stale responses without a partial comparison", async ({
  page,
}) => {
  const releases: (() => void)[] = [];
  let delay = true;
  await mock(page, async (route) => {
    const year = yearOf(route);
    if (year !== 2025 && delay)
      await new Promise<void>((resolve) => releases.push(resolve));
    await route.fulfill({ json: archiveFixture(year) }).catch(() => {});
  });
  await page.goto("/");
  await activeHistorical(page);
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect.poll(() => releases.length).toBe(2);
  await page
    .getByRole("button", { name: "Synthetic Demo", exact: true })
    .click();
  releases.forEach((r) => r());
  await expect(lab(page)).toContainText("Begin with a historical location");
  await expect(lab(page).getByTestId("variability-context")).toHaveCount(0);
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  delay = false;
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
  await expect(
    lab(page).getByRole("button", {
      name: "Load three-year comparison",
      exact: true,
    }),
  ).toBeEnabled();
  await compare(page);
});

test("a newly activated historical location supersedes an unfinished batch", async ({
  page,
}) => {
  const releases: (() => void)[] = [];
  await mock(page, async (route) => {
    const url = new URL(route.request().url()),
      year = yearOf(route);
    if (url.searchParams.get("latitude") !== "40" && year !== 2025)
      await new Promise<void>((resolve) => releases.push(resolve));
    await route.fulfill({ json: archiveFixture(year) }).catch(() => {});
  });
  await page.goto("/");
  await activeHistorical(page);
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect.poll(() => releases.length).toBe(2);
  await page.getByLabel("Search city worldwide").fill("Other");
  await page
    .locator(".location-results button")
    .filter({ hasText: "ID 999" })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("active-dataset")).toContainText("Other city");
  releases.forEach((resolve) => resolve());
  await compare(page);
  await expect(lab(page).getByTestId("variability-context")).toContainText(
    "Other city",
  );
  const raw = JSON.parse(
    (await downloaded(page, "Export reproducibility JSON")).text,
  );
  expect(
    raw.datasets.every(
      (d: { location: { id: number } }) => d.location.id === 999,
    ),
  ).toBe(true);
});

test("manual cancellation stops pending batch and leaves the active dashboard intact", async ({
  page,
}) => {
  const releases: (() => void)[] = [];
  await mock(page, async (route) => {
    const year = yearOf(route);
    if (year !== 2025)
      await new Promise<void>((resolve) => releases.push(resolve));
    await route.fulfill({ json: archiveFixture(year) }).catch(() => {});
  });
  await page.goto("/");
  await activeHistorical(page);
  await lab(page)
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect.poll(() => releases.length).toBe(2);
  await lab(page)
    .getByRole("button", { name: "Cancel comparison load" })
    .click();
  releases.forEach((r) => r());
  await expect(lab(page)).toContainText("Comparison load cancelled");
  await expect(lab(page).getByTestId("variability-context")).toHaveCount(0);
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
});

test("zero demand and one zero-yield year explain why comparison recommendation is undefined", async ({
  page,
}) => {
  await mock(page, async (route) => {
    const y = yearOf(route),
      f = archiveFixture(y);
    if (y === 2024) f.daily.rain_sum.fill(0);
    await route.fulfill({ json: f });
  });
  await page.goto("/");
  await activeHistorical(page);
  await compare(page);
  await expect(lab(page).getByTestId("three-year-capacity")).toHaveText("—");
  await expect(
    lab(page).getByRole("article", { name: "Three-year capacity decision" }),
  ).toContainText("2024: The active period has zero rainfall");
  await expect(lab(page).getByTestId("annual-recommendation-2023")).toHaveText(
    /\d.* L/,
  );
  await page.getByLabel("Daily demand", { exact: true }).fill("0");
  await expect(lab(page).getByTestId("annual-2023")).toContainText(
    "Undefined (zero demand)",
  );
  await expect(
    lab(page).getByRole("article", { name: "Three-year capacity decision" }),
  ).toContainText("Daily demand is zero");
});

test("CSV and JSON download preserve provenance, independent starts and 1096 dated daily values", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await activeHistorical(page);
  await compare(page);
  const csv = await downloaded(page, "Export historical comparison CSV");
  expect(csv.name).toBe("cisternlab-historical-747712-2023-2025-90.csv");
  expect(csv.text.trim().split("\r\n")).toHaveLength(34);
  expect(csv.text).toContain('"shortage_days"');
  expect(csv.text).toContain('"ERA5"');
  expect(csv.text).toContain("CC BY 4.0");
  const json = await downloaded(page, "Export reproducibility JSON"),
    raw = JSON.parse(json.text);
  expect(raw.schemaVersion).toBe("cisternlab.historical-comparison.v1");
  expect(
    raw.datasets.map((y: { rainfallMm: number[] }) => y.rainfallMm.length),
  ).toEqual([365, 366, 365]);
  expect(raw.datasets[1].dates[59]).toBe("2024-02-29");
  expect(raw.datasets[0].sourceUrl).toContain("models=era5");
  expect(raw.assumptions.carryoverBetweenYears).toBe(false);
  expect(raw.annualResults).toHaveLength(3);
  expect((await downloaded(page, "Export reproducibility JSON")).text).toBe(
    json.text,
  );
});

for (const width of [1440, 768, 390, 320]) {
  test(`historical variability layout, navigation, keyboard and WCAG 2.1 A/AA at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await mock(page);
    await page.goto("/");
    await activeHistorical(page);
    await compare(page);
    if (width <= 600)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("link", { name: "Historical Variability Lab", exact: true })
      .click();
    await expect(page).toHaveURL(/#historical-variability$/);
    await expect(
      lab(page).locator(".variability-chart .recharts-surface"),
    ).toBeVisible();
    const radio = lab(page).getByRole("radio", { name: "90%", exact: true });
    await radio.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      lab(page).getByRole("radio", { name: "95%", exact: true }),
    ).toBeChecked();
    await lab(page).locator(".variability-candidates > summary").click();
    const region = lab(page).getByRole("region", {
      name: "Historical candidate comparison",
      exact: true,
    });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((e) => e.scrollLeft))
      .toBeGreaterThan(0);
    await lab(page).locator(".variability-provenance > summary").click();
    await lab(page).locator(".variability-methodology > summary").click();
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
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await lab(page).locator(".variability-provenance > summary").click();
    await lab(page).locator(".variability-methodology > summary").click();
    await lab(page).locator(".variability-candidates > summary").click();
    await page.mouse.move(0, 0);
    await lab(page).screenshot({
      path: `docs/screenshots/build-05-variability-mocked-${width}.png`,
      animations: "disabled",
    });
    await page.screenshot({
      path: `docs/screenshots/build-05-page-mocked-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}
