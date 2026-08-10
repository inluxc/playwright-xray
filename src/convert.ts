import fs from "node:fs";
import path from "node:path";
import type { TestResult, TestStatus } from "@playwright/test/reporter";
import Help from "./help";
import { getXrayMetadata } from "./metadata";
import {
  XrayCloudStatus,
  type XrayIterationParameter as XrayIterationParameterCloud,
  type XrayTest as XrayTestCloud,
  type XrayTestEvidence as XrayTestEvidenceCloud,
  type XrayTestIteration as XrayTestIterationCloud,
} from "./types/cloud.types";
import {
  type XrayIterationParameter as XrayIterationParameterServer,
  XrayServerStatus,
  type XrayTestEvidence as XrayTestEvidenceServer,
  type XrayTestIteration as XrayTestIterationServer,
  type XrayTest as XrayTestServer,
  type XrayTestStep as XrayTestStepServer,
} from "./types/server.types";
import type { JiraXrayStatusMapping } from "./types/xray.types";

type XrayTest = XrayTestServer | XrayTestCloud;
type XrayTestIteration = XrayTestIterationServer | XrayTestIterationCloud;
type XrayTestStep = XrayTestStepServer | XrayTestCloud;
type XrayTestEvidence = XrayTestEvidenceServer | XrayTestEvidenceCloud;
type XrayIterationParameter = XrayIterationParameterServer | XrayIterationParameterCloud;

/**
 * A single Playwright test result together with the name of the project that produced it.
 */
export type TestResultEntry = {
  result: TestResult;
  project?: string;
};

/**
 * Converts a map of issue keys and Playwright test results to Xray JSON. If there are multiple tests grouped under a single issue key, a
 * corresponding Xray test with iterations will be returned. Otherwise, a single Xray test will be returned without iteration data.
 *
 * Note: it does not matter where the results come from. They can be retries, data-driven results for a single test, or results from
 * different Playwright projects (e.g. multiple browsers or dependent projects). All will be converted to iterations accordingly.
 *
 * @param groupedResults the mapping of issue keys to Playwright results
 * @param options additional conversion options
 * @returns the corresponding Xray test JSON
 */
export async function convertToXrayJson(groupedResults: Map<string, TestResultEntry[]>, options: ConversionOptions): Promise<XrayTest[]> {
  const xrayTests: XrayTest[] = [];
  for (const [issueKey, entries] of groupedResults) {
    xrayTests.push(await getTest(issueKey, entries, options));
  }
  return xrayTests;
}

type ConversionOptions = {
  jiraType: "server" | "cloud";
  stepCategories: string[];
  receivedRegEx: RegExp;
  uploadScreenshot?: boolean;
  uploadTrace?: boolean;
  uploadVideo?: boolean;
  jiraXrayStatusMapping?: Partial<JiraXrayStatusMapping>;
};

async function getTest(issueKey: string, entries: TestResultEntry[], options: ConversionOptions): Promise<XrayTest> {
  const help = new Help(options.jiraType);
  const results = entries.map((entry) => entry.result);
  let xrayTest: XrayTest;

  if (options.jiraType === "cloud") {
    xrayTest = {
      status: getTestStatus(entries, options),
      testKey: issueKey,
      evidence: await getEvidences(results, options),
    };
  } else {
    xrayTest = {
      status: getTestStatus(entries, options),
      testKey: issueKey,
      evidences: await getEvidences(results, options),
    };
  }

  if (entries.length > 1) {
    // If the same test key produced results across more than one Playwright project (e.g. multiple
    // browsers, or dependent projects), label each iteration with its project name instead of a plain
    // counter, since Xray already numbers iterations itself.
    const distinctProjects = new Set(entries.map((entry) => entry.project).filter((project): project is string => !!project));
    const iterations: XrayTestIteration[] = [];
    for (let i = 0; i < entries.length; i++) {
      const { result, project } = entries[i];
      const metadata = getXrayMetadata(result);
      const iterationParameters: XrayIterationParameter[] = Object.entries(metadata?.parameters ?? {}).map(([key, value]) => {
        return { name: key, value: value };
      });
      const iterationParameter: XrayIterationParameter =
        distinctProjects.size > 1 && project !== undefined
          ? { name: "project", value: project }
          : { name: "iteration", value: (iterations.length + 1).toString() };
      iterations.push({
        status: getIterationStatus(result.status, options),
        parameters: [iterationParameter, ...iterationParameters],
        steps: getSteps(result, options),
      });
    }
    xrayTest.iterations = iterations;
    xrayTest.start = help.getFormatData(new Date(Math.min(...results.map((result) => result.startTime.getTime()))));
    xrayTest.finish = help.getFormatData(new Date(Math.max(...results.map((result) => result.startTime.getTime() + result.duration))));
    xrayTest.comment = getCommentIterations(results);
  } else {
    const result = results[0];
    xrayTest.start = help.getFormatData(result.startTime);
    xrayTest.finish = help.getFormatData(new Date(result.startTime.getTime() + result.duration));
    xrayTest.comment = getComment(result);
    xrayTest.steps = getSteps(result, options);
  }

  return xrayTest;
}

