type XrayServerStatusType = { [key: string]: string };

export const XrayServerStatus: XrayServerStatusType = {
  passed: 'PASS',
  failed: 'FAIL',
  skipped: 'SKIPPED',
  timedOut: 'FAIL',
  interrupted: 'ABORTED',
};

export interface XrayTestResult {
  testExecutionKey?: string;
  info: XrayInfo;
  tests: XrayTest[];
}

export interface XrayInfo {
  project: string;
  summary: string;
  description: string;
  user: string;
  version: string;
  revision: string;
  startDate: string;
  finishDate: string;
}

export interface XrayTest {
  comment?: string;
  finish?: string;
  start?: string;
  status: string;
  testInfo?: {
    testType: string;
    projectKey: string;
    summary: string;
    scenarioType: string;
    scenario: string;
    definition: string;
    requirementKeys: string;
  };
  testKey: string;
  executedBy?: string;
  evidences?: XrayTestEvidence[];
  iterations?: XrayTestIteration[];
  results?: {
    name: string;
    duration: number;
    log: string;
    status: string;
  }[];
  steps?: XrayTestStep[];
}

export interface XrayTestStep {
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

/**
 * @see https://docs.getxray.app/display/XRAY/Import+Execution+Results#ImportExecutionResults-%22iterations%22object-Data-driventestresults
 */
export interface XrayTestIteration {
  /**
   * The iteration name.
   */
  name?: string;
  /**
   * An array of parameters along with their values.
   *
   * Note: parameters in iterations should exist and have 1 or more elements.
   */
  parameters: [XrayIterationParameter, ...XrayIterationParameter[]];
  /**
   * The status for the iteration (PASS, FAIL, EXECUTING, TODO, custom statuses ...).
   */
  status: string;
}

/**
 * @see https://docs.getxray.app/display/XRAY/Import+Execution+Results#ImportExecutionResults-%22parameters%22object-parameterswithiniterationresults
 */
export interface XrayIterationParameter {
  /**
   * The parameter name.
   */
  name: string;
  /**
   * The parameter value.
   */
  value: string;
}

export interface UpdateTestRunCustomFieldSingle {
  id: number;
  value: string;
}

export interface UpdateTestRunCustomFieldMulti {
  id: number;
  value: string[];
}
