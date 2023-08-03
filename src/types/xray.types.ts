import { AxiosProxyConfig } from "axios";

export interface XrayOptions {
    jira: {
        url: string,
        type: string
    },
    cloud?: {
        client_id?: string;
        client_secret?: string;
    },
    server?: {
        token: string
    }
    projectKey: string;
    project: string;
    testPlan: string;
    testExecution?: string;
    revision?: string;
    description?: string;
    testEnvironments?: string[];
    version?: string;
    debug: boolean;
    proxy?: AxiosProxyConfig;
}