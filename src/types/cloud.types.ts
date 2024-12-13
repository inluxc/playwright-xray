type XrayCloudStatusType = { [key: string]: string };

export const XrayCloudStatus: XrayCloudStatusType = {
  passed: "PASSED",
  failed: "FAILED",
  skipped: "SKIPPED",
  timedOut: "FAILED",
  interrupted: "ABORTED",
};

export interface XrayTestResult {
  testExecutionKey?: string;
  info: XrayInfo;
  tests?: XrayTest[];
}

export interface XrayInfo {
  summary: string;
  project: string;
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
  start?: string;
  finish?: string;
  actualResult?: string;
  status: string;
  evidence?: XrayTestEvidence[];
  iterations?: XrayTestIteration[];
  steps?: XrayTestStep[];
  defects?: object;
  comment?: string;
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
 * @see https://docs.getxray.app/display/XRAYCLOUD/Using+Xray+JSON+format+to+import+execution+results#UsingXrayJSONformattoimportexecutionresults-%22iteration%22object-Data-driventestresults
 */
export interface XrayTestIteration {
  /**
   * A duration for the iteration.
   */
  duration?: string;
  /**
   * The log for the iteration.
   */
  log?: string;
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
   * The status for the iteration (PASSED, FAILED, EXECUTING, TODO, custom statuses ...).
   */
  status: string;
  /**
   * An array of step results (for Manual tests).
   */
  steps?: XrayTestStep[];
}

/**
 * @see https://docs.getxray.app/display/XRAYCLOUD/Using+Xray+JSON+format+to+import+execution+results#UsingXrayJSONformattoimportexecutionresults-%22parameter%22object-parameterswithiniterationresults
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
