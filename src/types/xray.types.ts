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
    testPlan: string;
    testExecution?: string;
    debug: boolean;
}