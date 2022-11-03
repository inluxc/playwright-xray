"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zephyr_service_1 = require("./zephyr.service");
function convertPwStatusToZephyr(status) {
    if (status === 'passed')
        return 'Pass';
    if (status === 'failed')
        return 'Fail';
    if (status === 'skipped')
        return 'Not Executed';
    if (status === 'timedOut')
        return 'Blocked';
    return 'Not Executed';
}
class ZephyrReporter {
    constructor(options) {
        this.testResults = [];
        this.testCaseKeyPattern = /\[(.*?)\]/;
        this.options = options;
    }
    async onBegin() {
        this.projectKey = this.options.projectKey;
        this.zephyrService = new zephyr_service_1.ZephyrService(this.options);
    }
    onTestEnd(test, result) {
        if (test.title.match(this.testCaseKeyPattern) && test.title.match(this.testCaseKeyPattern).length > 1) {
            const [, projectName] = test.titlePath();
            const [, testCaseId] = test.title.match(this.testCaseKeyPattern);
            const testCaseKey = `${this.projectKey}-${testCaseId}`;
            const status = convertPwStatusToZephyr(result.status);
            // @ts-ignore
            const browserName = test._pool.registrations.get('browserName').fn;
            const capitalize = (word) => word && word[0].toUpperCase() + word.slice(1);
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
            await this.zephyrService.createRun(this.testResults);
        }
        else {
            console.log(`There are no tests with such ${this.testCaseKeyPattern} key pattern`);
        }
    }
}
exports.default = ZephyrReporter;
