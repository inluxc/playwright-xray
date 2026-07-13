import type { PlaywrightTestConfig } from "@playwright/test";

// a "setup" project plus two dependent browser projects must all be
// reported into a single Xray execution, not just the first project.
const config: PlaywrightTestConfig = {
  testDir: "./tests/multi-project",
  retries: 1,
  reporter: [
    [
      "./src/index.ts",
      {
        jira: {
          url: "https://client.atlassian.net/",
          type: "cloud",
          apiVersion: "1.0",
        },
        cloud: {
          client_id: "",
          client_secret: "",
        },
        projectKey: "CODE",
        testPlan: "CODE-1820",
        dryRun: true,
      },
    ],
  ],
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "Chrome",
      use: { browserName: "chromium" },
      testMatch: /chrome\.test\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "Firefox",
      use: { browserName: "firefox" },
      testMatch: /firefox\.test\.ts/,
      dependencies: ["setup"],
    },
  ],
};
export default config;
