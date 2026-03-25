import * as fs from "node:fs";
import { inspect } from "node:util";
import { blue, bold, green, red, white, yellow } from "picocolors";
import { convertToMultipart } from "./convertToMultipart";
import Help from "./help";
import { ReportUploader } from "./reportUploader";
import type { XrayTest as XrayTestCloud, XrayTestResult as XrayTestResultCloud } from "./types/cloud.types";
import type { ExecInfo } from "./types/execInfo.types";
import type { XrayTestResult as XrayTestResultServer, XrayTest as XrayTestServer } from "./types/server.types";
import type { XrayOptions } from "./types/xray.types";

type XrayTestResult = XrayTestResultCloud | XrayTestResultServer;
type XrayTest = XrayTestCloud | XrayTestServer;

export class XrayService {
  private readonly jira: string;
  private readonly options: XrayOptions;
  private reportUploader: ReportUploader;
  private help: Help;
  private dryRun: boolean;
  private runResult: boolean;
  private limitEvidenceSize: number;
  private isXrayCloudAuthenticated = false;
  private axios = require("axios").default as typeof import("axios");

  constructor(options: XrayOptions) {
    this.reportUploader = new ReportUploader(options);
    // Init vars
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.dryRun = options.dryRun === true;
    this.runResult = options.runResult === true;
    this.limitEvidenceSize = options.limitEvidenceSize === undefined ? 104857600 : options.limitEvidenceSize;
    this.jira = options.jira.url;

    if (!this.dryRun) {
      this.reportUploader
        .initialzeJiraConnection()
        .then(() => console.log("Live Mode is on"))
        .catch(console.error);
    }
    // Set Project Key
    if (!options.projectKey) throw new Error('"projectKey" option is missed. Please, provide it in the config');

    // Set Test Plan
    if (!options.testPlan) throw new Error('"testPlan" option are missed. Please provide them in the config');
  }

  async createRun(results: XrayTestResult, execInfo: ExecInfo) {
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

      const key = !this.dryRun ? await this.postResultToJira(results) : "Dry run";
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
      if (this.axios.isAxiosError(error) && !this.dryRun) {
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

  private async postResultToJira(results: XrayTestResult) {
    if (!this.isXrayCloudAuthenticated && this.options.jira.type === "cloud") {
      await this.reportUploader.initialzeJiraConnection();
    }

    this.trimEvidence(results);
    if (this.options.executedBy) {
      this.addExecutedBy(results.tests ?? []);
    }

    let key = "";
    if (this.options.useMultipart && this.options.jira.type === "cloud") {
      const multipartFiles = await convertToMultipart(results as XrayTestResultCloud, this.options.multiPart);
      key = await this.reportUploader.sendMultpartToXray(multipartFiles);
    } else {
      key = await this.reportUploader.sendSinglePartToXray(results, this.options);
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
