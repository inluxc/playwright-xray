// playwright.config.ts
import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  reporter: [
    [
      "./src/index.ts",
      {
        jira: {
          url: "https://client.atlassian.net/",
          type: "cloud", // cloud, server
          apiVersion: "1.0",
        },
        cloud: {
          client_id: "",
          client_secret: "",
        },
        server: {
          token: "",
          username: "",
          password: "",
        },
        uploadScreenShot: true,
        uploadTrace: true,
        uploadVideo: true,
        projectKey: "CODE",
        testPlan: "CODE-1820",
      },
    ],
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Chrome",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
};
export default config;
