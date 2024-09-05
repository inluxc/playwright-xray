// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    reporter: [
        [
            './src/index.ts',
            {
                jira: {
                    url: 'https://client.atlassian.net/',
                    type: 'cloud', // cloud, server
                    apiVersion: '1.0'
                },
                cloud: {
                    client_id: '',
                    client_secret: '',
                },
                server: {
                    token: '',
                },
                projectKey: 'CODE',
                testPlan: 'CODE-1820',
                dryRun: true
            },
        ],
    ],
    use: {
        screenshot: 'only-on-failure',
        trace: "retain-on-failure"
    },
    projects: [
        {
            name: 'Chrome',
            use: {
                browserName: 'chromium',
                channel: 'chrome',
            },
        },
    ],
};
export default config;
