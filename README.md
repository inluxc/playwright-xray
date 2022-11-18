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



### Cloud version

Authenticate with `client_id` and `client_secret` key.

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [['playwright-xray', { 
    jira: {
      url: 'https://your-jira-url',
      type: 'cloud'
    },
    xray: {
      client_id: '',
      client_secret: '',
    }
    projectKey: 'JIRA_CODE',
    testPlan: 'JIRA_CODEXXXXX'
  }]],
}
```

### Server version

Authenticate with `usernam` and `password` key.

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [['playwright-xray', { 
    jira: {
      url: 'https://your-jira-url',
      type: 'server'
    },
    server: {
      url: 'https://sandbox.xpand-it.com/rest/raven/2.0/api',
      username: '',
      password: ''
    },
    projectKey: 'JIRA_CODE',
    testPlan: 'JIRA_CODEXXXXX'
  }]],
}
```

Also, your playwright tests should include unique ID inside square brackets `[J79]` of your Xray test case:

```typescript
// Xray test case ID inside square brackets
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
🔗 https://jira.your-company-domain.com/browser/JARV-C2901
```

And you'll see the result in the Xray:

## License

playwright-xray is [MIT licensed](./LICENSE).

## Author

Fúlvio Carvalhido <inluxc@gmail.com>

## Supported by:

Diller <https://diller.no/>
