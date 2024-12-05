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
  start: string;
  finish: string;
  actualResult?: string;
  status: string;
  evidence?: XrayTestEvidence[];
  steps?: XrayTestSteps[];
  defects?: object;
  comment: string | undefined;
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
