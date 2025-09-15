import { expect, test } from '@playwright/test';

test.describe(() => {
  test.describe.configure({ retries: 3 });
  test('test fails three times', async ({ page }, testinfo) => {
    await page.goto('https://example.org');
    if (testinfo.retry < 3) {
      await expect(page.getByRole('heading')).toHaveText('Hello');
    } else {
      await expect(page.getByRole('heading')).toHaveText('Example Domain');
    }
  });
});
