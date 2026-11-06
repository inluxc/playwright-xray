import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { blue, bold, green, magenta, red, white, yellow } from "picocolors";
import { convertToXrayJson, type TestResultEntry } from "./convert";
import Help from "./help";
import { selectProjectsToReport } from "./projects";
import type { XrayTest, XrayTestResult } from "./types/cloud.types";
import type { ExecInfo } from "./types/execInfo.types";
import type { XrayOptions } from "./types/xray.types";
import { XrayService } from "./xray.service";

class XrayReporter implements Reporter {
  private xrayService!: XrayService;
  private testResults!: XrayTestResult;
  private testCaseKeyPattern = /^(.+?) \| /;
  private receivedRegEx: RegExp = /Received string: "(.*?)"(?=\n)/;
  private options: XrayOptions;
  private execInfo!: ExecInfo;
  private readonly defaultRunName = `[${new Date().toUTCString()}] - Automated run`;
  private help: Help;
  private uploadScreenShot: boolean | undefined;
  private uploadTrace: boolean | undefined;
  private uploadVideo: boolean | undefined;
  private projectsToExclude: string | string[] | undefined;
  private stepCategories = ["expect", "pw:api", "test.step"];
  private readonly testsByKey: Map<string, TestResultEntry[]>;
  useMultipart: boolean | undefined;

  constructor(options: XrayOptions) {
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.xrayService = new XrayService(this.options);
    this.uploadScreenShot = options.uploadScreenShot;
    this.uploadTrace = options.uploadTrace;
    this.uploadVideo = options.uploadVideo;
    this.useMultipart = options.useMultipart;
    this.stepCategories = options.stepCategories === undefined ? this.stepCategories : options.stepCategories;
    this.testsByKey = new Map();
    this.testResults = {
      testExecutionKey: this.options.testExecution,
      info: {
        summary: this.defaultRunName,
        project: this.options.projectKey,
        startDate: this.help.getFormatData(new Date()),
        finishDate: this.help.getFormatData(new Date()),
        testPlanKey: this.options.testPlan,
        revision: this.options.revision,
        description: this.options.description,
        testEnvironments: this.options.testEnvironments,
        version: this.options.version,
      },
      tests: [] as XrayTest[],
    };
    this.projectsToExclude = this.options.projectsToExclude;
    console.log(`${bold(blue("-------------------------------------"))}`);
    console.log(`${bold(blue(" "))}`);
    if (this.options.summary !== undefined) this.testResults.info.summary = this.options.summary;
    this.execInfo = {
      browserName: "",
      testedBrowsers: [],
    };
  }

  async onBegin(_config: FullConfig, suite: Suite) {
    try {
      this.setProjectToReport(suite);
    } catch (error) {
      throw new Error(`Failed to obtain project with error: ${error}`);
    }

    if (this.options.dryRun) {
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Starting a Dry Run with ${suite.allTests().length} tests`))}`);
    } else {
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Starting the run with ${suite.allTests().length} tests`))}`);
    }

    console.log(`${bold(blue(" "))}`);
    if (suite.suites.length === 0) {
      console.log(`${bold(yellow("⏺  "))}${bold(red("No Playwright projects are running, nothing will be reported to Xray."))}`);
    } else if (this.execInfo.testedBrowsers === undefined || this.execInfo.testedBrowsers.length === 0) {
      console.log(
        `${bold(yellow("⏺  "))}${bold(red("No projects to report to Xray: all running projects are excluded by projectsToExclude. The tests still run, but nothing will be reported."))}`,
      );
    } else {
      console.log(
        `${bold(yellow("⏺  "))}${bold(blue(`The following test execution will be imported & reported:  ${this.execInfo.testedBrowsers.join(", ")}`))}`,
      );
    }
  }

  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCodes: string = testCaseId?.[1] ?? "";
    const projectName = testCase.parent.project()?.name;

    if (projectName === undefined || !this.execInfo.testedBrowsers?.includes(projectName)) {
      console.log(
        `${bold(white("⏺  "))}${bold(white(`Test case ${testCase.title} does not belong to the selected project. Running in project "${projectName}"`))}`,
      );
      return;
    }

    if (testCodes !== "") {
      // Split by comma and trim whitespace to handle multiple test case IDs
      const testCodeArray = testCodes
        .split(",")
        .map((code) => code.trim())
        .filter((code) => code !== "");

      for (const testCode of testCodeArray) {
        // Handle retries and data-driven tests for each test case ID
        const entry: TestResultEntry = { result, project: projectName };
        const tests = this.testsByKey.get(testCode);
        if (!tests) {
          this.testsByKey.set(testCode, [entry]);
        } else {
          tests.push(entry);
        }
      }

      const projectID =
        (this.execInfo.testedBrowsers?.length ?? 0) > 1 ? `${projectName.charAt(0).toUpperCase() + projectName.slice(1)} | ` : "";

      switch (this.help.convertPwStatusToXray(result.status)) {
        case "PASS":
        case "PASSED":
          if (result.retry > 0) console.log(`${bold(yellow(`⚠️  ${projectID}${testCase.title}`))}`);
          else console.log(`${bold(green(`✅ ${projectID}${testCase.title}`))}`);
          break;
        case "FAIL":
        case "FAILED":
          console.log(`${bold(red(`⛔ ${projectID}${testCase.title}`))}`);
          break;
        case "SKIPPED":
        case "ABORTED":
          console.log(`${bold(white(`🚫 ${projectID}${testCase.title}`))}`);
          break;
      }
    }
  }

  async onEnd(result: FullResult) {
    // Update test Duration
    this.testResults.info.finishDate = this.help.getFormatData(
      new Date(new Date(this.testResults?.info?.startDate ?? new Date()).getTime() + result.duration),
    );
    this.testResults.tests = await convertToXrayJson(this.testsByKey, {
      receivedRegEx: this.receivedRegEx,
      stepCategories: this.stepCategories,
      uploadScreenshot: this.uploadScreenShot,
      uploadTrace: this.uploadTrace,
      uploadVideo: this.uploadVideo,
      jiraType: this.options.jira.type,
      jiraXrayStatusMapping: this.options.jiraXrayStatusMapping,
    });

    if (typeof this.testResults !== "undefined" && typeof this.testResults.tests !== "undefined" && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults, this.execInfo);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }

  private setProjectToReport(suite: Suite) {
    const { projects, cliWins, excludePattern } = selectProjectsToReport(suite, this.projectsToExclude);

    if (cliWins) {
      console.log(
        `${bold(yellow("⏺  "))}${bold(magenta(`projectsToExclude (${excludePattern}) excludes all projects selected with --project. CLI wins, reporting: ${projects.join(", ")}`))}`,
      );
    }

    this.execInfo.browserName = projects.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
    this.execInfo.testedBrowsers = projects;
  }
}

export default XrayReporter;
export type { XrayTestMetadata } from "./metadata";
export { setXrayMetadata } from "./metadata";
export * from "./types/xray.types";
