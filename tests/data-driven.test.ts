import { expect, test } from '@playwright/test';

for (const name of ['Bob', 'George', 'Linda']) {
  test(`greet ${name}`, async () => {
    expect(name).toEqual(name);
  });
}
