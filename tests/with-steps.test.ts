import { test, expect } from '@playwright/test';

test('TES-49 | test with playwright steps', async ({ page }) => {

    await test.step('Step 1', async () => {
        expect(true).toBe(true);
    });

    await test.step('Step 2', async () => {
        expect(true).toBe(true);
    });

    await test.step('Step 3', async () => {
        expect(false).toBe(true);
    });
});