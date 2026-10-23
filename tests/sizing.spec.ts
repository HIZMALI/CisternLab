import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { archiveFixture, edirne } from "./fixtures";

async function openLab(page: Page, mobile = false) {
  await expect(
    page.getByRole("heading", { name: "Tank Sizing & Decision Lab" }),
  ).toBeAttached();
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Tank Sizing", exact: true }).click();
  await expect(page).toHaveURL(/#tank-sizing$/);
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

for (const width of [1440, 768, 390, 320]) {
  test(`sizing lab layout, chart, scrolling table and accessibility at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto("/");
    await openLab(page, width <= 600);
    await expect(page.getByTestId("sizing-recommendation")).toHaveText(
      "1,000 L",
    );
    await expect(page.locator(".sizing-chart .recharts-surface")).toBeVisible();
    for (const selector of [
      ".sizing-analysis",
      ".sizing-decision-grid",
      ".sizing-chart-panel",
      ".sizing-table-panel",
      ".sizing-comparison",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const tableRegion = page.getByRole("region", {
      name: "Scrollable tank capacity comparison",
      exact: true,
    });
    if (width <= 768)
      expect(
        await tableRegion.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
    await expect(page.locator(".sizing-table tbody tr")).toHaveCount(11);
    await page.locator(".sizing-methodology > summary").click();
    const a11y = await new AxeBuilder({ page })
      .include("#tank-sizing")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      a11y.violations.map((v) => ({
        rule: v.id,
        elements: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.locator(".sizing-methodology > summary").click();
    await page.mouse.move(0, 0);
    await page.locator("#tank-sizing").screenshot({
      path: `docs/screenshots/build-05-sizing-${width}.png`,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}

test("all target choices update locally and preserve original dashboard defaults", async ({
  page,
}) => {
  await page.goto("/");
  await openLab(page);
  await expect(page.getByTestId("sizing-maximum")).toHaveText("7,250 L");
  for (const [target, supply] of [
    [80, "5,800 L"],
    [90, "6,525 L"],
    [95, "6,887.5 L"],
    [98, "7,105 L"],
  ] as const) {
    await page.getByRole("radio", { name: `${target}%`, exact: true }).check();
    await expect(page.getByTestId("sizing-target-supply")).toHaveText(supply);
    await expect(page.getByTestId("sizing-recommendation")).toHaveText(
      "1,000 L",
    );
    await expect(page.getByTestId("sizing-recommended-supply")).toHaveText(
      "7,250 L",
    );
  }
  await expect(page.getByLabel("Tank capacity", { exact: true })).toHaveValue(
    "2000",
  );
  await expect(page.getByLabel("Initial storage", { exact: true })).toHaveValue(
    "0",
  );
  await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
  await expect(page.getByTestId("overflow")).toHaveText("5,650 L");
  await expect(page.getByTestId("final-storage")).toHaveText("1,500 L");
});

test("current-only sizes stay separate, signed differences remain accurate, and already-recommended is explicit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Tank capacity", { exact: true }).fill("1234.5");
  await expect(page.locator(".sizing-table tbody tr")).toHaveCount(12);
  await expect(page.getByTestId("sizing-row-1234.5")).toContainText(
    "CURRENT ONLY",
  );
  await expect(page.getByTestId("sizing-row-2000")).toContainText("vs 1,000 L");
  await expect(page.getByTestId("sizing-recommendation")).toHaveText("1,000 L");
  await expect(page.getByTestId("sizing-maximum")).toHaveText("7,250 L");
  await page.getByLabel("Tank capacity", { exact: true }).fill("1000");
  await expect(page.locator(".sizing-table tbody tr")).toHaveCount(11);
  await expect(page.getByTestId("sizing-current-message")).toHaveText(
    "Your current capacity is already the recommended standard candidate.",
  );
  await page.getByLabel("Tank capacity", { exact: true }).fill("20000");
  await page.getByLabel("Daily demand", { exact: true }).fill("1000");
  await page.getByRole("radio", { name: "80%", exact: true }).check();
  await expect(page.getByTestId("sizing-recommendation")).toHaveText("2,000 L");
  await expect(page.getByTestId("sizing-supply-change")).toHaveText("−112 L");
  const overflow = page.locator(".sizing-difference-table tbody tr").filter({
    has: page.getByRole("rowheader", { name: "Overflow", exact: true }),
  });
  await expect(overflow.locator("td").last()).toHaveText("+112 L");
});

test("dashboard initial water changes its own results but never advantages sizing candidates", async ({
  page,
}) => {
  await page.goto("/");
  const initialLab = await page
    .getByTestId("sizing-recommended-supply")
    .innerText();
  await page.getByLabel("Initial storage", { exact: true }).fill("500");
  await expect(page.getByRole("note")).toContainText(
    "Tank sizing comparisons assume all tanks start empty. Results may differ from the current simulation when its initial storage is not zero.",
  );
  await expect(page.getByTestId("sizing-recommended-supply")).toHaveText(
    initialLab,
  );
  await expect(page.getByTestId("water-used")).toHaveText("7,500 L");
  await page.getByRole("radio", { name: "95%", exact: true }).check();
  await expect(page.getByLabel("Initial storage", { exact: true })).toHaveValue(
    "500",
  );
  await expect(
    page.getByTestId("sizing-row-2000").locator('[data-column="supply"]'),
  ).toHaveText("7,250");
});

test("zero-benefit cases explain why no recommendation is available and never show NaN", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Roof area", { exact: true }).fill("0");
  await expect(page.getByTestId("sizing-no-benefit")).toHaveText(
    "No meaningful tank-size recommendation is available under the current scenario.",
  );
  await expect(page.locator(".sizing-recommendation")).toContainText(
    "Roof area is zero",
  );
  await page.getByLabel("Roof area", { exact: true }).fill("120");
  await page.getByLabel("Collection efficiency", { exact: true }).fill("0");
  await expect(page.locator(".sizing-recommendation")).toContainText(
    "Collection efficiency is zero",
  );
  await page.getByLabel("Collection efficiency", { exact: true }).fill("80");
  await page.getByLabel("Daily demand", { exact: true }).fill("0");
  await expect(page.locator(".sizing-recommendation")).toContainText(
    "Daily demand is zero",
  );
  await expect(page.locator(".sizing-table")).not.toContainText("100%");
  await expect(page.locator("#tank-sizing")).not.toContainText("NaN");
  await expect(page.locator("#tank-sizing")).not.toContainText("Infinity");
  expect(errors).toEqual([]);
});

test("scenario controls react immediately and chart points have equivalent table values", async ({
  page,
}) => {
  await page.goto("/");
  await openLab(page);
  await expect(page.locator(".sizing-chart .recharts-line-dot")).toHaveCount(
    11,
  );
  await page
    .locator(".sizing-chart .recharts-line-dot")
    .nth(3)
    .hover({ force: true });
  await expect(
    page.locator(".sizing-chart .recharts-tooltip-wrapper"),
  ).toContainText("1,000 L tank");
  await expect(
    page.locator(".sizing-chart .recharts-tooltip-wrapper"),
  ).toContainText("7,250 L");
  await expect(
    page.getByTestId("sizing-row-1000").locator('[data-column="supply"]'),
  ).toHaveText("7,250");
  await page.getByLabel("Daily demand", { exact: true }).fill("1000");
  await expect(page.getByTestId("sizing-maximum")).toHaveText("14,400 L");
  await page.getByLabel("Roof area", { exact: true }).fill("0");
  await expect(page.getByTestId("sizing-maximum")).toHaveText("0 L");
  await page.getByLabel("Roof area", { exact: true }).fill("120");
  await page.getByLabel("Collection efficiency", { exact: true }).fill("0");
  await expect(page.getByTestId("sizing-maximum")).toHaveText("0 L");
});

test("historical active period is preserved during pending choices and sizing never refetches weather", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let archiveCalls = 0;
  page.on("request", (request) => {
    if (request.url().startsWith("https://archive-api.open-meteo.com/"))
      archiveCalls++;
  });
  await mockWeather(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Historical Reanalysis", exact: true })
    .click();
  await page.getByLabel("Search city worldwide").fill("Edirne");
  await page
    .locator(".location-results button")
    .filter({ hasText: "Republic of Türkiye" })
    .click();
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("sizing-period")).toHaveText(
    "365-day historical reanalysis scenario",
  );
  await expect(page.getByTestId("sizing-source")).toContainText("2025");
  await page.getByLabel("Complete calendar year").selectOption("2024");
  await page.getByRole("radio", { name: "98%", exact: true }).check();
  await page.getByLabel("Roof area", { exact: true }).fill("150");
  await page.getByLabel("Daily demand", { exact: true }).fill("300");
  await page.getByLabel("Collection efficiency", { exact: true }).fill("85");
  await page.getByLabel("Tank capacity", { exact: true }).fill("987");
  await expect(page.getByTestId("sizing-period")).toHaveText(
    "365-day historical reanalysis scenario",
  );
  await expect(page.getByTestId("sizing-source")).toContainText("2025");
  expect(archiveCalls).toBe(1);
  await page
    .getByRole("button", { name: "Load rainfall data", exact: true })
    .click();
  await expect(page.getByTestId("sizing-period")).toHaveText(
    "366-day historical reanalysis scenario",
  );
  await expect(page.getByTestId("sizing-source")).toContainText("2024");
  expect(archiveCalls).toBe(2);
  await page.locator("#tank-sizing").screenshot({
    path: "docs/screenshots/build-05-sizing-mocked-366-390.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Synthetic Demo", exact: true })
    .click();
  await expect(page.getByTestId("sizing-period")).toHaveText(
    "30-day synthetic scenario",
  );
  await expect(page.getByTestId("sizing-source")).toContainText(
    "Mixed rainfall",
  );
  expect(archiveCalls).toBe(2);
});

test("sizing export includes all candidate metrics and provenance while daily export stays separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Tank capacity", { exact: true }).fill("1234.5");
  await page.getByRole("radio", { name: "95%", exact: true }).check();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export sizing CSV", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "cisternlab-tank-sizing-mixed-95.csv",
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  for (const text of [
    "DEMO DATA — SYNTHETIC",
    "ESTIMATED RESULT",
    "Comparison initial storage (L)",
    '"Target (%)","95"',
    '"Recommended tested capacity (L)","1000"',
    "Incremental yield",
    "not measured savings",
  ])
    expect(csv).toContain(text);
  expect(
    csv
      .split("\r\n")
      .filter((line) => /^"\d+(\.\d+)?","(Standard|Current only)",/.test(line)),
  ).toHaveLength(12);
  expect(csv).toContain('"1234.5","Current only","Yes"');
  expect(
    csv.split("\r\n").filter((line) => /^"Day \d+",/.test(line)),
  ).toHaveLength(30);
  await expect(
    page.getByRole("button", { name: "Export results", exact: true }),
  ).toBeVisible();
});

test("keyboard navigation reaches the lab, target radios and scrollable data table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Tank Sizing", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#tank-sizing$/);
  await page.getByRole("radio", { name: "90%", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "95%", exact: true }),
  ).toBeChecked();
  const table = page.getByRole("region", {
    name: "Scrollable tank capacity comparison",
    exact: true,
  });
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => table.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(table.getByRole("table")).toHaveAccessibleName(
    /Tank capacity comparison/,
  );
});
