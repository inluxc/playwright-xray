export declare type XrayStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
export interface XrayTestResult {
    testExecutionKey?: string;
    info: XrayInfo;
    tests?: XrayTest[];
}
export interface XrayInfo {
    summary: string;
    description?: string;
    version?: string;
    user?: string;
    revision?: string;
    startDate: string;
    finishDate: string;
    testPlanKey: string;
    testEnvironments?: object;
}
export interface XrayTest {
    testKey: string;
    start: string;
    finish: string;
    actualResult?: string;
    status: string;
    evidence?: XrayTestEvidence[];
    steps?: XrayTestSteps[];
    defects?: object;
}
export interface XrayTestSteps {
    status: string;
    comment?: string;
    actualResult?: string;
    evidences?: XrayTestEvidence[];
}
export interface XrayTestEvidence {
    data: string;
    filename: string;
    contentType: string;
}
