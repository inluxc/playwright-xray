import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FullConfig, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { blue, bold, green, red, white, yellow } from 'picocolors';
import type { XrayTest, XrayTestEvidence, XrayTestResult, XrayTestSteps } from './types/cloud.types';
import type { XrayOptions } from './types/xray.types';

import Help from './help';
import type { ExecInfo } from './types/execInfo.types';
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
  private stepCategories = ['expect', 'pw:api', 'test.step'];

  constructor(options: XrayOptions) {
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.xrayService = new XrayService(this.options);
    this.totalDuration = 0;
    this.uploadScreenShot = options.uploadScreenShot;
    this.uploadTrace = options.uploadTrace;
    this.uploadVideo = options.uploadVideo;
    this.stepCategories = options.stepCategories === undefined ? this.stepCategories : options.stepCategories;
    const testResults: XrayTestResult = {
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
    this.testResults = testResults;
    console.log(`${bold(blue('-------------------------------------'))}`);
    console.log(`${bold(blue(' '))}`);
    if (this.options.summary !== undefined) testResults.info.summary = this.options.summary;
    this.execInfo = {
      browserName: '',
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    config.projects.forEach((p, index) => {
      this.execInfo.browserName += index > 0 ? ', ' : '';
      this.execInfo.browserName += p.name.charAt(0).toUpperCase() + p.name.slice(1);
    });
    if (this.options.dryRun) {
      console.log(`${bold(yellow('⏺  '))}${bold(blue(`Starting a Dry Run with ${suite.allTests().length} tests`))}`);
    } else {
      console.log(`${bold(yellow('⏺  '))}${bold(blue(`Starting the run with ${suite.allTests().length} tests`))}`);
    }

    console.log(`${bold(blue(' '))}`);
  }

  async onTestBegin(test: TestCase) {
    if (this.execInfo.testedBrowser === undefined) {
      this.execInfo.testedBrowser = test.parent.parent?.title;
      console.log(
        `${bold(yellow('⏺  '))}${bold(blue(`The following test execution will be imported & reported:  ${this.execInfo.testedBrowser}`))}`,
      );
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
      // @ts-ignore
      const finishTime = new Date(result.startTime.getTime() + result.duration);
      this.totalDuration = this.totalDuration + result.duration;

      const xrayTestData: XrayTest = {
        testKey: testCode,
        status: this.help.convertPwStatusToXray(result.status),
        start: this.help.getFormatData(result.startTime),
        finish: this.help.getFormatData(finishTime),
        steps: [] as XrayTestSteps[],
        comment: '',
      };

      // Set Test Error
      const pwStepsExists = result.steps.some((step) => step.category.includes('test.step'));
      if (result.errors.length > 0 && !pwStepsExists) {
        xrayTestData.comment = this.stripAnsi(JSON.stringify(result.errors).replace(/\\\\/g, '\\'));
      } else {
        await Promise.all(
          result.steps.map(async (step) => {
            if (this.stepCategories.some((type) => type.includes(step.category))) {
              // Add Step to request
              const errorMessage = this.stripAnsi(step.error?.stack?.valueOf() as string);
              const received = errorMessage ? this.receivedRegEx.exec(errorMessage) : null;
              let dataReceived = '';
              if (received?.[1] !== undefined) {
                dataReceived = received?.[1];
              }

              const xrayTestStep: XrayTestSteps = {
                status:
                  typeof step.error === 'object' ? this.help.convertPwStatusToXray('failed') : this.help.convertPwStatusToXray('passed'),
                comment: typeof step.error === 'object' ? errorMessage : '',
                actualResult: dataReceived,
              };
              xrayTestData.steps?.push(xrayTestStep);
            }
          }),
        );
      }

      // Get evidences from test results (video, images, text)
      const evidences: XrayTestEvidence[] = [];
      if (result.attachments.length > 0) {
        result.attachments.map(async (attach) => {
          if (attach.name.includes('screenshot') && this.uploadScreenShot) {
            await this.addEvidence(attach, evidences);
          }
          if (attach.name.includes('trace') && this.uploadTrace) {
            await this.addEvidence(attach, evidences);
          }
          if (attach.name.includes('video') && this.uploadVideo) {
            await this.addEvidence(attach, evidences);
          }
        });
      }

      xrayTestData.evidence = evidences;
      this.testResults.tests?.push(xrayTestData);
      let projectID = '';
      const tst: string = JSON.stringify(testCase.parent.project()).match(/__projectIdd":"(.*)"/)?.[1] as string;
      if (tst !== undefined) {
        projectID = `${tst.charAt(0).toUpperCase() + tst.slice(1)} | `;
      }

      switch (this.help.convertPwStatusToXray(result.status)) {
        case 'PASS':
        case 'PASSED':
          console.log(`${bold(green(`✅ ${projectID}${testCase.title}`))}`);
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

  private stripAnsi(step: string) {
    if (step === undefined) {
      return '';
    }
    const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)';
    const pattern = [
      `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
      '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
    ].join('|');
    let errorMessage = step.replace(new RegExp(pattern, 'g'), '');
    errorMessage = errorMessage.replace(
      /(\\u001b)(8|7|H|>|\[(\?\d+(h|l)|[0-2]?(K|J)|\d*(A|B|C|D\D|E|F|G|g|i|m|n|S|s|T|u)|1000D\d+|\d*;\d*(f|H|r|m)|\d+;\d+;\d+m))/g,
      '',
    );
    return errorMessage;
  }

  async addEvidence(
    attach: {
      name: string;
      contentType: string;
      path?: string | undefined;
      body?: Buffer | undefined;
    },
    evidences: XrayTestEvidence[],
  ) {
    if (!attach.path) {
      throw new Error('Attachment path is undefined');
    }
    const filename = path.basename(attach.path);
    const attachData = fs.readFileSync(attach.path, { encoding: 'base64' });
    const evid: XrayTestEvidence = {
      data: attachData,
      filename: filename,
      contentType: attach.contentType,
    };
    evidences.push(evid);
  }

  async onEnd() {
    // Update test Duration
    this.testResults.info.finishDate = this.help.getFormatData(
      new Date(new Date(this.testResults?.info?.startDate ?? new Date()).getTime() + this.totalDuration),
    );

    if (typeof this.testResults !== 'undefined' && typeof this.testResults.tests !== 'undefined' && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults, this.execInfo);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }
}

export default XrayReporter;
export * from './types/xray.types';
