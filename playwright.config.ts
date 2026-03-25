import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  reporter: [
    [
      "./src/index.ts",
      {
        jira: {
          url: "https://ica.atlassian.net/",
          type: "cloud", // cloud, server
          apiVersion: "1.0",
        },
        cloud: {
          client_id: "3B9788FE54E6454F84CFE9DC19828779",
          client_secret: "b91655cbc063bbe6e8d9f98b7ce136e656155cff2baf62a0b43fea6873ace040",
        },
        server: {
          token: "",
          username: "",
          password: "",
        },
        uploadScreenShot: true,
        uploadTrace: true,
        uploadVideo: true,
        projectKey: "PWXR",
        testPlan: "PWXR-2",
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
