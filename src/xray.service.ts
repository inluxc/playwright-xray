import { XrayOptions } from './types/xray.types';
import { XrayTestResult } from './types/cloud.types';
import axios, { Axios } from 'axios';
import { inspect } from 'util';
import { blue, bold, green, red, white, yellow } from 'picocolors';
import * as fs from 'fs';
import Help from './help';
import { ExecInfo } from './types/execInfo.types';

export class XrayService {
  private readonly xray: string;
  private readonly jira: string;
  private readonly username: string;
  private readonly password: string;
  private readonly token: string;
  private readonly type: string;
  private readonly apiVersion: string;
  private readonly requestUrl: string;
  private readonly options: XrayOptions;
  private axios: Axios;
  private help: Help;
  private dryRun: boolean;

  constructor(options: XrayOptions) {
    // Init vars
    this.xray = '';
    this.username = '';
    this.password = '';
    this.token = '';
    this.requestUrl = '';
    this.options = options;
    this.help = new Help(this.options.jira.type);
    this.dryRun = options.dryRun === true ? true : false;

    // Set Jira URL
    if (!options.jira.url) throw new Error('"jira.url" option is missed. Please, provide it in the config');
    this.jira = options.jira.url;

    // Set Jira Server Type
    if (!options.jira.type) throw new Error('"jira.type" option is missed. Please, provide it in the config');
    this.type = options.jira.type;

    // Set Jira API apiVersion
    if (!options.jira.apiVersion) throw new Error('"jira.apiVersion" option is missed. Please, provide it in the config');
    this.apiVersion = options.jira.apiVersion;

    // Init axios instance
    this.axios = axios;

    this.axios.defaults.headers.options = {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Expires: '0',
    };

    if (!this.dryRun)
      switch (this.type) {
        case 'cloud':
          // Set Xray Server URL
          this.xray =
            options.cloud?.xrayUrl === undefined || !options.cloud?.xrayUrl ? 'https://xray.cloud.getxray.app/' : options.cloud.xrayUrl;

          // Set Xray Credencials
          if (!options.cloud?.client_id || !options.cloud?.client_secret)
            throw new Error('"cloud.client_id" and/or "cloud.client_secret" options are missed. Please provide them in the config');
          this.username = options.cloud?.client_id;
          this.password = options.cloud?.client_secret;

          // Set Request URL
          this.requestUrl = new URL('api/v2', this.xray).toString();

          //Create Axios Instance with Auth, skip if dry run
          axios
            .post(this.requestUrl + '/authenticate', {
              client_id: this.username,
              client_secret: this.password,
            })
            .then((request) => {
              this.axios = axios.create({
                baseURL: this.xray,
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${request.data}`,
                },
              });
            })
            .catch((error) => {
              throw new Error(`Failed to authenticate to host ${this.xray} with error: ${error}`);
            });

          break;

        case 'server':
          // Set Xray Server URL
          if (!options.jira?.url) throw new Error('"host" option is missed. Please, provide it in the config');
          this.xray = options.jira?.url;

          // Set Xray Credencials
          if (!options.server?.token) throw new Error('"server.token" option is missing. Please provide them in the config');
          this.token = options.server?.token;

          // Set Request URL
          this.requestUrl = this.xray + this.apiVersion !== '1.0' ? `rest/raven/${this.apiVersion}/api` : 'rest/raven/1.0';

          //Create Axios Instance with Auth
          this.axios = axios.create({
            baseURL: this.xray,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.token}`,
            },
          });

          break;
      }

    // Set Project Key
    if (!options.projectKey) throw new Error('"projectKey" option is missed. Please, provide it in the config');

    // Set Test Plan
    if (!options.testPlan) throw new Error('"testPlan" option are missed. Please provide them in the config');
  }

  async createRun(results: XrayTestResult, execInfo: ExecInfo) {
    const URL = `${this.requestUrl}/import/execution`;
    const total = results.tests?.length;
    const duration = new Date(results.info.finishDate).getTime() - new Date(results.info.startDate).getTime();
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;

    try {
      if (this.options.debug) {
        fs.writeFile('xray-payload-debug.json', JSON.stringify(results), (err) => {
          if (err) throw err;
        });
      }
    } catch (error) { }
    //console.log(results);
    results.tests!.forEach((test: { status: any; testKey: string }) => {
      switch (test.status) {
        case 'SKIPPED':
          skipped = skipped + 1;
          break;
        case 'PASS':
        case 'PASSED':
          passed = passed + 1;
          break;
        case 'FAIL':
        case 'FAILED':
          if (this.isThereFlaky(results, test)) flaky = flaky + 1;
          else {
            failed = failed + 1;
            this.removeDuplicates(results, test);
          }
          break;
      }
    });

    try {
      if (this.options.debug) {
        fs.writeFile('xray-payload.json', JSON.stringify(results), (err) => {
          if (err) throw err;
        });
      }

      let key = !this.dryRun ? await this.postResultToJira(URL, results) : 'Dry run';

      let action = this.options.testExecution !== undefined ? 'updated' : 'created';

      // Results
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(green(`😀 Successfully sending test results to Jira`))}`);
      console.log(`${bold(blue(` `))}`);
      if (this.options.description !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Description:       ${this.options.description}`))}`);
      }
      if (this.options.testEnvironments !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Test environments: ${this.options.testEnvironments}`))}`);
      }
      if (this.options.version !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Version:           ${this.options.version}`))}`);
      }
      if (this.options.revision !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Revision:          ${this.options.revision}`))}`);
      }
      if (execInfo.browserName !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Browsers:          ${execInfo.browserName}`))}`);
      }
      console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Test plan:         ${this.options.testPlan}`))}`);
      if (this.options.testExecution !== undefined) {
        console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Test execution:    ${this.options.testExecution}`))}`);
      }
      console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Test Duration:     ${this.help.convertMsToTime(duration)}`))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Tests ran:         ${total} (including reruns)`))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(green(`Tests passed:      ${passed}`))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(red(`Tests failed:      ${failed}`))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(yellow(`Flaky tests:       ${flaky}`))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(white(`Skipped tests:     ${skipped}`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(yellow(`⏺  `))}${bold(blue(`Test cycle ${key} has been ${action}`))}`);
      if (!this.dryRun) {
        console.log(`${bold(blue('👇 Check out the test result'))}`);
        console.log(`${bold(blue(`🔗 ${this.jira}browse/${key}`))}`);
        console.log(`${bold(blue(` `))}`);
      }
      console.log(`${bold(blue(`-------------------------------------`))}`);
    } catch (error) {
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);
      console.log(`${bold(blue(` `))}`);

      let log = '';
      let msg = '';

      if (axios.isAxiosError(error)) {
        log = `Config: ${inspect(error.config)}\n\n`;

        if (error.response) {
          msg = inspect(error.response.data.error);
          msg = msg.replace(/'/g, '');
          log += `Status: ${error.response.status}\n`;
          log += `Headers: ${inspect(error.response.headers)}\n`;
          log += `Data: ${inspect(error.response.data)}\n`;
        } else if (error.request) {
          msg = 'The request was made but no response was received';
          log += `Error: ${inspect(error.toJSON())}\n`;
        } else {
          msg = 'Something happened in setting up the request that triggered an error';
          log += `Error: ${inspect(error.message)}\n`;
        }
      } else {
        log = `Unknown error: ${error}\n`;
      }
      fs.writeFileSync('playwright-xray-error.log', log);

      let msgs = msg.split(';');
      console.log(`${bold(red(`😞 Error sending test results to Jira`))}`);
      console.log(`${bold(blue(` `))}`);
      msgs.forEach((m) => {
        console.log(`${bold(red(`⛔ ${m}`))}`);
      });
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue('👉 Check the "playwright-xray-error.log" file for more details'))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);
    }
  }

  private async postResultToJira(URL: string, results: XrayTestResult) {
    const response = await this.axios.post(URL, JSON.stringify(results), {
      maxBodyLength: 107374182400, //100gb
      maxContentLength: 107374182400, //100gb
      timeout: 600000, //10min
      proxy: this.options.proxy !== undefined ? this.options.proxy : false,
    });
    if (response.status !== 200) throw new Error(`${response.status} - Failed to create test cycle`);
    let key = response.data.key;
    if (this.options.jira.type === 'server') {
      key = response.data.testExecIssue.key;
    }
    return key;
  }

  private isThereFlaky(results: XrayTestResult, test: { status: any; testKey: string }) {
    const flaky = results.tests?.find((item) => item.testKey.includes(test.testKey) && item.status.includes('PASSED'));
    if (flaky !== undefined) {
      let passed = results.tests?.at(results.tests.indexOf(flaky));
      if (passed != undefined) passed.status = this.options.markFlakyWith === undefined ? 'PASSED' : this.options.markFlakyWith;

      const duplicates = results.tests?.filter((item) => item.testKey.includes(test.testKey) && item.status.includes('FAILED'));
      duplicates?.forEach((duplicate) => results.tests?.splice(results.tests?.indexOf(duplicate), 1));
      return true;
    } else return false;
  }

  private removeDuplicates(results: XrayTestResult, test: { status: any; testKey: string }) {
    const duplicates = results.tests?.filter((item) => item.testKey.includes(test.testKey) && item.status.includes('FAILED'));
    duplicates?.pop();
    duplicates?.forEach((duplicate) => results.tests?.splice(results.tests?.indexOf(duplicate), 1));
  }
}
