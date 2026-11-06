import assert from "node:assert";
import { describe, it } from "node:test";
import type { Suite } from "@playwright/test/reporter";
import { getRunningProjects, hasCliProjectFilter, selectProjectsToReport } from "../projects.ts";

/** A root suite whose children are project suites, as Playwright passes it to `onBegin`. */
function rootSuite(...projectNames: (string | undefined)[]): Pick<Suite, "suites"> {
  return {
    suites: projectNames.map((name) => ({ project: () => (name === undefined ? undefined : { name }) }) as unknown as Suite),
  };
}

/** Runs `fn` with `process.argv` as for `playwright test` with or without `--project`, then restores it. */
function withCliProjectFilter<T>(cli: boolean, fn: () => T): T {
  const original = process.argv;
  process.argv = ["node", "playwright", "test", ...(cli ? ["--project=Chrome"] : [])];
  try {
    return fn();
  } finally {
    process.argv = original;
  }
}

describe(getRunningProjects.name, () => {
  it("returns the project names in run order", () => {
    assert.deepStrictEqual(getRunningProjects(rootSuite("setup", "Chrome", "Firefox")), ["setup", "Chrome", "Firefox"]);
  });

  it("returns no projects for an empty run", () => {
    assert.deepStrictEqual(getRunningProjects(rootSuite()), []);
  });

  it("skips suites without a project and removes duplicates", () => {
    assert.deepStrictEqual(getRunningProjects(rootSuite("Chrome", undefined, "Chrome")), ["Chrome"]);
  });
});

describe(hasCliProjectFilter.name, () => {
  const cases: { argv: string[]; expected: boolean }[] = [
    { argv: ["node", "playwright", "test"], expected: false },
    { argv: ["node", "playwright", "test", "--project=Chrome"], expected: true },
    { argv: ["node", "playwright", "test", "--project", "Chrome"], expected: true },
    { argv: ["node", "playwright", "test", "--project=Chrome", "--project=Firefox"], expected: true },
    { argv: ["node", "playwright", "test", "--project", "Chrome", "Firefox"], expected: true },
    { argv: ["node", "playwright", "test", "--project=ffs-*"], expected: true },
    { argv: ["node", "playwright", "test", "--projects=Chrome"], expected: false },
    { argv: ["node", "playwright", "test", "-g", "project"], expected: false },
  ];

  for (const { argv, expected } of cases) {
    it(`${argv.slice(3).join(" ") || "(no args)"} -> ${expected}`, () => {
      assert.strictEqual(hasCliProjectFilter(argv), expected);
    });
  }
});

describe(selectProjectsToReport.name, () => {
  const all = ["setup", "Chrome", "Firefox"];

  const cases: {
    name: string;
    running: string[];
    exclude: string | string[] | undefined;
    cli: boolean;
    expected: string[];
    cliWins?: boolean;
  }[] = [
    // no projectsToExclude: everything Playwright runs is reported
    { name: "no --project, no exclude", running: all, exclude: undefined, cli: false, expected: all },
    {
      name: "single --project pulls in its dependency",
      running: ["setup", "Chrome"],
      exclude: undefined,
      cli: true,
      expected: ["setup", "Chrome"],
    },
    { name: "multiple --project (#189)", running: all, exclude: undefined, cli: true, expected: all },
    { name: "empty exclude array", running: all, exclude: [], cli: false, expected: all },
    { name: "empty exclude string", running: all, exclude: "", cli: false, expected: all },

    // projectsToExclude applies with and without --project
    { name: "no --project, exclude setup", running: all, exclude: ["setup"], cli: false, expected: ["Chrome", "Firefox"] },
    { name: "single --project, exclude setup", running: ["setup", "Chrome"], exclude: ["setup"], cli: true, expected: ["Chrome"] },
    { name: "multiple --project, exclude setup", running: all, exclude: ["setup"], cli: true, expected: ["Chrome", "Firefox"] },
    { name: "--project a b, exclude a and c", running: ["a", "b"], exclude: ["a", "c"], cli: true, expected: ["b"] },
    { name: "exclude as a single string", running: all, exclude: "setup", cli: false, expected: ["Chrome", "Firefox"] },
    { name: "exclude as a regex", running: ["setup-db", "setup-auth", "Chrome"], exclude: "setup.*", cli: false, expected: ["Chrome"] },
    { name: "exclude matches whole names only", running: ["setup", "setup-db"], exclude: ["setup"], cli: false, expected: ["setup-db"] },
    { name: "exclude is case-sensitive", running: ["Chrome"], exclude: ["chrome"], cli: false, expected: ["Chrome"] },

    // everything excluded: CLI wins only when --project was given
    {
      name: "--project, all excluded -> CLI wins",
      running: ["setup", "Chrome"],
      exclude: ["Chrome", "setup"],
      cli: true,
      expected: ["setup", "Chrome"],
      cliWins: true,
    },
    {
      name: "--project, all excluded by regex -> CLI wins",
      running: ["Chrome"],
      exclude: ".*",
      cli: true,
      expected: ["Chrome"],
      cliWins: true,
    },
    { name: "no --project, all excluded -> nothing reported", running: all, exclude: ".*", cli: false, expected: [] },

    // nothing running
    { name: "nothing running", running: [], exclude: ["setup"], cli: true, expected: [] },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const selection = withCliProjectFilter(c.cli, () => selectProjectsToReport(rootSuite(...c.running), c.exclude));
      assert.deepStrictEqual(selection.projects, c.expected);
      assert.strictEqual(selection.cliWins, c.cliWins ?? false);
    });
  }

  it("returns the combined exclude pattern for logging", () => {
    assert.strictEqual(selectProjectsToReport(rootSuite("Chrome"), ["Chrome", "setup"]).excludePattern, "Chrome|setup");
  });
});
