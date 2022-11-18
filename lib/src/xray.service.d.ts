import { XrayOptions } from '../types/xray.types';
import { XrayTestResult } from '../types/cloud.types';
export declare class XrayService {
    private readonly xray;
    private readonly jira;
    private readonly username;
    private readonly password;
    private readonly type;
    private readonly requestUrl;
    private axios;
    private readonly xrayOptions;
    constructor(options: XrayOptions);
    createRun(results: XrayTestResult): Promise<void>;
}
