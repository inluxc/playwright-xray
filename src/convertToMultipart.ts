import type { XrayMultiPartInfo, XrayTestResult } from "./types/cloud.types";
import type { XrayOptions } from "./types/xray.types";

export async function convertToMultipart(testResult: XrayTestResult, multiPartOptions: XrayOptions["multiPart"]) {
  const summary = testResult.info.summary;
  const testPlanKey = testResult.info.testPlanKey;
  delete testResult.info.project;
  const info = {
    fields: {
      project: { id: multiPartOptions.project?.id },
      summary: summary,
      issuetype: { id: multiPartOptions.issuetype?.id },
      components: multiPartOptions.components === undefined ? [] : multiPartOptions.components,
    },
    xrayFields: {
      testPlanKey: testPlanKey,
      environments: multiPartOptions.xrayFields?.environments === undefined ? [] : multiPartOptions.xrayFields.environments,
    },
  } as XrayMultiPartInfo;

  return { info: JSON.stringify(info), testResult: JSON.stringify(testResult) };
}
