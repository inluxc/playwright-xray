import type { TestInfo } from '@playwright/test';
import type { TestResult } from '@playwright/test/reporter';

/**
 * The key where Xray related data will be stored in the test attachments.
 */
const ATTACHMENT_KEY = 'xray-metadata';

/**
 * Models Xray-specific metadata that is relevant for this test.
 */
export interface XrayTestMetadata {
  /**
   * Xray iteration parameters to set for the current test.
   *
   * @see https://docs.getxray.app/display/XRAY/Parameterized+Tests
   * @see https://docs.getxray.app/display/XRAYCLOUD/Parameterized+Tests
   */
  parameters?: Record<string, string>;
}

/**
 * Attaches Xray-specific metadata to (e.g. parameterised test iteration values) to a test run.
 *
 * This data is processed during upload to Xray and is also visible in HTML reports.
 *
 * @example
 *
 * ```ts
 * for (const name of ['Bob', 'George', 'Linda']) {
 *   test(`XRAYTEST-123 | Log in as ${name}`, async ({}, testInfo) => {
 *     setXrayInfo(testInfo, { parameters: { user: name } });
 *     // ...
 *   });
 * }
 * ```
 *
 * @param testInfo - the Playwright test info object provided to the test
 * @param metadata - Xray-specific metadata to attach to the test
 */
export async function setXrayMetadata(testInfo: TestInfo, metadata: XrayTestMetadata): Promise<void> {
  await testInfo.attach(ATTACHMENT_KEY, {
    body: JSON.stringify(metadata, null, 2),
    contentType: 'application/json',
  });
}

/**
 * Retrieves any Xray-related metadata that was previously attached to a test.
 *
 * @param testResult - the Playwright test result
 * @returns The parsed Xray metadata object, or `undefined` if not available
 */
export function getXrayMetadata(testResult: TestResult): XrayTestMetadata | undefined {
  const existingAttachment = testResult.attachments.find((attachment) => attachment.name === ATTACHMENT_KEY);
  if (!existingAttachment || !existingAttachment.body) {
    return;
  }
  return JSON.parse(existingAttachment.body.toString('utf-8'));
}
