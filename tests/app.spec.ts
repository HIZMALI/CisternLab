import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1440, 768, 390, 320]) {
  test(`responsive layout, charts, and accessibility at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto("./");
    await expect(page.getByText(/BUILD\s+\d+/)).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: /Every drop has/ }),
    ).toBeVisible();
    await expect(page.getByText("DEMO DATA", { exact: true })).toBeVisible();
    await expect(page.getByTestId("water-used")).toHaveText("7,250 L");
    await expect(page.getByTestId("coverage")).toHaveText("96.7%");
    await expect(page.getByTestId("overflow")).toHaveText("5,650 L");
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    for (const selector of [
      ".config-panel",
      ".metrics-grid",
      ".chart-panel",
      ".balance-strip",
      ".impact-section",
      ".daily-panel",
      ".methodology-section",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((v) => ({
        rule: v.id,
        elements: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/screenshots/synthetic-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (width === 390) {
      await page.locator(".results-column").screenshot({
        path: "test-results/screenshots/synthetic-390-results.png",
        animations: "disabled",
      });
    }
    expect(errors).toEqual([]);
  });
}

test("inputs, datasets, chart views, daily table and reset update immediately", async ({
  page,
}) => {
  await page.goto("./");
  const original = await page.getByTestId("water-used").innerText();
  await page.getByLabel("Roof area", { exact: true }).fill("0");
  await expect(page.getByTestId("water-used")).toHaveText("0 L");
  await expect(page.getByTestId("coverage")).toHaveText("0%");
  await page
    .getByRole("button", { name: "Reset scenario to defaults" })
    .click();
  await expect(page.getByTestId("water-used")).toHaveText(original);
  await page.getByLabel("Rainfall pattern").selectOption("1");
  await expect(page.getByTestId("water-used")).not.toHaveText(original);
  await page
    .getByRole("button", { name: "Daily balance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Daily balance", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: /Daily incoming/ })).toBeVisible();
  await expect(page.locator(".daily-panel tbody tr")).toHaveCount(7);
  await page.getByRole("button", { name: "Explore all 30 days" }).click();
  await expect(page.locator(".daily-panel tbody tr")).toHaveCount(30);
  await page.getByRole("button", { name: "Show first 7 days" }).click();
  await expect(page.locator(".daily-panel tbody tr")).toHaveCount(7);
  await page.getByRole("button", { name: "School", exact: true }).click();
  await expect(page.getByLabel("Roof area", { exact: true })).toHaveValue(
    "600",
  );
  await page
    .getByRole("button", { name: "Small facility", exact: true })
    .click();
  await expect(page.getByLabel("Roof area", { exact: true })).toHaveValue(
    "300",
  );
});

test("handles zero demand, zero tank, invalid drafts, and storage clamping", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Daily demand", { exact: true }).fill("0");
  await expect(page.getByTestId("coverage")).toHaveText("—");
  await expect(page.getByText("No demand configured")).toBeVisible();
  await page.getByLabel("Initial storage", { exact: true }).fill("1800");
  await page.getByLabel("Tank capacity", { exact: true }).fill("500");
  await expect(page.getByLabel("Initial storage", { exact: true })).toHaveValue(
    "500",
  );
  await page.getByLabel("Tank capacity", { exact: true }).fill("0");
  await expect(page.getByLabel("Initial storage", { exact: true })).toHaveValue(
    "0",
  );
  await expect(page.getByTestId("water-used")).toHaveText("0 L");
  await expect(page.getByTestId("final-storage")).toHaveText("0 L");
  const efficiency = page.getByLabel("Collection efficiency", { exact: true });
  await efficiency.fill("101");
  await expect(efficiency).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/Enter a number from 0 to 100/)).toBeVisible();
  await efficiency.fill("80");
  await expect(efficiency).toHaveAttribute("aria-invalid", "false");
  await page.getByLabel("Roof area", { exact: true }).fill("");
  await expect(page.getByLabel("Roof area", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("keyboard navigation reaches the simulator and operates controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to simulator" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#simulator$/);
  const slider = page.getByRole("slider", {
    name: "Roof area slider",
    exact: true,
  });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Roof area", { exact: true })).toHaveValue(
    "130",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("link", { name: /Methodology/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#methodology$/);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("CSV download keeps synthetic provenance and all 30 daily records", async ({
  page,
}) => {
  await page.goto("./");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("cisternlab-mixed-demo.csv");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("DEMO DATA");
  expect(csv).toContain("ESTIMATED RESULT");
  expect(csv).toContain("rain before demand");
  expect(csv.split("\r\n")).toHaveLength(40);
  await expect(
    page.getByRole("button", { name: "CSV downloaded" }),
  ).toBeVisible();
});

test("operates without external network requests", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:4173") &&
      !request.url().startsWith("blob:")
    )
      externalRequests.push(request.url());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /Every drop has/ }),
  ).toBeVisible();
  await page.getByLabel("Rainfall pattern").selectOption("2");
  await expect(page.getByLabel("Rainfall pattern")).toHaveValue("2");
  expect(externalRequests).toEqual([]);
});
