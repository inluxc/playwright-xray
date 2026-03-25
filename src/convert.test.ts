import assert from "node:assert";
import fs from "node:fs";
import { describe, it } from "node:test";
import type { TestResult } from "@playwright/test/reporter";
import { convertToXrayJson } from "./convert.ts";
import { convertToMultipart } from "./convertToMultipart.ts";
import { ReportUploader } from "./reportUploader.ts";

describe(convertToXrayJson.name, async () => {
  await it("single test", async () => {
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        retry: 0,
        parallelIndex: 0,
        workerIndex: 4,
        duration: 14,
        startTime: new Date("2024-12-05T17:10:51.192Z"),
        stdout: [],
        stderr: [],
        attachments: [],
        status: "passed",
        errors: [],
        steps: [],
      },
    ]);
    assert.deepStrictEqual(
      await convertToXrayJson(map, {
        jiraType: "cloud",
        receivedRegEx: /Received string: "(.*?)"(?=\n)/,
        stepCategories: ["expect", "pw:api", "test.step"],
      }),
      [
        {
          testKey: "ABC-123",
          status: "PASSED",
          start: "2024-12-05T17:10:51.192Z",
          finish: "2024-12-05T17:10:51.206Z",
          evidence: [],
          steps: [],
          comment: undefined,
        },
      ],
    );
  });

  await it("Multipart test", async () => {
    const testExecution = JSON.parse(fs.readFileSync("./src/multipart-test-execution.json", "utf-8"));
    const expectedResult = JSON.parse(fs.readFileSync("./src/multipart-test-result.json", "utf-8"));
    const multipartOptions = {
      multiPartUrl: "https://xray.cloud.getxray.app/",
      project: { id: "19960" },
      issuetype: { id: "10055" },
      components: [{ name: "TEST" }, { name: "TEST-2" }],
    };
    const actual = await convertToMultipart(testExecution, multipartOptions);
    assert.deepStrictEqual(actual, expectedResult);
  });

  await it("Multipart settings xrayFields test", async () => {
    const testConfig = {
      jira: { url: "cloud", apiVersion: "q", type: "cloud" as const },
      projectKey: "TEST",
      testPlan: "",
      debug: false,
      useMultiPart: true,
      multiPart: {
        summary: "summary",
        multiPartUrl: "url",
        project: { id: "123" },
        issuetype: { id: "10123055" },
        components: [{ name: "TEST" }, { name: "TEST-2" }],
      },
    };

    assert.throws(() => new ReportUploader(testConfig), { message: "Multipart options must include xrayFields" });
  });

  await it("Multipart settings project test", async () => {
    const testConfig = {
      jira: { url: "cloud", apiVersion: "q", type: "cloud" as const },
      projectKey: "TEST",
      testPlan: "",
      debug: false,
      useMultiPart: true,
      multiPart: {
        summary: "summary",
        multiPartUrl: "url",
        issuetype: { id: "10123055" },
        components: [{ name: "TEST" }, { name: "TEST-2" }],
        xrayFields: {},
      },
    };

    assert.throws(() => new ReportUploader(testConfig), { message: "Multipart options must include project and issuetype" });
  });

  await it("Multipart settings issuetype test", async () => {
    const testConfig = {
      jira: { url: "cloud", apiVersion: "q", type: "cloud" as const },
      projectKey: "TEST",
      testPlan: "",
      debug: false,
      useMultiPart: true,
      multiPart: {
        summary: "summary",
        multiPartUrl: "url",
        project: { id: "123" },
        components: [{ name: "TEST" }, { name: "TEST-2" }],
        xrayFields: {},
      },
    };

    assert.throws(() => new ReportUploader(testConfig), { message: "Multipart options must include project and issuetype" });
  });

  await it("Multipart settings url test", async () => {
    const testConfig = {
      jira: { url: "cloud", apiVersion: "q", type: "cloud" as const },
      projectKey: "TEST",
      testPlan: "",
      debug: false,
      useMultiPart: true,
      multiPart: {
        summary: "summary",
        issuetype: { id: "10123055" },
        project: { id: "123" },
        components: [{ name: "TEST" }, { name: "TEST-2" }],
        xrayFields: {},
      },
    };

    assert.throws(() => new ReportUploader(testConfig), { message: "Multipart options must include multiPartUrl" });
  });

  await it("Multipart settings sever test", async () => {
    const testConfig = {
      jira: { url: "cloud", apiVersion: "q", type: "server" as const },
      projectKey: "TEST",
      testPlan: "",
      debug: false,
      useMultiPart: true,
      multiPart: {
        summary: "summary",
        issuetype: { id: "10123055" },
        project: { id: "123" },
        components: [{ name: "TEST" }, { name: "TEST-2" }],
        xrayFields: {},
      },
    };

    assert.throws(() => new ReportUploader(testConfig), {
      message:
        "Multipart options only supported for Xray Cloud. Please set useMultipart to false or remove multipart options from the config",
    });
  });

  await it("single test with attachment", async () => {
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        retry: 0,
        parallelIndex: 0,
        workerIndex: 4,
        duration: 14,
        startTime: new Date("2024-12-05T17:10:51.192Z"),
        stdout: [],
        stderr: [],
        attachments: [
          {
            name: "trace",
            path: "./tests/resources/text-attachment.txt",
            contentType: "text/plain",
          },
        ],
        status: "passed",
        errors: [],
        steps: [],
      },
    ]);
    const val = await convertToXrayJson(map, {
      jiraType: "server",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
      uploadTrace: true,
    });

    assert.deepStrictEqual(val, [
      {
        testKey: "ABC-123",
        status: "PASS",
        start: "2024-12-05T18:10:51+01:00",
        finish: "2024-12-05T18:10:51+01:00",
        evidences: [{ data: "aGVsbG8gd29ybGQ=", contentType: "text/plain", filename: "text-attachment.txt" }],
        steps: [],
        comment: undefined,
      },
    ]);
  });

  await it("Single test of comment formatting", async () => {
    const expectedComment = fs.readFileSync("./src/comment.txt", "utf-8");
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        retry: 0,
        parallelIndex: 0,
        workerIndex: 4,
        duration: 14,
        startTime: new Date("2024-12-05T17:10:51.192Z"),
        stdout: [],
        stderr: [],
        attachments: [],
        status: "failed",
        errors: [
          {
            message:
              'Error: Expected to see 24 sessions with Upload Time selected\n\nTimed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class="w-full mb-6"]\').getByText(/.14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value "0"\n',
            stack:
              'Error: Expected to see 24 sessions with Upload Time selected\n\nTimed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value "0"\n\n at /home/runner/work/qa-automation-ui/qa-automation-ui/fitConsole/tests/allSessionsPageTest.spec.ts:271:139","matcherResult":{"actual":0,"expected":24,"message":"Timed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value \\"0\\"\n","name":"toHaveCount","pass":false,"log":[" - Expected to see 24 sessions with Upload Time selected with timeout 5000ms"," - waiting for locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)"," 9 × locator resolved to 0 elements"," - unexpected value \\"0\\""],"timeout":5000}',
            location: {
              file: "/home/runner/work/qa-automation-ui/qa-automation-ui/fitConsole/tests/allSessionsPageTest.spec.ts",
              column: 139,
              line: 271,
            },
            snippet:
              '269 | await allSessionsAllFiltersPage.applyFiltersButton.click();\\n 270 | await page.waitForRequest("//api/v1/health/state/all");\\n> 271 | await expect(allSessionsPage.sessionTable.getByText(date.expectedRegex), Expected to see 24 sessions with Upload Time selected).toHaveCount(24);\\n | ^\\n 272 | }\\n 273 | \\n 274 | });"}]',
          },
        ],
        steps: [],
      },
    ]);
    const expected = [
      {
        status: "FAIL",
        testKey: "ABC-123",
        evidences: [],
        start: "2024-12-05T18:10:51+01:00",
        finish: "2024-12-05T18:10:51+01:00",
        comment: expectedComment,
        steps: [],
      },
    ];
    const actual = await convertToXrayJson(map, {
      jiraType: "server",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
      uploadTrace: true,
    });

    assert.deepStrictEqual(actual, expected);
  });

  await it("Data driven test of comment formatting", async () => {
    const expectedComment = `Iteration 2: ${fs.readFileSync("./src/comment.txt", "utf-8")}`;
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        status: "passed",
        attachments: [],
        duration: 1000,
        errors: [],
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        workerIndex: 0,
      },
      {
        retry: 0,
        parallelIndex: 0,
        workerIndex: 4,
        duration: 14,
        startTime: new Date("2024-12-05T17:10:51.192Z"),
        stdout: [],
        stderr: [],
        attachments: [
          {
            name: "trace",
            path: "./tests/resources/text-attachment.txt",
            contentType: "text/plain",
          },
        ],
        status: "failed",
        errors: [
          {
            message:
              'Error: Expected to see 24 sessions with Upload Time selected\n\nTimed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class="w-full mb-6"]\').getByText(/.14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value "0"\n',
            stack:
              'Error: Expected to see 24 sessions with Upload Time selected\n\nTimed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class="w-full mb-6"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value "0"\n\n at /home/runner/work/qa-automation-ui/qa-automation-ui/fitConsole/tests/allSessionsPageTest.spec.ts:271:139","matcherResult":{"actual":0,"expected":24,"message":"Timed out 5000ms waiting for expect(locator).toHaveCount(expected)\n\nLocator: locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)\nExpected: 24\nReceived: 0\nCall log:\n - Expected to see 24 sessions with Upload Time selected with timeout 5000ms\n - waiting for locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)\n 9 × locator resolved to 0 elements\n - unexpected value \\"0\\"\n","name":"toHaveCount","pass":false,"log":[" - Expected to see 24 sessions with Upload Time selected with timeout 5000ms"," - waiting for locator(\'[class=\\"w-full mb-6\\"]\').getByText(/.*14././)"," 9 × locator resolved to 0 elements"," - unexpected value \\"0\\""],"timeout":5000}',
            location: {
              file: "/home/runner/work/qa-automation-ui/qa-automation-ui/fitConsole/tests/allSessionsPageTest.spec.ts",
              column: 139,
              line: 271,
            },
            snippet:
              '269 | await allSessionsAllFiltersPage.applyFiltersButton.click();\\n 270 | await page.waitForRequest("//api/v1/health/state/all");\\n> 271 | await expect(allSessionsPage.sessionTable.getByText(date.expectedRegex), Expected to see 24 sessions with Upload Time selected).toHaveCount(24);\\n | ^\\n 272 | }\\n 273 | \\n 274 | });"}]',
          },
        ],
        steps: [],
      },
    ]);

    const expected = [
      {
        status: "PASS",
        testKey: "ABC-123",
        evidences: [{ data: "aGVsbG8gd29ybGQ=", filename: "iteration_2_text-attachment.txt", contentType: "text/plain" }],
        iterations: [
          {
            status: "PASS",
            parameters: [
              {
                name: "iteration",
                value: "1",
              },
            ],
            steps: [],
          },
          {
            status: "FAIL",
            parameters: [
              {
                name: "iteration",
                value: "2",
              },
            ],
            steps: [],
          },
        ],
        start: "1970-01-01T01:00:00+01:00",
        finish: "2024-12-05T18:10:51+01:00",
        comment: expectedComment,
      },
    ];
    const actual = await convertToXrayJson(map, {
      jiraType: "server",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
      uploadTrace: true,
    });
    assert.deepStrictEqual(actual, expected);
  });

  await it("single data-driven test", async () => {
    const expectedComment = fs.readFileSync("./src/comment2.txt", "utf-8");
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        status: "passed",
        attachments: [],
        duration: 1000,
        errors: [],
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        workerIndex: 0,
      },
      {
        status: "failed",
        attachments: [],
        duration: 5000,
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        errors: [
          {
            message:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
            stack:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
            location: {
              file: "/home/pw/tests/example.spec.ts",
              column: 16,
              line: 8,
            },
            snippet:
              "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
          },
        ],
        workerIndex: 0,
      },
    ]);
    const actual = await convertToXrayJson(map, {
      jiraType: "server",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
    });

    const expected = [
      {
        status: "PASS",
        testKey: "ABC-123",
        evidences: [],
        iterations: [
          { status: "PASS", parameters: [{ name: "iteration", value: "1" }], steps: [] },
          { status: "FAIL", parameters: [{ name: "iteration", value: "2" }], steps: [] },
        ],
        start: "1970-01-01T01:00:00+01:00",
        finish: "1970-01-01T01:00:05+01:00",
        comment: expectedComment,
      },
    ];
    assert.deepStrictEqual(expected, actual);
  });

  await it("single data-driven test with iteration parameters", async () => {
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        status: "passed",
        attachments: [
          {
            name: "xray-metadata",
            contentType: "application/json",
            body: Buffer.from('{"parameters":{"user":"alice","mail":"alice@example.net"}}'),
          },
        ],
        duration: 1000,
        errors: [],
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        workerIndex: 0,
      },
      {
        status: "passed",
        attachments: [
          {
            name: "xray-metadata",
            contentType: "application/json",
            body: Buffer.from('{"parameters":{"user":"bob","mail":"bob@example.net","abc":"xyz"}}'),
          },
        ],
        duration: 1000,
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        errors: [],
        workerIndex: 0,
      },
    ]);

    const actual = await convertToXrayJson(map, {
      jiraType: "server",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
    });
    const expected = [
      {
        testKey: "ABC-123",
        status: "PASS",
        start: "1970-01-01T01:00:00+01:00",
        finish: "1970-01-01T01:00:01+01:00",
        iterations: [
          {
            parameters: [
              { name: "iteration", value: "1" },
              { name: "user", value: "alice" },
              { name: "mail", value: "alice@example.net" },
            ],
            status: "PASS",
            steps: [],
          },
          {
            parameters: [
              { name: "iteration", value: "2" },
              { name: "user", value: "bob" },
              { name: "mail", value: "bob@example.net" },
              { name: "abc", value: "xyz" },
            ],
            status: "PASS",
            steps: [],
          },
        ],
        evidences: [],
        comment: "",
      },
    ];
    assert.deepStrictEqual(expected, actual);
  });

  await it("single data-driven test with attachment", async () => {
    const expectedComment = fs.readFileSync("./src/comment2.txt", "utf-8");
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        status: "passed",
        attachments: [],
        duration: 1000,
        errors: [],
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        workerIndex: 0,
      },
      {
        status: "failed",
        attachments: [
          {
            name: "trace",
            path: "./tests/resources/text-attachment.txt",
            contentType: "text/plain",
          },
        ],
        duration: 5000,
        parallelIndex: 0,
        retry: 0,
        startTime: new Date(0),
        stderr: [],
        stdout: [],
        steps: [],
        errors: [
          {
            message:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
            stack:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
            location: {
              file: "/home/pw/tests/example.spec.ts",
              column: 16,
              line: 8,
            },
            snippet:
              "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
          },
        ],
        workerIndex: 0,
      },
    ]);

    const expected = [
      {
        testKey: "ABC-123",
        status: "PASSED",
        start: "1970-01-01T00:00:00.000Z",
        finish: "1970-01-01T00:00:05.000Z",
        iterations: [
          { parameters: [{ name: "iteration", value: "1" }], status: "PASSED", steps: [] },
          { parameters: [{ name: "iteration", value: "2" }], status: "FAILED", steps: [] },
        ],
        evidence: [{ data: "aGVsbG8gd29ybGQ=", contentType: "text/plain", filename: "iteration_2_text-attachment.txt" }],
        comment: expectedComment,
      },
    ];
    const actual = await convertToXrayJson(map, {
      jiraType: "cloud",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
      uploadTrace: true,
    });
    assert.deepStrictEqual(actual, expected);
  });

  await it("single test with retries", async () => {
    const expectedComment = fs.readFileSync("./src/comment3.txt", "utf-8");
    const map = new Map<string, TestResult[]>();
    map.set("ABC-123", [
      {
        retry: 0,
        parallelIndex: 2,
        workerIndex: 7,
        duration: 13,
        startTime: new Date("2024-12-05T17:10:51.328Z"),
        stdout: [],
        stderr: [],
        attachments: [],
        status: "failed",
        steps: [],
        errors: [
          {
            message:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
            stack:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
            location: {
              file: "/home/pw/tests/example.spec.ts",
              column: 16,
              line: 8,
            },
            snippet:
              "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
          },
        ],
        error: {
          message:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
          stack:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
          location: {
            file: "/home/pw/tests/example.spec.ts",
            column: 16,
            line: 8,
          },
          snippet:
            "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
        },
      },
      {
        retry: 1,
        parallelIndex: 2,
        workerIndex: 10,
        duration: 11,
        startTime: new Date("2024-12-05T17:10:52.326Z"),
        stdout: [],
        stderr: [],
        attachments: [
          {
            name: "trace",
            path: "./tests/resources/text-attachment.txt",
            contentType: "text/plain",
          },
        ],
        status: "failed",
        steps: [],
        errors: [
          {
            message:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
            stack:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
            location: {
              file: "/home/pw/tests/example.spec.ts",
              column: 16,
              line: 8,
            },
            snippet:
              "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
          },
        ],
        error: {
          message:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
          stack:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
          location: {
            file: "/home/pw/tests/example.spec.ts",
            column: 16,
            line: 8,
          },
          snippet:
            "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
        },
      },
      {
        retry: 2,
        parallelIndex: 2,
        workerIndex: 13,
        duration: 13,
        startTime: new Date("2024-12-05T17:10:53.202Z"),
        stdout: [],
        stderr: [],
        attachments: [],
        status: "failed",
        steps: [],
        errors: [
          {
            message:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
            stack:
              "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
            location: {
              file: "/home/pw/tests/example.spec.ts",
              column: 16,
              line: 8,
            },
            snippet:
              "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
          },
        ],
        error: {
          message:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m",
          stack:
            "Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32mfalse\u001b[39m\nReceived: \u001b[31mtrue\u001b[39m\n    at /home/pw/tests/example.spec.ts:8:16",
          location: {
            file: "/home/pw/tests/example.spec.ts",
            column: 16,
            line: 8,
          },
          snippet:
            "\u001b[0m \u001b[90m  6 |\u001b[39m\n \u001b[90m  7 |\u001b[39m test(\u001b[32m'fails'\u001b[39m\u001b[33m,\u001b[39m \u001b[36masync\u001b[39m ({  }) \u001b[33m=>\u001b[39m {\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m  8 |\u001b[39m   expect(\u001b[36mtrue\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[36mfalse\u001b[39m)\u001b[33m;\u001b[39m\n \u001b[90m    |\u001b[39m                \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m  9 |\u001b[39m })\u001b[33m;\u001b[39m\n \u001b[90m 10 |\u001b[39m\u001b[0m",
        },
      },
      {
        retry: 3,
        parallelIndex: 0,
        workerIndex: 14,
        duration: 9,
        startTime: new Date("2024-12-05T17:10:53.916Z"),
        stdout: [],
        stderr: [],
        attachments: [],
        status: "passed",
        steps: [],
        errors: [],
      },
    ]);

    const actual = await convertToXrayJson(map, {
      jiraType: "cloud",
      receivedRegEx: /Received string: "(.*?)"(?=\n)/,
      stepCategories: ["expect", "pw:api", "test.step"],
    });

    const expected = [
      {
        testKey: "ABC-123",
        status: "PASSED",
        start: "2024-12-05T17:10:51.328Z",
        finish: "2024-12-05T17:10:53.925Z",
        iterations: [
          { parameters: [{ name: "iteration", value: "1" }], status: "FAILED", steps: [] },
          { parameters: [{ name: "iteration", value: "2" }], status: "FAILED", steps: [] },
          { parameters: [{ name: "iteration", value: "3" }], status: "FAILED", steps: [] },
          { parameters: [{ name: "iteration", value: "4" }], status: "PASSED", steps: [] },
        ],
        evidence: [],
        comment: expectedComment,
      },
    ];
    assert.deepStrictEqual(actual, expected);
  });
});
