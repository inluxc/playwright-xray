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
      token: ''
    },
    projectKey: 'CODE',
    testPlan: 'CODE-1820',
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