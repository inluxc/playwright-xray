# Xray reporter for Playwright

Publish Playwright test run on Xray

This reporter is based in playwright zephyr from Yevhen Laichenkov https://github.com/elaichenkov/playwright-zephyr
Thanks Yevhen for the great contribution

## Install

```sh
npm i -D playwright-xray
```

## Usage

Add reporter to your `playwright.config.ts` configuration file

With `user` and `password` options:

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [['playwright-xray', { 
    host: 'https://jira.your-company-domain.com/',
    user: 'username',
    password: 'password',
    projectKey: 'JARV'
  }]],
}
```

With `authorizationToken` option instead of `user` and `password`:

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [['playwright-xray', { 
    host: 'https://jira.your-company-domain.com/',
    authorizationToken: 'SVSdrtwgDSA312342--',
    projectKey: 'JARV'
  }]],
}
```

Also, your playwright tests should include unique ID inside square brackets `[J79]` of your Xray test case:

```typescript
//      ↓  Xray test case ID inside square brackets
test('[J79] basic test', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  const title = page.locator('.navbar__inner .navbar__title');
  await expect(title).toHaveText('Playwright');
});
```

Then run your tests with `npx playwright test` command and you'll see the result in console:

```sh
✅ Test cycle JARV-C2901 has been created
👇 Check out the test result
🔗 https://jira.your-company-domain.com/secure/Tests.jspa#/testPlayer/JARV-C2901
```

And you'll see the result in the Xray:

![alt text](./assets/xray-result.png)

## License

playwright-xray is [MIT licensed](./LICENSE).

## Author

Fúlvio Carvalhido <inluxc@gmail.com>
