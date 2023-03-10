import { test, expect } from '@playwright/test';

test('XRAYISSUE-1 | another test', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit');

  await page.goto('https://playwright.dev/');
  const title = page.locator('.navbar__inner .navbar__title');

  if (browserName === 'firefox') {
    await expect(title).toHaveText('Playright');
  }
  await expect(title).toHaveText('Playwright');
});

test('XRAYISSUE-2 | another test', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit');

  await page.goto('https://playwright.dev/');
  const title = page.locator('.navbar__inner .navbar__title');

  if (browserName === 'firefox') {
    await expect(title).toHaveText('Playright 22');
  }
  await expect(title).toHaveText('Playwright 22');
});
