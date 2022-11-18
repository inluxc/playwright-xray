import type { XrayTestResult, XrayTest, XrayTestSteps } from '../types/cloud.types';
import type { XrayOptions } from '../types/xray.types';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import { XrayService } from './xray.service';

class XrayReporter implements Reporter {
  private xrayService!: XrayService;
  private testResults!: XrayTestResult;
  private testCaseKeyPattern = /\[(.*?)\]/;
  private options: XrayOptions;
  private totalDuration: number;
  private readonly defaultRunName = `[${new Date().toUTCString()}] - Automated run`;

  constructor(options: XrayOptions) {
    this.options = options;
    this.xrayService = new XrayService(this.options);
    this.totalDuration = 0;

    //const finishTime = new Date(this.xrayService.startTime.getTime() + (result.duration * 1000));
    const testResults: XrayTestResult = {
      info: {
        summary: this.defaultRunName,
        startDate: new Date().toISOString(),
        finishDate: new Date().toISOString(),
        testPlanKey: this.options.testPlan,
        revision: '2536',
      },
      tests: [] as XrayTest[],
    };
    this.testResults = testResults;
  }

  async onBegin() {}

  async onTestEnd(testCase: TestCase, result: TestResult) {
    const testCaseId = testCase.title.match(this.testCaseKeyPattern);
    const testCode: string = testCaseId != null ? testCaseId[1]! : '';
    if (testCode != '') {
      // @ts-ignore
      const browserName = testCase._pool.registrations.get('browserName').fn;
      const finishTime = new Date(result.startTime.getTime() + result.duration * 1000);
      this.totalDuration = this.totalDuration + result.duration;

      let xrayTestData: XrayTest = {
        testKey: testCode,
        status: result.status.toUpperCase(),
        start: result.startTime.toISOString(),
        finish: finishTime.toISOString(),
        steps: [] as XrayTestSteps[],
      };

      // Generated step and error messages
      await Promise.all(
        result.steps.map(async (step) => {
          if (step.category != 'hook') {
            const xrayTestStep: XrayTestSteps = {
              status: typeof step.error == 'object' ? 'FAILED' : 'SUCCESS',
              comment: step.title,
              actualResult: typeof step.error == 'object' ? step.error.message?.toString()! : '',
            };
            xrayTestData.steps!.push(xrayTestStep);
          }
        }),
      );
      this.testResults.tests!.push(xrayTestData);
    }
  }

  async onEnd() {
    // Update test Duration
    this.testResults.info.finishDate = new Date(new Date(this.testResults.info.startDate).getTime() + this.totalDuration).toISOString();

    if (typeof this.testResults != 'undefined' && typeof this.testResults.tests != 'undefined' && this.testResults.tests.length > 0) {
      await this.xrayService.createRun(this.testResults);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }
}

export default XrayReporter;
