import { expect, test } from '@playwright/test';

test('TES-49 | flaky test with playwright steps', async ({ page }) => {
  await test.step('Step 1', async () => {
    expect(true).toBe(true);
  });

  await test.step('Step 2', async () => {
    expect(true).toBe(true);
  });

  await page.goto('https://playwright.dev/');
  const title = page.locator('.navbar__inner .navbar__title');
  await expect(title).toHaveText('Playwright');

  await test.step('Step 3', async () => {
    const ran = Math.floor(Math.random() * 2);
    expect(ran).toBe(1);
  });
});

test('TES-42 | test with - skip', async ({ page }) => {
  test.skip();
});

test('Test without XRAY key - skip', async ({ page }) => {
  test.skip();
});
