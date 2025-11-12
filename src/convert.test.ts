import assert from "node:assert";
import { describe, it } from "node:test";
import type { TestResult } from "@playwright/test/reporter";
import { convertToXrayJson } from "./convert";

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
    assert.deepStrictEqual(
      await convertToXrayJson(map, {
        jiraType: "server",
        receivedRegEx: /Received string: "(.*?)"(?=\n)/,
        stepCategories: ["expect", "pw:api", "test.step"],
        uploadTrace: true,
      }),
      [
        {
          testKey: "ABC-123",
          status: "PASS",
          start: "2024-12-05T18:10:51+01:00",
          finish: "2024-12-05T18:10:51+01:00",
          evidences: [{ data: "aGVsbG8gd29ybGQ=", contentType: "text/plain", filename: "text-attachment.txt" }],
          steps: [],
          comment: undefined,
        },
      ],
    );
  });

  await it("single data-driven test", async () => {
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
    assert.deepStrictEqual(
      await convertToXrayJson(map, {
        jiraType: "server",
        receivedRegEx: /Received string: "(.*?)"(?=\n)/,
        stepCategories: ["expect", "pw:api", "test.step"],
      }),
      [
        {
          testKey: "ABC-123",
          status: "PASS",
          start: "1970-01-01T01:00:00+01:00",
          finish: "1970-01-01T01:00:05+01:00",
          iterations: [
            { parameters: [{ name: "iteration", value: "1" }], status: "PASS", steps: [] },
            { parameters: [{ name: "iteration", value: "2" }], status: "FAIL", steps: [] },
          ],
          evidences: [],
          comment: `Iteration 2: [{"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true","stack":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true\\n    at /home/pw/tests/example.spec.ts:8:16","location":{"file":"/home/pw/tests/example.spec.ts","column":16,"line":8},"snippet":"   6 |\\n   7 | test('fails', async ({  }) => {\\n>  8 |   expect(true).toBe(false);\\n     |                ^\\n   9 | });\\n  10 |"}]`,
        },
      ],
    );
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
    assert.deepStrictEqual(
      await convertToXrayJson(map, {
        jiraType: "server",
        receivedRegEx: /Received string: "(.*?)"(?=\n)/,
        stepCategories: ["expect", "pw:api", "test.step"],
      }),
      [
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
      ],
    );
  });

  await it("single data-driven test with attachment", async () => {
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
    assert.deepStrictEqual(
      await convertToXrayJson(map, {
        jiraType: "cloud",
        receivedRegEx: /Received string: "(.*?)"(?=\n)/,
        stepCategories: ["expect", "pw:api", "test.step"],
        uploadTrace: true,
      }),
      [
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
          comment: `Iteration 2: [{"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true","stack":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true\\n    at /home/pw/tests/example.spec.ts:8:16","location":{"file":"/home/pw/tests/example.spec.ts","column":16,"line":8},"snippet":"   6 |\\n   7 | test('fails', async ({  }) => {\\n>  8 |   expect(true).toBe(false);\\n     |                ^\\n   9 | });\\n  10 |"}]`,
        },
      ],
    );
  });

  await it("single test with retries", async () => {
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
          start: "2024-12-05T17:10:51.328Z",
          finish: "2024-12-05T17:10:53.925Z",
          iterations: [
            { parameters: [{ name: "iteration", value: "1" }], status: "FAILED", steps: [] },
            { parameters: [{ name: "iteration", value: "2" }], status: "FAILED", steps: [] },
            { parameters: [{ name: "iteration", value: "3" }], status: "FAILED", steps: [] },
            { parameters: [{ name: "iteration", value: "4" }], status: "PASSED", steps: [] },
          ],
          evidence: [],
          comment:
            `Iteration 1: [{"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true","stack":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true\\n    at /home/pw/tests/example.spec.ts:8:16","location":{"file":"/home/pw/tests/example.spec.ts","column":16,"line":8},"snippet":"   6 |\\n   7 | test('fails', async ({  }) => {\\n>  8 |   expect(true).toBe(false);\\n     |                ^\\n   9 | });\\n  10 |"}]\n` +
            `Iteration 2: [{"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true","stack":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true\\n    at /home/pw/tests/example.spec.ts:8:16","location":{"file":"/home/pw/tests/example.spec.ts","column":16,"line":8},"snippet":"   6 |\\n   7 | test('fails', async ({  }) => {\\n>  8 |   expect(true).toBe(false);\\n     |                ^\\n   9 | });\\n  10 |"}]\n` +
            `Iteration 3: [{"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true","stack":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: false\\nReceived: true\\n    at /home/pw/tests/example.spec.ts:8:16","location":{"file":"/home/pw/tests/example.spec.ts","column":16,"line":8},"snippet":"   6 |\\n   7 | test('fails', async ({  }) => {\\n>  8 |   expect(true).toBe(false);\\n     |                ^\\n   9 | });\\n  10 |"}]`,
        },
      ],
    );
  });
});
