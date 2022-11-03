import { ZephyrTestResult } from './../types/zephyr.types';
import { ZephyrOptions } from '../types/zephyr.types';
export declare class ZephyrService {
    private readonly host;
    private readonly url;
    private readonly user;
    private readonly password;
    private readonly authorizationToken;
    private readonly basicAuthToken;
    private readonly projectKey;
    private readonly axios;
    private readonly defaultRunName;
    constructor(options: ZephyrOptions);
    createRun(items: ZephyrTestResult[], name?: string): Promise<string>;
}
