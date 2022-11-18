import type { XrayOptions } from '../types/xray.types';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
declare class XrayReporter implements Reporter {
    private xrayService;
    private testResults;
    private testCaseKeyPattern;
    private options;
    private totalDuration;
    private readonly defaultRunName;
    constructor(options: XrayOptions);
    onBegin(): Promise<void>;
    onTestEnd(testCase: TestCase, result: TestResult): Promise<void>;
    onEnd(): Promise<void>;
}
export default XrayReporter;
