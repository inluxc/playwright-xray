import type { Suite } from "@playwright/test/reporter";

export type ProjectSelection = {
  projects: string[];
  /** True when `projectsToExclude` excluded every project selected with `--project`, so the CLI selection won. */
  cliWins: boolean;
  excludePattern?: string;
};

export function getRunningProjects(suite: Pick<Suite, "suites">): string[] {
  const names = suite.suites.map((projectSuite) => projectSuite.project()?.name).filter((name): name is string => name !== undefined);
  return [...new Set(names)];
}

export function hasCliProjectFilter(argv: string[] = process.argv): boolean {
  return argv.some((arg) => arg === "--project" || arg.startsWith("--project="));
}

export function selectProjectsToReport(suite: Pick<Suite, "suites">, projectsToExclude: string | string[] | undefined): ProjectSelection {
  const runningProjects = getRunningProjects(suite);
  const cliProjectFilter = hasCliProjectFilter();
  const excludePattern = Array.isArray(projectsToExclude) ? projectsToExclude.join("|") : projectsToExclude;
  if (excludePattern === undefined || excludePattern === "") {
    return { projects: runningProjects, cliWins: false };
  }

  const excludedProjects = new RegExp(`^(${excludePattern})$`);
  const projects = runningProjects.filter((name) => !excludedProjects.test(name));

  if (projects.length === 0 && runningProjects.length > 0 && cliProjectFilter) {
    return { projects: runningProjects, cliWins: true, excludePattern };
  }
  return { projects, cliWins: false, excludePattern };
}
