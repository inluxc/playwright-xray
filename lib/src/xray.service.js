"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const util_1 = require("util");
const picocolors_1 = require("picocolors");
function isAxiosError(error) {
    return error.isAxiosError === true;
}
class XrayService {
    constructor(options) {
        // Init vars
        this.xray = "";
        this.username = "";
        this.password = "";
        this.requestUrl = "";
        // Set Jira URL
        if (!options.jira.url)
            throw new Error('"jira.url" option is missed. Please, provide it in the config');
        this.jira = options.jira.url;
        // Set Jira Server Type
        if (!options.jira.type)
            throw new Error('"jira.type" option is missed. Please, provide it in the config');
        this.type = options.jira.type;
        // Init axios instance
        this.axios = axios_1.default;
        switch (this.type) {
            case 'cloud':
                // Set Xray Server URL
                this.xray = 'https://xray.cloud.getxray.app/';
                // Set Xray Credencials
                if (!options.cloud?.client_id || !options.cloud?.client_secret)
                    throw new Error('"cloud.client_id" and/or "cloud.client_secret" options are missed. Please provide them in the config');
                this.username = options.cloud?.client_id;
                this.password = options.cloud?.client_secret;
                // Set Request URL
                this.requestUrl = this.xray + 'api/v2';
                //Create Axios Instance with Auth
                axios_1.default
                    .post(this.requestUrl + '/authenticate', {
                    client_id: this.username,
                    client_secret: this.password,
                })
                    .then((request) => {
                    this.axios = axios_1.default.create({
                        baseURL: this.xray,
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${request.data}`,
                        },
                    });
                })
                    .catch((error) => {
                    throw new Error(`Failed to autenticate do host ${this.xray} with error: ${error}`);
                });
                break;
            case 'server':
                // Set Xray Server URL
                if (!options.server?.url)
                    throw new Error('"host" option is missed. Please, provide it in the config');
                this.xray = options.server?.url;
                // Set Xray Credencials
                if (!options.server?.username || !options.server?.password)
                    throw new Error('"server.username" and/or "server.password" options are missed. Please provide them in the config');
                this.username = options.server?.username;
                this.password = options.server?.password;
                // Set Request URL
                this.requestUrl = this.xray + 'rest/raven/2.0/api';
                //Create Axios Instance with Auth
                const token = `${this.username}:${this.password}`;
                const encodedToken = Buffer.from(token).toString('base64');
                this.axios = axios_1.default.create({
                    baseURL: this.xray,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${encodedToken}`,
                    },
                });
                break;
        }
        // Set Project Key
        if (!options.projectKey)
            throw new Error('"projectKey" option is missed. Please, provide it in the config');
        // Set Test Plan
        if (!options.testPlan)
            throw new Error('"testPlan" option are missed. Please provide them in the config');
        this.xrayOptions = options;
    }
    async createRun(results) {
        const URL = `${this.requestUrl}/import/execution`;
        try {
            const response = await this.axios.post(URL, JSON.stringify(results));
            if (response.status !== 200)
                throw new Error(`${response.status} - Failed to create test cycle`);
            const { data: { key, id }, } = response;
            console.log(`${picocolors_1.bold(picocolors_1.green(`✅ Test cycle ${key} has been created`))}`);
            console.log(`${picocolors_1.bold(picocolors_1.green('👇 Check out the test result'))}`);
            console.log(`${picocolors_1.bold(picocolors_1.green(`🔗 ${this.jira}/browse/${id}`))}`);
        }
        catch (error) {
            if (isAxiosError(error)) {
                console.error(`Config: ${util_1.inspect(error.config)}`);
                if (error.response) {
                    throw new Error(`\nStatus: ${error.response.status} \nHeaders: ${util_1.inspect(error.response.headers)} \nData: ${util_1.inspect(error.response.data)}`);
                }
                else if (error.request) {
                    throw new Error(`The request was made but no response was received. \n Error: ${util_1.inspect(error.toJSON())}`);
                }
                else {
                    throw new Error(`Something happened in setting up the request that triggered an Error\n : ${util_1.inspect(error.message)}`);
                }
            }
            throw new Error(`\nUnknown error: ${error}`);
        }
    }
}
exports.XrayService = XrayService;
