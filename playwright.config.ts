// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [['./src/index.ts', { 
    jira: {
      url: 'https://client.atlassian.net/',
      type: 'cloud', // cloud, server
    },
    cloud: {
      client_id: '',
      client_secret: '',
    },
    server: {
      url: 'https://sandbox.xpand-it.com/rest/raven/2.0/api',
      user: '',
      password: ''
    },
    projectKey: 'CODE',
    testPlan: 'CODE-1820',
    testExecution: '',
    debug: false
  }]],
  use: {
      screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'Chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    }
  ],
};
export default config;