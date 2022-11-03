import type { ZephyrOptions } from '../types/zephyr.types';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
declare class ZephyrReporter implements Reporter {
    private zephyrService;
    private testResults;
    private projectKey;
    private testCaseKeyPattern;
    private options;
    constructor(options: ZephyrOptions);
    onBegin(): Promise<void>;
    onTestEnd(test: TestCase, result: TestResult): void;
    onEnd(): Promise<void>;
}
export default ZephyrReporter;
