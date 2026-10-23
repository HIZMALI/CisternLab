import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { archiveFixture, edirne } from "./fixtures";

const studio = (page: Page) => page.locator("#impact-evidence");
async function archived(page: Page) {
  await expect(studio(page).getByText(/Archive verified: 1,096/)).toBeVisible();
  await studio(page)
    .getByRole("button", {
      name: "Explore Archived Edirne Example",
      exact: true,
    })
    .click();
  await expect(studio(page).getByTestId("impact-context")).toContainText(
    "ARCHIVED HISTORICAL REANALYSIS — ERA5",
  );
}
async function mockWeather(page: Page) {
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

test("navigates to the studio, reproduces archived values and keeps the dashboard intact without Open-Meteo", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("open-meteo.com")) calls.push(r.url());
  });
  await page.goto("./");
  await page
    .getByRole("link", { name: "Impact & Evidence", exact: true })
    .click();
  await expect(page).toHaveURL(/#impact-evidence$/);
  await archived(page);
  await expect(studio(page).getByTestId("impact-recommendation")).toHaveText(
    "3,000 L",
  );
  for (const [year, supply] of [
    [2023, "39,030.8"],
    [2024, "41,299.2"],
    [2025, "34,261.6"],
  ] as const) {
    await expect(
      studio(page)
        .getByTestId(`impact-row-${year}-Current`)
        .locator("td")
        .nth(1),
    ).toHaveText(supply);
  }
  await expect(studio(page).getByTestId("impact-period-2025")).toContainText(
    "36,144",
  );
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  await expect(page.getByLabel("Tank capacity", { exact: true })).toHaveValue(
    "2000",
  );
  expect(calls).toEqual([]);
});

test("archived data and chart remain usable with the browser offline after assets are prepared", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(studio(page).getByText(/Archive verified: 1,096/)).toBeVisible();
  await expect(
    studio(page).locator(".impact-evidence-chart .recharts-surface"),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  await archived(page);
  await studio(page)
    .getByLabel("Alternative standard tank")
    .selectOption("2000");
  await expect(studio(page).getByTestId("impact-period-2025")).toContainText(
    "34,261.6",
  );
  expect(errors).toEqual([]);
});

test("shows the baseline, signed alternative changes, percentage points and no refetch on edits", async ({
  page,
}) => {
  let localArchiveLoads = 0;
  page.on("request", (r) => {
    if (r.url().includes("archived-edirne.snapshot")) localArchiveLoads++;
  });
  await page.goto("./");
  await archived(page);
  await expect(
    studio(page)
      .getByTestId("impact-row-2025-No-harvesting")
      .locator("td")
      .nth(1),
  ).toHaveText("0");
  await expect(
    studio(page)
      .getByTestId("impact-row-2025-No-harvesting")
      .locator("td")
      .nth(5),
  ).toHaveText("91,250");
  await studio(page)
    .getByLabel("Alternative standard tank")
    .selectOption("1000");
  await expect(studio(page).locator(".impact-differences")).toContainText(
    "−6,256 L",
  );
  await expect(studio(page).locator(".impact-differences")).toContainText(
    "percentage points",
  );
  await studio(page)
    .getByLabel("Alternative standard tank")
    .selectOption("5000");
  await studio(page).getByLabel("Impact supply target").selectOption("95");
  await studio(page).getByLabel("Archive roof area (m²)").fill("150");
  await studio(page).getByLabel("Archive current tank (L)").fill("1234.5");
  expect(localArchiveLoads).toBe(1);
  await expect(page.getByLabel("Roof area", { exact: true })).toHaveValue(
    "120",
  );
  await expect(page.getByLabel("Tank capacity", { exact: true })).toHaveValue(
    "2000",
  );
});

test("shows complete archive source records, original hash, classification and downloadable original bytes", async ({
  page,
}) => {
  await page.goto("./");
  await archived(page);
  await studio(page).locator(".impact-provenance > summary").click();
  const records = studio(page).locator(".impact-provenance");
  for (const s of [
    "2024 · 366 complete daily records",
    "rain_sum",
    "41.67719",
    "41.75",
    "2026-10-23",
    "2aee94b5a369acf8164bbb1e9d7265c8b89f5eba0a2a8719fe4a132c5e7197d7",
  ])
    await expect(records).toContainText(s);
  const promise = page.waitForEvent("download");
  await studio(page)
    .getByRole("button", { name: "Download original archived snapshot" })
    .click();
  const download = await promise,
    bytes = await readFile((await download.path())!);
  expect(
    bytes.equals(
      await readFile("docs/data/edirne-era5-2023-2025.snapshot.json"),
    ),
  ).toBe(true);
  await expect(studio(page).locator(".impact-conditional")).toContainText(
    "ONLY IF",
  );
});

