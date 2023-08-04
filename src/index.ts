import type { XrayTestResult, XrayTestSteps, XrayTestEvidence, XrayTest } from './types/cloud.types';
import type { XrayOptions } from './types/xray.types';
import type { Reporter, TestCase, TestResult, FullConfig, Suite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { blue, bold, green, red, yellow } from 'picocolors';

import { XrayService } from './xray.service';
import Help from './help';
import { ExecInfo } from './types/execInfo.types';

class XrayReporter implements Reporter {
  private xrayService!: XrayService;
  private testResults!: XrayTestResult;
  private testCaseKeyPattern = /^(.*?) |$/;
  private receivedRegEx: RegExp = /Received string: "(.*?)"(?=\n)/;
  private options: XrayOptions;
  private execInfo!: ExecInfo;
  private totalDuration: number;
  private readonly defaultRunName = `[${new Date().toUTCString()}] - Automated run`;
  private help: Help;

  constructor(options: XrayOptions) {
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.xrayService = new XrayService(this.options);
    this.totalDuration = 0;
    const testResults: XrayTestResult = {
      testExecutionKey: this.options.testExecution,
      info: {
        summary: this.defaultRunName,
        project: this.options.project,
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
    console.log(`${bold(blue(`-------------------------------------`))}`);
    console.log(`${bold(blue(` `))}`);

    this.execInfo = {
      browserName: '',
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    config.projects.forEach((p, index) => {
      this.execInfo.browserName += index > 0 ? ', ' : '';
      this.execInfo.browserName += p.name.charAt(0).toUpperCase() + p.name.slice(1);
    });
    console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Starting the run with ${suite.allTests().length} tests`))}`);
    console.log(`${bold(blue(` `))}`);
  }

  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCode: string = testCaseId != null ? testCaseId[1]! : '';
    if (testCode != '') {
      // @ts-ignore
      const finishTime = new Date(result.startTime.getTime() + result.duration);
      this.totalDuration = this.totalDuration + result.duration;

      let xrayTestData: XrayTest = {
        testKey: testCode,
        status: this.help.convertPwStatusToXray(result.status),
        start: this.help.getFormatData(result.startTime),
        finish: this.help.getFormatData(finishTime),
        steps: [] as XrayTestSteps[],
        comment: '',
      };

      // Set Test Error
      if (result.errors.length > 0) {
        xrayTestData.comment = JSON.stringify(result.errors);
      } else {
        await Promise.all(
          result.steps.map(async (step) => {
            if (step.category != 'hook') {
              // Add Step to request
              const errorMessage = step.error?.stack
                ?.toString()
                ?.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
              const received = this.receivedRegEx.exec(errorMessage!);
              let dataReceived = '';
              if (received?.[1] !== undefined) {
                dataReceived = received?.[1];
              }

              const xrayTestStep: XrayTestSteps = {
                status:
                  typeof step.error == 'object' ? this.help.convertPwStatusToXray('failed') : this.help.convertPwStatusToXray('passed'),
                comment: typeof step.error == 'object' ? errorMessage : '',
                actualResult: dataReceived,
              };
              xrayTestData.steps!.push(xrayTestStep);
            }
          }),
        );
      }

      // Get evidences from test results (video, images, text)
      const evidences: XrayTestEvidence[] = [];
      if (result.attachments.length > 0) {
        result.attachments.map(async (attach) => {
          const filename = path.basename(attach.path!);
          const attachData = fs.readFileSync(attach.path!, { encoding: 'base64' });
          const evid: XrayTestEvidence = {
            data: attachData,
            filename: filename,
            contentType: attach.contentType,
          };
          evidences.push(evid);
        });
      }

      xrayTestData.evidence = evidences;
      this.testResults.tests!.push(xrayTestData);

      let projectID = '';
      let tst: any = testCase;
      if (tst._projectId !== undefined) {
        projectID = tst._projectId;
        projectID = projectID.charAt(0).toUpperCase() + projectID.slice(1) + ' | ';
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
          console.log(`${bold(yellow(`🚫 ${projectID}${testCase.title}`))}`);
          break;
      }
    }
  }

  async onEnd() {
    // Update test Duration
    this.testResults.info.finishDate = this.help.getFormatData(
      new Date(
        new Date((this.testResults && this.testResults.info ? this.testResults.info.startDate : undefined)!).getTime() + this.totalDuration,
      ),
    );

    if (typeof this.testResults != 'undefined' && typeof this.testResults.tests != 'undefined' && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults, this.execInfo);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }
}

export default XrayReporter;
