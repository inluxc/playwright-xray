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
        url: string,
        username: string,
        password: string
    }
    projectKey: string;
    testPlan: string;
    debug: boolean;
}