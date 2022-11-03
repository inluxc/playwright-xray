import type { AxiosRequestConfig } from 'axios';
export interface ZephyrOptions extends AxiosRequestConfig {
    host: string;
    user?: string;
    password?: string;
    authorizationToken?: string;
    projectKey: string;
}
export declare type ZephyrStatus = 'Pass' | 'Fail' | 'Blocked' | 'Not Executed' | 'In Progress';
export declare type ZephyrTestResult = {
    testCaseKey: string;
    status: ZephyrStatus;
    environment?: string;
    executionTime?: string;
    executionDate?: string;
};