type AggregateStatus = "failed" | "interrupted" | "skipped" | "passed";

/**
 * Determines the overall status for a test key across all of its results.
 *
 * Results are first grouped by Playwright project. Within a project, retries are flaky-forgiving
 * (one passing attempt is enough for that project to count as passed) - but a project that genuinely
 * failed is never masked by another project passing: any project failing fails the whole test.
 */
function getTestStatus(entries: TestResultEntry[], options: ConversionOptions) {
  const resultsByProject = groupResultsByProject(entries);
  const projectStatuses = resultsByProject.map((results) => getAggregateStatus(results));

  let overall: AggregateStatus;
  if (projectStatuses.includes("failed")) {
    overall = "failed";
  } else if (projectStatuses.includes("interrupted")) {
    overall = "interrupted";
  } else if (projectStatuses.every((status) => status === "skipped")) {
    overall = "skipped";
  } else {
    // Note: flaky tests are also considered passing by default.
    overall = "passed";
  }

  return getIterationStatus(overall, options);
}

function getAggregateStatus(results: TestResult[]): AggregateStatus {
  if (results.every((result) => result.status === "failed" || result.status === "timedOut")) {
    return "failed";
  }
  if (results.some((result) => result.status === "interrupted")) {
    return "interrupted";
  }
  if (results.every((result) => result.status === "skipped")) {
    return "skipped";
  }
  return "passed";
}

function groupResultsByProject(entries: TestResultEntry[]): TestResult[][] {
  const resultsByProject = new Map<string, TestResult[]>();
  for (const entry of entries) {
    const project = entry.project ?? "";
    const results = resultsByProject.get(project);
    if (results) {
      results.push(entry.result);
    } else {
      resultsByProject.set(project, [entry.result]);
    }
  }
  return [...resultsByProject.values()];
}

function getIterationStatus(status: TestStatus, options: ConversionOptions) {
  const { jiraXrayStatusMapping, jiraType } = options;

  // Use the provided 'jiraXrayStatusMapping', or select the appropriate status mapping
  // based on whether the jiraType is 'server' or 'cloud'
  const mapping = jiraXrayStatusMapping ?? (jiraType === "server" ? XrayServerStatus : XrayCloudStatus);

  // If a mapping exists and the status is found in the mapping, return the corresponding value
  if (mapping && status in mapping) {
    const result = mapping[status as keyof typeof mapping];
    if (result === undefined) {
      throw new Error(`Status "${status}" not found for jiraType "${jiraType}".`);
    }
    return result;
  }

  // If jiraType is 'server' and the status is found in XrayServerStatus, return the value from XrayServerStatus
  if (jiraType === "server" && status in XrayServerStatus) {
    return XrayServerStatus[status as keyof typeof XrayServerStatus];
    // If jiraType is 'cloud' and the status is found in XrayCloudStatus, return the value from XrayCloudStatus
  }
  if (jiraType === "cloud" && status in XrayCloudStatus) {
    return XrayCloudStatus[status as keyof typeof XrayCloudStatus];
  }

  throw new Error(`Status "${status}" not found for jiraType "${jiraType}".`);
}

