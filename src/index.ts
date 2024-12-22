import type { FullConfig, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { blue, bold, green, red, white, yellow } from "picocolors";
import { convertToXrayJson } from "./convert";
import Help from "./help";
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
  private totalDuration: number;
  private readonly defaultRunName = `[${new Date().toUTCString()}] - Automated run`;
  private help: Help;
  private uploadScreenShot: boolean | undefined;
  private uploadTrace: boolean | undefined;
  private uploadVideo: boolean | undefined;
  private projectsToExclude: string | string[] | undefined;
  private stepCategories = ["expect", "pw:api", "test.step"];
  private readonly testsByKey: Map<string, TestResult[]>;

  constructor(options: XrayOptions) {
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.xrayService = new XrayService(this.options);
    this.totalDuration = 0;
    this.uploadScreenShot = options.uploadScreenShot;
    this.uploadTrace = options.uploadTrace;
    this.uploadVideo = options.uploadVideo;
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
      testedBrowser: undefined,
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let projectsToReport: Record<string, any>[] = [];
    let regexOfExcludedProjects: RegExp;
    // Exclude projects from the report
    // If the projectsToExclude is an array, we will use the regex to exclude the projects
    if (this.projectsToExclude !== undefined && typeof this.projectsToExclude !== "string" && this.projectsToExclude.length > 1) {
      regexOfExcludedProjects = new RegExp(`^(${this.projectsToExclude.join("|")})$`);
      projectsToReport = config.projects.filter((p) => !regexOfExcludedProjects.test(p.name));
      // If the projectsToExclude is a string, we will use the regex to exclude the projects
    } else if (this.projectsToExclude !== undefined && typeof this.projectsToExclude !== "string") {
      regexOfExcludedProjects = new RegExp(`^(${this.projectsToExclude.join("")})$`);
      projectsToReport = config.projects.filter((p) => !regexOfExcludedProjects.test(p.name));
      // If the projectsToExclude is a string, we will use the regex to exclude the projects
    } else if (this.projectsToExclude !== undefined && typeof this.projectsToExclude === "string") {
      regexOfExcludedProjects = new RegExp(`^(${this.projectsToExclude})$`);
      projectsToReport = config.projects.filter((p) => !regexOfExcludedProjects.test(p.name));
      // If the projectsToExclude is not defined, we will report all the projects
    } else {
      projectsToReport = config.projects;
    }

    projectsToReport.forEach((p, index) => {
      this.execInfo.browserName += index > 0 ? ", " : "";
      this.execInfo.browserName += p.name.charAt(0).toUpperCase() + p.name.slice(1);
      // Set the first browser as the tested browser
      if (index === 0) {
        this.execInfo.testedBrowser = p.name;
      }
    });
    if (this.options.dryRun) {
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Starting a Dry Run with ${suite.allTests().length} tests`))}`);
    } else {
      console.log(`${bold(yellow("⏺  "))}${bold(blue(`Starting the run with ${suite.allTests().length} tests`))}`);
    }

    console.log(`${bold(blue(" "))}`);
    if (this.execInfo.testedBrowser !== undefined) {
      console.log(
        `${bold(yellow("⏺  "))}${bold(blue(`The following test execution will be imported & reported:  ${this.execInfo.testedBrowser}`))}`,
      );
    }
  }

  async onTestBegin(test: TestCase) {
    // Not sure if this is the best way to get the project name
    // But let's keep it for now.
    if (this.execInfo.testedBrowser === undefined) {
      this.execInfo.testedBrowser = test.parent.parent?.title;
      console.log(
        `${bold(yellow("⏺  "))}${bold(blue(`The following test execution will be imported & reported:  ${this.execInfo.testedBrowser}`))}`,
      );
    }
  }
  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCode: string = testCaseId?.[1] ?? "";
    const projectId = JSON.stringify(testCase.parent.project()).match(/__projectId":"(.*)"/)?.[1];
    if (this.execInfo.testedBrowser !== projectId) {
      return;
    }

    if (testCode !== "") {
      const tests = this.testsByKey.get(testCode);
      if (!tests) {
        this.testsByKey.set(testCode, [result]);
      } else {
        tests.push(result);
      }

      let projectID = "";
      const tst: string = JSON.stringify(testCase.parent.project()).match(/__projectIdd":"(.*)"/)?.[1] as string;
      if (tst !== undefined) {
        projectID = `${tst.charAt(0).toUpperCase() + tst.slice(1)} | `;
      }

      switch (this.help.convertPwStatusToXray(result.status)) {
        case "PASS":
        case "PASSED":
          console.log(`${bold(green(`✅ ${projectID}${testCase.title}`))}`);
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

  async onEnd() {
    // Update test Duration
    this.testResults.info.finishDate = this.help.getFormatData(
      new Date(new Date(this.testResults?.info?.startDate ?? new Date()).getTime() + this.totalDuration),
    );

    this.testResults.tests = await convertToXrayJson(this.testsByKey, {
      receivedRegEx: this.receivedRegEx,
      stepCategories: this.stepCategories,
      uploadScreenshot: this.uploadScreenShot,
      uploadTrace: this.uploadTrace,
      uploadVideo: this.uploadVideo,
      jiraType: this.options.jira.type,
    });

    if (typeof this.testResults !== "undefined" && typeof this.testResults.tests !== "undefined" && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults, this.execInfo);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }
}

export default XrayReporter;
export * from "./types/xray.types";
