import { AxiosProxyConfig } from 'axios';

export interface XrayOptions {
  jira: {
    url: string;
    type: string;
    apiVersion: string;
  };
  cloud?: {
    client_id?: string;
    client_secret?: string;
    xrayUrl?: string;
  };
  server?: {
    token: string;
  };
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
  stepCategories: string[];
  summary: string;
  dryRun?: boolean;
  runResult?: boolean;
}
