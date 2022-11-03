import type { XrayOptions, XrayStatus, XrayTestResult } from '../types/xray.types';
import type { Reporter, TestCase, TestResult, TestStatus } from '@playwright/test/reporter';

import { XrayService } from './xray.service';

function convertPwStatusToXRay(status: TestStatus): XrayStatus {
  if (status === 'passed') return 'PASSED';
  if (status === 'failed') return 'FAILED';
  if (status === 'skipped') return 'Not Executed';
  if (status === 'timedOut') return 'Blocked';

  return 'Not Executed';
}

class XrayReporter implements Reporter {
  private xrayService!: XrayService;
  private testResults: XrayTestResult[] = [];
  private projectKey!: string;
  private testCaseKeyPattern = /\[(.*?)\]/;
  private options: XrayOptions;

  constructor(options: XrayOptions) {
    this.options = options;
  }

  async onBegin() {
    this.projectKey = this.options.projectKey;

    this.xrayService = new XrayService(this.options);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.title.match(this.testCaseKeyPattern) && test.title.match(this.testCaseKeyPattern)!.length > 1) {
      const [, projectName] = test.titlePath();
      const [, testCaseId] = test.title.match(this.testCaseKeyPattern)!;
      const testCaseKey = `${this.projectKey}-${testCaseId}`;
      const status = convertPwStatusToXRay(result.status);
      // @ts-ignore
      const browserName = test._pool.registrations.get('browserName').fn;
      const capitalize = (word: string) => word && word[0]!.toUpperCase() + word.slice(1);

      this.testResults.push({
        testCaseKey,
        status,
        environment: projectName || capitalize(browserName),
        executionDate: new Date().toISOString(),
      });
    }
  }

  async onEnd() {
    if (this.testResults.length > 0) {
      await this.xrayService.createRun(this.testResults);
    } else {
      console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
    }
  }
}

export default XrayReporter;
