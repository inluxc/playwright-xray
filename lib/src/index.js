"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xray_service_1 = require("./xray.service");
class XrayReporter {
    constructor(options) {
        this.testCaseKeyPattern = /\[(.*?)\]/;
        this.defaultRunName = `[${new Date().toUTCString()}] - Automated run`;
        this.options = options;
        this.xrayService = new xray_service_1.XrayService(this.options);
        this.totalDuration = 0;
        //const finishTime = new Date(this.xrayService.startTime.getTime() + (result.duration * 1000));
        const testResults = {
            info: {
                summary: this.defaultRunName,
                startDate: new Date().toISOString(),
                finishDate: new Date().toISOString(),
                testPlanKey: this.options.testPlan,
                revision: '2536',
            },
            tests: [],
        };
        this.testResults = testResults;
    }
    async onBegin() { }
    async onTestEnd(testCase, result) {
        const testCaseId = testCase.title.match(this.testCaseKeyPattern);
        const testCode = testCaseId != null ? testCaseId[1] : '';
        if (testCode != '') {
            // @ts-ignore
            const browserName = testCase._pool.registrations.get('browserName').fn;
            const finishTime = new Date(result.startTime.getTime() + result.duration * 1000);
            this.totalDuration = this.totalDuration + result.duration;
            let xrayTestData = {
                testKey: testCode,
                status: result.status.toUpperCase(),
                start: result.startTime.toISOString(),
                finish: finishTime.toISOString(),
                steps: [],
            };
            // Generated step and error messages
            await Promise.all(result.steps.map(async (step) => {
                if (step.category != 'hook') {
                    const xrayTestStep = {
                        status: typeof step.error == 'object' ? 'FAILED' : 'SUCCESS',
                        comment: step.title,
                        actualResult: typeof step.error == 'object' ? step.error.message?.toString() : '',
                    };
                    xrayTestData.steps.push(xrayTestStep);
                }
            }));
            this.testResults.tests.push(xrayTestData);
        }
    }
    async onEnd() {
        // Update test Duration
        this.testResults.info.finishDate = new Date(new Date(this.testResults.info.startDate).getTime() + this.totalDuration).toISOString();
        if (typeof this.testResults != 'undefined' && typeof this.testResults.tests != 'undefined' && this.testResults.tests.length > 0) {
            await this.xrayService.createRun(this.testResults);
        }
        else {
            console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
        }
    }
}
exports.default = XrayReporter;
