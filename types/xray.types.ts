import type { AxiosRequestConfig } from 'axios';

export interface XrayOptions extends AxiosRequestConfig {
  host: string;
  user?: string;
  password?: string;
  authorizationToken?: string;
  projectKey: string;
}

export type XrayStatus = 'PASSED' | 'FAILED' | 'EXECUTING' | 'TODO';

export type XrayTestResult = {
  testExecutionKey: string;
  info: Info;
  tests?: Tests;
};

/* 
Info - Test Execution issue
You can specify which Test Execution issue to import the results by setting the test execution key on the testExecutionKey property. 
Alternatively, you can create a new Test Execution issue for the execution results and specify the issue fields within the info object.
*/
export type Info = {
  project: string,            // The project key where the test execution will be created
  summary: string,            // The summary for the test execution issue
  description: string,        // The description for the test execution issue
  version: string,            // The version name for the Fix Version field of the test execution issue
  revision: string,           // A revision for the revision custom field
  user: string,               // The userid for the Jira user who executed the tests
  startDate: string,          // The start date for the test execution issue
  finishDate: string,         // The finish date for the test execution issue
  testPlanKey: string,        // The test plan key for associating the test execution issue
  testEnvironments: string,   // The test environments for the test execution issue
};

/* 
Test - Test Run details
The test run details object allows you to import any detail about the execution itself. All Xray test types are supported. 
It is possible to import a single result (the test object itself with the "steps" (Manual tests) or "examples" (BDD tests)) or multiple execution results into the same Test Run (data-driven testing) using the "iterations" array.
*/

export type Tests = {
  testKey: string,        // The test issue key
  testInfo: string,       // The testInfo element (link)
  start: string,          // The start date for the test run
  finish: string,         // The finish date for the test run
  comment: string,        // The comment for the test run
  executedBy: string,     // The user id who executed the test run
  assignee: string,       // The user id for the assignee of the test run
  status: string,         // The test run status (PASSED, FAILED, EXECUTING, TODO, custom statuses ...)
  steps: string,          // The step results (link)
  examples: string,       // The example results for BDD tests (link)
  iterations: string,     // The iteration containing data-driven test results (link)
  defects: string,        // An array of defect issue keys to associate with the test run
  evidence: string,       // An array of evidence items of the test run (link)
  customFields: string,   // An array of custom fields for the test run (link)
};

