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
    cloud: {
      client_id: '',
      client_secret: '',
    },
    projectKey: 'JIRA_CODE',
    testPlan: 'JIRA_CODEXXXXX'
  }]],
}
```

### Server version

Authenticate with `token` key.

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
      token: 'YOUR_SERVER_TOKEN'
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
-------------------------------------
 
✅ Test status: PROJ-104
✅ Tests ran: 4
✅ Tests passed: 1
✅ Tests failed: 3
✅ Tests todo: 0
 
-------------------------------------
 
✅ Test cycle PROJ-104 has been created
👇 Check out the test result
🔗 https://[company].atlassian.net/browse/PROJ-104
 
-------------------------------------
```

And you'll see the result in the Xray:

![alt text](./assets/xray-result.png)


## Multiple Test Plans

If you need to send report for more than one test plan, you need to create a config file for each test plan.
Create a folder (e.g. configs) in your project and for each test plan, create a new playwright config file in this folder.

``` ts
// configs/TCK-87.config.ts

import { PlaywrightTestConfig } from "@playwright/test";
import base from "../playwright.config";

const config: PlaywrightTestConfig = {
	...base,
	testDir: "../tests",
	use: {
		...base.use,
		headless: true,
	},
	reporter: [
		[
			"playwright-xray",
			{
				jira: {
          url: 'https://your-jira-url',
          type: 'server'
				},
				server: {
					token: 'YOUR_SERVER_TOKEN',
				},
        projectKey: 'TCK',
        testPlan: 'TCK-87'
			},
		],
	],
};
export default config;
```
Now you can choose which config file you want to use executing the tests, using the command below:
```
npx playwright test --config=configs/TCK-87.config.ts
```
If no config file is chosen, the default config file "playwright.config.ts" will be used.


## Notes

- To have the steps imported you have to create then in the test issue itself.
The steps will be imported by order of execution and inserted into the test.

## License

playwright-xray is [MIT licensed](./LICENSE).

## Author

Fúlvio Carvalhido <inluxc@gmail.com>

## Supported by:

Diller <https://diller.no/>
