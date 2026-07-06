import { expect, test } from "@playwright/test";

test("PWXR-3 | basic test", async ({ page }) => {
  await page.setContent("<h1>Hello</h1>");
  await expect(page.locator("h1")).toHaveText("Hello");
});
