import type { AxiosProxyConfig } from "axios";

type ServerWithToken = {
  token: string;
  username?: never;
  password?: never;
};

type ServerWithBasicAuth = {
  token?: never;
  username: string;
  password: string;
};

type Server = ServerWithToken | ServerWithBasicAuth;

export type JiraXrayStatusMapping = {
  passed: string;
  failed: string;
  skipped: string;
  timedOut: string;
  interrupted: string;
};

export interface XrayOptions {
  jira: {
    url: string;
    type: "server" | "cloud";
    apiVersion: string;
  };
  cloud?: {
    client_id?: string;
    client_secret?: string;
    xrayUrl?: string;
  };
  server?: Server;
  projectKey: string;
  testPlan: string;
  testExecution?: string;
  revision?: string;
  description?: string;
  testEnvironments?: string[];
  version?: string;
  debug: boolean;
  proxy?: AxiosProxyConfig;
  uploadScreenShot?: boolean;
  uploadTrace?: boolean;
  uploadVideo?: boolean;
  markFlakyWith?: string;
  stepCategories?: string[];
  summary?: string;
  dryRun?: boolean;
  runResult?: boolean;
  limitEvidenceSize?: number;
  projectsToExclude?: string | string[];
  jiraXrayStatusMapping?: Partial<JiraXrayStatusMapping>;
}
