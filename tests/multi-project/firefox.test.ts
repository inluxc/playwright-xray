import { expect, test } from "@playwright/test";

test("PWXR-3 | failing basic test in ff", async ({ page }) => {
  await page.setContent("<h1>Hello</h1>");
  await expect(page.locator("h1")).toHaveText("This iteration will fail");
});
