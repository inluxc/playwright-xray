import type { XrayTestResult, XrayTestSteps, XrayTestEvidence, XrayTest } from './types/cloud.types';
import { XrayCloudStatus } from './types/cloud.types';
import { XrayServerStatus } from './types/server.types';
import type { XrayOptions } from './types/xray.types';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { bold, green, red, yellow } from 'picocolors';
import dayjs from 'dayjs';

import { XrayService } from './xray.service';

class XrayReporter implements Reporter {
  private xrayService!: XrayService;
  private testResults!: XrayTestResult;
  private testCaseKeyPattern = /\[(.*?)\]/;
  private receivedRegEx: RegExp = /Received string: "(.*?)"(?=\n)/;
  private options: XrayOptions;
  private totalDuration: number;
  private readonly defaultRunName = `[${new Date().toUTCString()}] - Automated run`;

  constructor(options: XrayOptions) {
    this.options = options;
    this.xrayService = new XrayService(this.options);
    this.totalDuration = 0;
    const testResults: XrayTestResult = {
      info: {
        summary: this.defaultRunName,
        startDate: this.getFormatData(new Date()),
        finishDate: this.getFormatData(new Date()),
        testPlanKey: this.options.testPlan,
        revision: '2536',
      },
      tests: [] as XrayTest[],
    };
    this.testResults = testResults;
  }

  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCode: string = testCaseId != null ? testCaseId[1]! : '';
    if (testCode != '') {
      // @ts-ignore
      const browserName = testCase._pool.registrations.get('browserName').fn;
      const finishTime = new Date(result.startTime.getTime() + result.duration);
      this.totalDuration = this.totalDuration + result.duration;

      let xrayTestData: XrayTest = {
        testKey: testCode,
        status: this.convertPwStatusToXray(result.status),
        start: this.getFormatData(result.startTime),
        finish: this.getFormatData(finishTime),
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
                status: typeof step.error == 'object' ? this.convertPwStatusToXray('failed') : this.convertPwStatusToXray('passed'),
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

      switch (this.convertPwStatusToXray(result.status)) {
        case 'PASS':
        case 'PASSED':
          console.log(`${bold(green(`✅ ${testCase.title}`))}`);
          break;
        case 'FAIL':
        case 'FAILED':
          console.log(`${bold(red(`⛔ ${testCase.title}`))}`);
          break;
        case 'SKIPPED':
        case 'ABORTED':
          console.log(`${bold(yellow(`🚫 ${testCase.title}`))}`);
          break;
      }
    }
  }

  async onEnd() {
    // Update test Duration
    this.testResults?.info?.finishDate !=
      this.getFormatData(new Date(new Date(this.testResults?.info?.startDate!).getTime() + this.totalDuration));
    if (typeof this.testResults != 'undefined' && typeof this.testResults.tests != 'undefined' && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }

  convertPwStatusToXray(status: string): string {
    switch (this.options.jira.type) {
      case 'cloud':
        return XrayCloudStatus[status];
      case 'server':
        return XrayServerStatus[status];
      default:
        return '';
    }
  }

  getFormatData(date: Date) {
    if (this.options.jira.type === 'cloud') {
      return date.toISOString();
    } else {
      const d = dayjs(date)
      return a.format();
    }
  }
}

export default XrayReporter;