test("uses active historical data and a validated three-year handoff without changing its identity", async ({
  page,
}) => {
  await mockWeather(page);
  await page.goto("./");
  await activeHistorical(page);
  await expect(studio(page).getByTestId("impact-context")).toContainText(
    "2025-01-01 to 2025-12-31",
  );
  await expect(studio(page).getByTestId("impact-context")).not.toContainText(
    "ARCHIVED",
  );
  await page
    .locator("#historical-variability")
    .getByRole("button", { name: "Load three-year comparison", exact: true })
    .click();
  await expect(
    studio(page).getByRole("button", {
      name: "Use loaded three-year comparison",
    }),
  ).toBeEnabled();
  await studio(page)
    .getByRole("button", { name: "Use loaded three-year comparison" })
    .click();
  await expect(studio(page).locator(".impact-annual-card")).toHaveCount(3);
  await expect(studio(page).getByTestId("impact-period-2024")).toContainText(
    "366 days",
  );
  await archived(page);
  await expect(page.getByTestId("dataset-classification")).toHaveText(
    "HISTORICAL REANALYSIS — ERA5",
  );
  await studio(page)
    .getByRole("button", { name: "Use active dashboard data" })
    .click();
  await expect(studio(page).getByTestId("impact-context")).toContainText(
    "2025-01-01 to 2025-12-31",
  );
});

test("walkthrough Back Next Exit is keyboard-operable and preserves the selected analysis", async ({
  page,
}) => {
  await page.goto("./");
  await archived(page);
  await studio(page)
    .getByLabel("Alternative standard tank")
    .selectOption("5000");
  const launch = studio(page).getByRole("button", {
    name: "Start evidence walkthrough",
  });
  await launch.focus();
  await page.keyboard.press("Enter");
  await expect(
    studio(page).getByRole("heading", { name: "1. THE PROBLEM", exact: true }),
  ).toBeFocused();
  await expect(
    studio(page).getByRole("button", { name: "Back", exact: true }),
  ).toBeDisabled();
  const next = studio(page).getByRole("button", { name: "Next", exact: true });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    studio(page).getByRole("heading", { name: "2. THE DATA", exact: true }),
  ).toBeFocused();
  await expect(studio(page).locator(".walkthrough-content")).toContainText(
    "1,096 original values",
  );
  await next.click();
  await expect(studio(page).locator(".walkthrough-content")).toContainText(
    "3,000 L",
  );
  await next.click();
  await expect(next).toBeDisabled();
  await expect(studio(page).locator(".walkthrough-content")).toContainText(
    "sum of three independent annual",
  );
  await studio(page).getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    studio(page).getByRole("heading", { name: "3. THE DECISION", exact: true }),
  ).toBeFocused();
  await studio(page).getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(launch).toBeFocused();
  await expect(
    studio(page).getByLabel("Alternative standard tank"),
  ).toHaveValue("5000");
});

test("copies findings with source, units, periods, assumption and caveats", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await archived(page);
  await studio(page)
    .getByRole("button", { name: "Copy Key Findings", exact: true })
    .click();
  await expect(
    studio(page).getByText(/Key findings copied with source/),
  ).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  for (const value of [
    "ARCHIVED HISTORICAL REANALYSIS",
    "2023–2025",
    "120 m²",
    "0 L starting storage",
    "3,000 L",
    "m³",
    "percentage points",
    "ONLY IF",
    "not measured savings",
    "SHA-256",
  ])
    expect(text).toContain(value);
});

