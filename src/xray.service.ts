import * as fs from "node:fs";
import { inspect } from "node:util";
import axios, { type Axios } from "axios";
import { blue, bold, green, red, white, yellow } from "picocolors";
import Help from "./help";
import type { XrayTest as XrayTestCloud, XrayTestResult as XrayTestResultCloud } from "./types/cloud.types";
import type { ExecInfo } from "./types/execInfo.types";
import type { XrayTestResult as XrayTestResultServer, XrayTest as XrayTestServer } from "./types/server.types";
import type { XrayOptions } from "./types/xray.types";

type XrayTestResult = XrayTestResultCloud | XrayTestResultServer;
type XrayTest = XrayTestCloud | XrayTestServer;

export class XrayService {
  private readonly jira: string;
  private readonly type: string;
  private readonly apiVersion: string;
  private readonly options: XrayOptions;
  private requestUrl = "";
  private axios: Axios;
  private help: Help;
  private dryRun: boolean;
  private runResult: boolean;
  private limitEvidenceSize: number;
  private isXrayCloudAuthenticated = false;

  constructor(options: XrayOptions) {
    // Init vars
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.dryRun = options.dryRun === true;
    this.runResult = options.runResult === true;
    this.limitEvidenceSize = options.limitEvidenceSize === undefined ? 104857600 : options.limitEvidenceSize;

    // Set Jira URL
    if (!options.jira.url) throw new Error('"jira.url" option is missed. Please, provide it in the config');
    this.jira = options.jira.url;

    // Set Jira Server Type
    if (!options.jira.type) throw new Error('"jira.type" option is missed. Please, provide it in the config');
    this.type = options.jira.type;

    // Set Jira API apiVersion
    if (!options.jira.apiVersion) throw new Error('"jira.apiVersion" option is missed. Please, provide it in the config');
    this.apiVersion = options.jira.apiVersion;

    // Init axios instance
    this.axios = axios;

    this.axios.defaults.headers.options = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (!this.dryRun) {
      this.initialzeJiraConnection(options)
        .then(() => console.log("Live Mode is on"))
        .catch(console.error);
    }
    // Set Project Key
    if (!options.projectKey) throw new Error('"projectKey" option is missed. Please, provide it in the config');

    // Set Test Plan
    if (!options.testPlan) throw new Error('"testPlan" option are missed. Please provide them in the config');
  }

