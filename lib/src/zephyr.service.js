"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZephyrService = void 0;
const axios_1 = __importDefault(require("axios"));
const util_1 = require("util");
const picocolors_1 = require("picocolors");
function isAxiosError(error) {
    return error.isAxiosError === true;
}
class ZephyrService {
    constructor(options) {
        this.defaultRunName = `[${new Date().toUTCString()}] - Automated run`;
        if (!options.host)
            throw new Error('"host" option is missed. Please, provide it in the config');
        if (!options.projectKey)
            throw new Error('"projectKey" option is missed. Please, provide it in the config');
        if ((!options.user || !options.password) && !options.authorizationToken)
            throw new Error('"user" and/or "password" or "authorizationToken" options are missed. Please provide them in the config');
        this.host = options.host;
        this.url = `${this.host}/rest/atm/1.0`;
        this.user = options.user;
        this.password = options.password;
        this.basicAuthToken = Buffer.from(`${this.user}:${this.password}`).toString('base64');
        this.authorizationToken = options.authorizationToken ?? this.basicAuthToken;
        this.projectKey = options.projectKey;
        this.axios = axios_1.default.create({
            baseURL: this.url,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${this.authorizationToken}`,
            },
            ...options,
        });
    }
    async createRun(items, name = this.defaultRunName) {
        const URL = `${this.url}/testrun`;
        try {
            const response = await this.axios.post(URL, {
                name,
                projectKey: this.projectKey,
                items,
            });
            if (response.status !== 201)
                throw new Error(`${response.status} - Failed to create test cycle`);
            const { data: { key }, } = response;
            console.log(`${(0, picocolors_1.bold)((0, picocolors_1.green)(`✅ Test cycle ${key} has been created`))}`);
            console.log(`${(0, picocolors_1.bold)((0, picocolors_1.green)('👇 Check out the test result'))}`);
            console.log(`🔗 ${this.host}/secure/Tests.jspa#/testPlayer/${key}`);
            return response.data.key;
        }
        catch (error) {
            if (isAxiosError(error)) {
                console.error(`Config: ${(0, util_1.inspect)(error.config)}`);
                if (error.response) {
                    throw new Error(`\nStatus: ${error.response.status} \nHeaders: ${(0, util_1.inspect)(error.response.headers)} \nData: ${(0, util_1.inspect)(error.response.data)}`);
                }
                else if (error.request) {
                    throw new Error(`The request was made but no response was received. \n Error: ${(0, util_1.inspect)(error.toJSON())}`);
                }
                else {
                    throw new Error(`Something happened in setting up the request that triggered an Error\n : ${(0, util_1.inspect)(error.message)}`);
                }
            }
            throw new Error(`\nUnknown error: ${error}`);
        }
    }
}
exports.ZephyrService = ZephyrService;