function getComment(result: TestResult) {
  if (result.errors.length > 0) {
    const comment = stripAnsi(JSON.stringify(result.errors).replace(/\\\\/g, "\\"));
    // Add Line breaks properly for the Xray comment field
    const commentWithLineBreaks = comment.replace(/\\n/g, "\n");
    const formatSnippet = `${commentWithLineBreaks.replace(',"snippet":"', "\n{code:JavaScript|title=Error|borderStyle=solid}\nsnippet->\n")}\n<-snippet{code}`;
    return formatSnippet;
  }
  return undefined;
}

function getCommentIterations(iterations: TestResult[]) {
  const errors: string[] = [];
  for (let i = 0; i < iterations.length; i++) {
    const comment = getComment(iterations[i]);
    if (comment) {
      errors.push(`Iteration ${i + 1}: ${comment}`);
    }
  }
  return errors.join("\n");
}

function getSteps(result: TestResult, options: ConversionOptions) {
  const steps: XrayTestStep[] = [];
  for (const step of result.steps) {
    if (options.stepCategories.some((category) => category.includes(step.category))) {
      // Add Step to request
      const errorMessage = stripAnsi(step.error?.stack?.valueOf() as string);
      const received = errorMessage ? options.receivedRegEx.exec(errorMessage) : null;
      let dataReceived = "";
      if (received?.[1] !== undefined) {
        dataReceived = received?.[1];
      }
      const xrayTestStep: XrayTestStep = {
        status: step.error !== undefined ? getIterationStatus("failed", options) : getIterationStatus("passed", options),
        comment: step.error !== undefined ? errorMessage : "",
        actualResult: dataReceived,
      };
      steps.push(xrayTestStep);
    }
  }
  return steps;
}

async function getEvidences(results: TestResult[], options: ConversionOptions) {
  const evidences: XrayTestEvidence[] = [];
  if (results.length > 1) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      // Evidence can only be added to iteration steps, not the iterations themselves.
      // But we can still attach iteration evidence to the test itself.
      for (const evidence of await getEvidence(result, options, `iteration_${i + 1}_`)) {
        evidences.push(evidence);
      }
    }
  } else {
    for (const evidence of await getEvidence(results[0], options)) {
      evidences.push(evidence);
    }
  }
  return evidences;
}

async function getEvidence(result: TestResult, options: ConversionOptions, prefix?: string) {
  // Get evidences from test results (video, images, text)
  const evidences: XrayTestEvidence[] = [];
  if (result.attachments.length > 0) {
    await Promise.all(
      result.attachments.map(async (attach) => {
        if (attach.name.includes("screenshot") && options.uploadScreenshot) {
          await addEvidence(attach, evidences, prefix);
        }
        if (attach.name.includes("trace") && options.uploadTrace) {
          await addEvidence(attach, evidences, prefix);
        }
        if (attach.name.includes("video") && options.uploadVideo) {
          await addEvidence(attach, evidences, prefix);
        }
      }),
    );
  }
  return evidences;
}

function stripAnsi(step: string) {
  if (step === undefined) {
    return "";
  }
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  ].join("|");
  let errorMessage = step.replace(new RegExp(pattern, "g"), "");
  errorMessage = errorMessage.replace(
    /(\\u001b)(8|7|H|>|\[(\?\d+(h|l)|[0-2]?(K|J)|\d*(A|B|C|D\D|E|F|G|g|i|m|n|S|s|T|u)|1000D\d+|\d*;\d*(f|H|r|m)|\d+;\d+;\d+m))/g,
    "",
  );
  return errorMessage;
}

async function addEvidence(attach: TestResult["attachments"][number], evidences: XrayTestEvidence[], prefix?: string) {
  if (!attach.path) {
    throw new Error("Attachment path is undefined");
  }
  const filename = `${prefix ?? ""}${path.basename(attach.path)}`;
  const attachData = fs.readFileSync(attach.path, { encoding: "base64" });
  const evid: XrayTestEvidence = {
    data: attachData,
    filename: filename,
    contentType: attach.contentType,
  };
  evidences.push(evid);
}