  async createRun(results: XrayTestResult, execInfo: ExecInfo) {
    const URL = `${this.requestUrl}/import/execution`;
    const total = results.tests?.length;
    const duration = new Date(results.info.finishDate).getTime() - new Date(results.info.startDate).getTime();
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;

    try {
      if (this.options.debug) {
        fs.writeFileSync("xray-payload-debug.json", JSON.stringify(results));
      }
    } catch (error) {
      console.log(`Unable to write xray-payload-debug.json : ${(error as Error).message}`);
    }
    //console.log(results);
    for (const test of results.tests ?? []) {
      switch (test.status) {
        case "SKIPPED":
          skipped = skipped + 1;
          break;
        case "PASS":
        case "PASSED":
          if (this.isFlaky(test)) {
            flaky = flaky + 1;
          } else {
            passed = passed + 1;
          }
          break;
        case "FAIL":
        case "FAILED":
          failed = failed + 1;
          break;
      }
    }

    try {
      if (this.options.debug || this.options.dryRun) {
        fs.writeFileSync("xray-payload.json", JSON.stringify(results));
      }

      const key = !this.dryRun ? await this.postResultToJira(URL, results) : "Dry run";

      const action = this.options.testExecution !== undefined ? "updated" : "created";

      // Results
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(blue("-------------------------------------"))}`);
      console.log(`${bold(blue(" "))}`);

      if (this.dryRun) {
        console.log(`${bold(green("😀 Successfully performed a Dry Run"))}`);
      } else {
        console.log(`${bold(green("😀 Successfully sending test results to Jira"))}`);
      }

      console.log(`${bold(blue(" "))}`);
      if (this.options.description !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Description:       ${this.options.description}`))}`);
      }
      if (this.options.testEnvironments !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Test environments: ${this.options.testEnvironments}`))}`);
      }
      if (this.options.version !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Version:           ${this.options.version}`))}`);
      }
      if (this.options.revision !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Revision:          ${this.options.revision}`))}`);
      }
      if (execInfo.browserName !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Browser:           ${execInfo.testedBrowser}`))}`);
      }
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Test plan:         ${this.options.testPlan}`))}`);
      if (this.options.testExecution !== undefined) {
        console.log(`${bold(yellow("⏺  "))}${bold(blue(`Test execution:    ${this.options.testExecution}`))}`);
      }
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Test Duration:     ${this.help.convertMsToTime(duration)}`))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Tests ran:         ${total} (including reruns)`))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(green(`Tests passed:      ${passed}`))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(red(`Tests failed:      ${failed}`))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(yellow(`Flaky tests:       ${flaky}`))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(white(`Skipped tests:     ${skipped}`))}`);
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(blue("-------------------------------------"))}`);
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Test execution ${key} has been ${action}`))}`);

      if (!this.dryRun) {
        console.log(`${bold(blue("👇 Check out the test result"))}`);
        console.log(`${bold(blue(`🔗 ${this.jira}browse/${key}`))}`);
        console.log(`${bold(blue(" "))}`);
      }

      if (this.runResult) writeRunResult(this.options.testPlan);

      console.log(`${bold(blue("-------------------------------------"))}`);
    } catch (error) {
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(blue("-------------------------------------"))}`);
      console.log(`${bold(blue(" "))}`);

      let log = "";
      let msg = "";

      if (axios.isAxiosError(error) && !this.dryRun) {
        log = `Config: ${inspect(error.config)}\n\n`;

        if (error.response) {
          msg = inspect(error.response.data.error);
          msg = msg.replace(/'/g, "");
          log += `Status: ${error.response.status}\n`;
          log += `Headers: ${inspect(error.response.headers)}\n`;
          log += `Data: ${inspect(error.response.data)}\n`;
        } else if (error.request) {
          msg = "The request was made but no response was received";
          log += `Error: ${inspect(error.toJSON())}\n`;
        } else {
          msg = "Something happened in setting up the request that triggered an error";
          log += `Error: ${inspect(error.message)}\n`;
        }
      } else {
        log = `Unknown error: ${error}\n`;
      }
      try {
        fs.writeFileSync("playwright-xray-error.log", log);
      } catch (error) {
        console.log(`Unable to write playwright-xray-error.log : ${(error as Error).message}`);
      }

      const msgs = msg.split(";");
      console.log(`${bold(red("😞 Error sending test results to Jira"))}`);
      console.log(`${bold(blue(" "))}`);
      for (const m of msgs) {
        console.log(`${bold(red(`⛔ ${m}`))}`);
      }
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(blue('👉 Check the "playwright-xray-error.log" file for more details'))}`);
      console.log(`${bold(blue(" "))}`);
      console.log(`${bold(blue("-------------------------------------"))}`);
    }

    function writeRunResult(testPlan: string) {
      const runResult = {
        browser: execInfo.testedBrowser,
        testPlan: testPlan,
        testDuration: duration,
        testsRun: total,
        testsPassed: passed,
        testsFailed: failed,
        flakyTests: flaky,
        skippedTests: skipped,
      };
      try {
        fs.writeFileSync("runresult.json", JSON.stringify(runResult));
      } catch (error) {
        console.log(`Unable to write runresult.json : ${(error as Error).message}`);
      }
    }
  }

  private async initialzeJiraConnection(options: XrayOptions) {
    let xray = "";
    let username = "";
    let password = "";
    let token = "";
    switch (this.type) {
      case "cloud":
        // Set Xray Server URL
        xray = options.cloud?.xrayUrl === undefined || !options.cloud?.xrayUrl ? "https://xray.cloud.getxray.app/" : options.cloud.xrayUrl;

        // Set Xray Credencials
        if (!options.cloud?.client_id || !options.cloud?.client_secret) {
          throw new Error('"cloud.client_id" and/or "cloud.client_secret" options are missed. Please provide them in the config');
        }

        username = options.cloud?.client_id;
        password = options.cloud?.client_secret;

        // Set Request URL
        this.requestUrl = new URL("api/v2", xray).toString();

        //Create Axios Instance with Auth
        try {
          const request = await axios.post(`${this.requestUrl}/authenticate`, {
            client_id: username,
            client_secret: password,
          });

          this.isXrayCloudAuthenticated = true;
          this.axios = axios.create({
            baseURL: xray,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${request.data}`,
            },
          });
        } catch (error) {
          throw new Error(`Failed to authenticate to host ${xray} with error: ${error}`);
        }

        break;

      case "server":
        // Set Xray Server URL
        if (!options.jira?.url) throw new Error('"host" option is missed. Please, provide it in the config');
        xray = options.jira?.url;

        // Set Xray Credencials
        if (options.server) {
          if ("token" in options.server) {
            token = options.server.token as string;
          } else if ("username" in options.server && "password" in options.server) {
            username = options.server.username as string;
            password = options.server.password as string;
          } else {
            throw new Error(
              '"server.token" or "server.username & server.password" options are missing. Please provide either token or username and password in the config',
            );
          }
        }

        // Set Request URL
        this.requestUrl = xray + (this.apiVersion !== "1.0" ? `rest/raven/${this.apiVersion}/api` : "rest/raven/1.0");

        //Create Axios Instance with Auth
        if (token) {
          this.axios = axios.create({
            baseURL: xray,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
        if (username && password) {
          this.axios = axios.create({
            baseURL: xray,
            auth: {
              username,
              password,
            },
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
        break;
    }
  }

  private async postResultToJira(URL: string, results: XrayTestResult) {
    if (!this.isXrayCloudAuthenticated && this.type === "cloud") {
      await this.initialzeJiraConnection(this.options);
    }
    this.trimEvidence(results);
    if (this.options.executedBy) {
      this.addExecutedBy(results.tests ?? []);
    }
    const response = await this.axios.post(URL, JSON.stringify(results), {
      maxBodyLength: 107374182400, //100gb
      maxContentLength: 107374182400, //100gb
      timeout: 600000, //10min
      proxy: this.options.proxy !== undefined ? this.options.proxy : false,
    });
    if (response.status !== 200) throw new Error(`${response.status} - Failed to create test cycle`);

    if ("testIssues" in response.data) {
      if (response.data.testIssues?.error?.length !== 0) {
        throw new Error(
          `Partial test reporting failure for the following tests: ${response.data.testIssues.error.map((e: { testKey: string }) => e.testKey).join(", ")}`,
        );
      }
    }

    let key = response.data.key;
    if (this.options.jira.type === "server") {
      key = response.data.testExecIssue.key;
    }
    return key;
  }

  private isFlaky(test: XrayTest) {
    if (
      test.iterations?.some(
        (iteration) =>
          iteration.status === this.help.convertPwStatusToXray("failed") ||
          iteration.status === this.help.convertPwStatusToXray("timedOut"),
      )
    ) {
      if (this.options.markFlakyWith) {
        test.status = this.options.markFlakyWith;
      }
      return true;
    }
    return false;
  }

  private trimEvidence(results: XrayTestResult) {
    if (results.tests === undefined) return;
    if (byteSize(JSON.stringify(results)) < this.limitEvidenceSize) return;
    for (let i: number = results.tests.length - 1; i > 0; i--) {
      if (results.tests[i].status.includes("PASS")) continue;
      console.log(`${bold(yellow(`⚠️  Removing evidence from:  ${results.tests[i].testKey}`))}`);
      if (this.options.server) (results.tests[i] as XrayTestServer).evidences = [];
      else (results.tests[i] as XrayTestCloud).evidence = [];
      if (byteSize(JSON.stringify(results)) < this.limitEvidenceSize) break;
    }
    if (this.options.debug) fs.writeFileSync("xray-payload-trim.json", JSON.stringify(results));
  }
  private addExecutedBy(tests: XrayTest[]) {
    for (const test of tests) {
      test.executedBy = this.options.executedBy;
    }
  }
}
const byteSize = (str: BlobPart) => new Blob([str]).size;
