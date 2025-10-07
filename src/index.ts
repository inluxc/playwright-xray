import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { blue, bold, green, magenta, red, white, yellow } from 'picocolors';
import { convertToXrayJson } from './convert';
import Help from './help';
import type { XrayTest, XrayTestResult } from './types/cloud.types';
import type { ExecInfo } from './types/execInfo.types';
import type { XrayOptions } from './types/xray.types';
import { XrayService } from './xray.service';

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
  private stepCategories = ['expect', 'pw:api', 'test.step'];
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
    console.log(`${bold(blue('-------------------------------------'))}`);
    console.log(`${bold(blue(' '))}`);
    if (this.options.summary !== undefined) this.testResults.info.summary = this.options.summary;
    this.execInfo = {
      browserName: '',
      testedBrowser: undefined,
    };
  }

  async onBegin(config: FullConfig, suite: Suite) {
    try {
      this.setProjectToReport(suite, config);
    } catch (error) {
      throw new Error(`Failed to obtain project with error: ${error}`);
    }

    if (this.options.dryRun) {
      console.log(`${bold(yellow('⏺  '))}${bold(blue(`Starting a Dry Run with ${suite.allTests().length} tests`))}`);
    } else {
      console.log(`${bold(yellow('⏺  '))}${bold(blue(`Starting the run with ${suite.allTests().length} tests`))}`);
    }

    console.log(`${bold(blue(' '))}`);
    if (this.execInfo.testedBrowser !== undefined) {
      console.log(
        `${bold(yellow('⏺  '))}${bold(blue(`The following test execution will be imported & reported:  ${this.execInfo.testedBrowser}`))}`,
      );
    }
  }

  async onTestBegin(_test: TestCase) {
    if (this.execInfo.testedBrowser === undefined) {
      console.log(`${bold(yellow('⏺  '))}${bold(red('No projects to run, have you excluded all in your playwright config?'))}`);
      return;
    }
  }
  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCode: string = testCaseId?.[1] ?? '';
    const projectId = JSON.stringify(testCase.parent.project()).match(/__projectId":"(.*)"/)?.[1];
    if (this.execInfo.testedBrowser !== projectId) {
      return;
    }

    if (testCode !== '') {
      const tests = this.testsByKey.get(testCode);
      if (!tests) {
        this.testsByKey.set(testCode, [result]);
      } else {
        tests.push(result);
      }

      let projectID = '';
      const tst: string = JSON.stringify(testCase.parent.project()).match(/__projectIdd":"(.*)"/)?.[1] as string;
      if (tst !== undefined) {
        projectID = `${tst.charAt(0).toUpperCase() + tst.slice(1)} | `;
      }

      switch (this.help.convertPwStatusToXray(result.status)) {
        case 'PASS':
        case 'PASSED':
          if (result.retry > 0) console.log(`${bold(yellow(`⚠️  ${projectID}${testCase.title}`))}`);
          else console.log(`${bold(green(`✅ ${projectID}${testCase.title}`))}`);
          break;
        case 'FAIL':
        case 'FAILED':
          console.log(`${bold(red(`⛔ ${projectID}${testCase.title}`))}`);
          break;
        case 'SKIPPED':
        case 'ABORTED':
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
      jiraXrayStatusMapping: this.options.jiraXrayStatusMapping,
    });

    if (typeof this.testResults !== 'undefined' && typeof this.testResults.tests !== 'undefined' && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults, this.execInfo);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }

  // biome-ignore lint/complexity/noBannedTypes: Allow for {}
  private setProjectToReport(suite: Suite, config: FullConfig<{}, {}>) {
    const projectsToReport: string[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: Allow for any
    const entries: Array<any> = (suite as any)._entries;
    const cliArguments = entries.flatMap((o) => o._fullProject.fullConfig.cliProjectFilter);
    if (cliArguments !== undefined && cliArguments[0] !== undefined) {
      projectsToReport.push(cliArguments[0]);
    }
    // Exclude projects from the report
    // If the projectsToExclude is an array, we will use the regex to exclude the projects
    if (this.projectsToExclude !== undefined && typeof this.projectsToExclude !== 'string' && this.projectsToExclude.length > 1) {
      this.removeExcludedProjects(config, this.projectsToExclude.join('|'), projectsToReport);
      // If the projectsToExclude is an array with one string, we will use the regex to exclude the projects
    } else if (this.projectsToExclude !== undefined && typeof this.projectsToExclude !== 'string') {
      this.removeExcludedProjects(config, this.projectsToExclude.join(''), projectsToReport);
      // If the projectsToExclude is a string, we will use the regex to exclude the projects
    } else if (this.projectsToExclude !== undefined && typeof this.projectsToExclude === 'string') {
      this.removeExcludedProjects(config, this.projectsToExclude, projectsToReport);
      // If the projectsToExclude is not defined, we will report all the projects
    } else {
      for (const proj of config.projects) {
        projectsToReport.push(proj.name);
      }
    }

    projectsToReport.forEach((p, index) => {
      this.execInfo.browserName += index > 0 ? ', ' : '';
      this.execInfo.browserName += p.charAt(0).toUpperCase() + p.slice(1);
      // Set the first browser as the tested browser
      if (index === 0) {
        this.execInfo.testedBrowser = p;
        if (this.projectsToExclude?.includes(p))
          console.log(
            `${bold(yellow('⏺  '))}${bold(magenta(`Setting for projectsToExclude conflicts with CLI argument. Will go with CLI: ${p}`))}`,
          );
      }
    });
  }

  // biome-ignore lint/complexity/noBannedTypes: Allow for {}
  private removeExcludedProjects(config: FullConfig<{}, {}>, regExp: string, projectsToReport: string[]) {
    const excludedProjects = new RegExp(`^(${regExp})$`);
    const pr = config.projects.filter((p) => {
      if (!excludedProjects.test(p.name)) return p;
      return '';
    });
    for (const proj of pr) {
      projectsToReport.push(proj.name);
    }
  }
}

export default XrayReporter;
export type { XrayTestMetadata } from './metadata';
export { setXrayMetadata } from './metadata';
export * from './types/xray.types';