test("zero-demand, zero-collection and zero-capacity states never invent impact", async ({
  page,
}) => {
  await page.goto("./");
  await archived(page);
  await studio(page).getByLabel("Archive daily demand (L/day)").fill("0");
  await expect(studio(page).getByTestId("impact-recommendation")).toHaveText(
    "No meaningful recommendation",
  );
  await expect(studio(page).getByTestId("impact-period-2023")).toContainText(
    "Undefined (zero demand)",
  );
  await studio(page).getByLabel("Archive daily demand (L/day)").fill("250");
  await studio(page).getByLabel("Archive roof area (m²)").fill("0");
  await expect(studio(page).getByTestId("impact-recommendation")).toHaveText(
    "No meaningful recommendation",
  );
  await studio(page)
    .getByRole("button", { name: "Reset archived reference inputs" })
    .click();
  await studio(page).getByLabel("Archive current tank (L)").fill("0");
  await studio(page).getByLabel("Alternative standard tank").selectOption("0");
  await expect(studio(page).getByTestId("impact-period-2025")).toContainText(
    "0 L",
  );
  await expect(studio(page)).not.toContainText(/NaN|Infinity/);
});

for (const failure of ["missing", "malformed", "corrupted"]) {
  test(`rejects ${failure} local archive and preserves the active analysis`, async ({
    page,
  }) => {
    let fail = true;
    await page.route(
      "**/assets/archived-edirne.snapshot*.json",
      async (route) => {
        if (fail)
          await route.fulfill({
            status: failure === "missing" ? 404 : 200,
            contentType: "application/json",
            body:
              failure === "malformed"
                ? "{broken"
                : JSON.stringify({ schemaVersion: "wrong" }),
          });
        else
          await route.fulfill({
            contentType: "application/json",
            body: await readFile("src/assets/archived-edirne.snapshot.json"),
          });
      },
    );
    await page.goto("./");
    await expect(studio(page).getByRole("alert")).toContainText(
      "Archived example unavailable",
    );
    await expect(studio(page).getByTestId("impact-context")).toContainText(
      "DEMO DATA",
    );
    await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
    fail = false;
    await studio(page)
      .getByRole("button", { name: "Retry archived evidence" })
      .click();
    await expect(studio(page).getByTestId("impact-context")).toContainText(
      "ARCHIVED HISTORICAL REANALYSIS",
    );
  });
}

test("browser print exposes only a complete evidence brief and generates readable PDF evidence", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printRequested = "true";
    };
  });
  await page.goto("./");
  await archived(page);
  await studio(page)
    .getByRole("button", { name: "Print / Save Evidence Brief", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-requested",
    "true",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#root")).toBeHidden();
  const brief = page.locator("body > .impact-print-root");
  await expect(brief).toBeVisible();
  for (const text of [
    "Impact Evidence Brief",
    "2023",
    "2024",
    "2025",
    "ONLY IF",
    "Recommended tested",
    "Original and browser-copy SHA-256",
    "CC BY 4.0",
    "3,000",
  ])
    await expect(brief).toContainText(text);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: "test-results/evidence/impact-brief.pdf",
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate:
      '<div style="width:100%;font-size:8px;text-align:center;color:#53614f">CisternLab - Estimated evidence - <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
});

for (const width of [1440, 768, 390, 320]) {
  test(`impact archive layout, charts, tables and WCAG 2.1 A/AA at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto("./");
    await archived(page);
    if (width <= 600)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("link", { name: "Impact & Evidence", exact: true })
      .click();
    await expect(
      studio(page).locator(".impact-evidence-chart .recharts-surface"),
    ).toBeVisible();
    await studio(page).locator(".impact-provenance > summary").click();
    await studio(page).locator(".impact-methodology > summary").click();
    await studio(page)
      .getByRole("button", { name: "Start evidence walkthrough" })
      .click();
    await studio(page)
      .getByRole("button", { name: "Next", exact: true })
      .click();
    const region = studio(page).getByRole("region", {
      name: "Impact capacity comparison",
      exact: true,
    });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((e) => e.scrollLeft))
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await studio(page)
      .getByRole("button", { name: "Exit walkthrough" })
      .click();
    await studio(page).locator(".impact-provenance > summary").click();
    await studio(page).locator(".impact-methodology > summary").click();
    await page.mouse.move(0, 0);
    await studio(page).screenshot({
      path: `test-results/screenshots/impact-archive-${width}.png`,
      animations: "disabled",
    });
    await studio(page)
      .locator(".impact-annual-cards")
      .screenshot({
        path: `test-results/screenshots/impact-cards-${width}.png`,
        animations: "disabled",
      });
    expect(errors).toEqual([]);
  });
}
