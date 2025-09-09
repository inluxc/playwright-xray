import { expect, test } from '@playwright/test';
import { setXrayMetadata } from '../src/metadata';

for (const name of ['Bob', 'George', 'Linda']) {
  // biome-ignore lint: Allow {}
  test(`XRAYTEST-123 | greet ${name}`, async ({}, testInfo) => {
    setXrayMetadata(testInfo, { parameters: { name } });
    expect(name).toEqual(name);
  });
}
