import { XrayOptions } from '../types/xray.types';
import { Execution } from '../types/cloud.types';
import axios, { Axios, AxiosError } from 'axios';
import { inspect } from 'util';
import { blue, bold, green, red, yellow } from 'picocolors';

function isAxiosError(error: any): error is AxiosError {
  return error.isAxiosError === true;
}

export class XrayService {
  private readonly xray: string;
  private readonly jira: string;
  private readonly username: string;
  private readonly password: string;
  private readonly type: string;
  private readonly requestUrl: string;
  private axios: Axios;

  constructor(options: XrayOptions) {
    // Init vars
    this.xray = '';
    this.username = '';
    this.password = '';
    this.requestUrl = '';

    // Set Jira URL
    if (!options.jira.url) throw new Error('"jira.url" option is missed. Please, provide it in the config');
    this.jira = options.jira.url;

    // Set Jira Server Type
    if (!options.jira.type) throw new Error('"jira.type" option is missed. Please, provide it in the config');
    this.type = options.jira.type;

    // Init axios instance
    this.axios = axios;

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
            throw new Error(`Failed to autenticate do host ${this.xray} with error: ${error}`);
          });

        break;

      case 'server':
        // Set Xray Server URL
        if (!options.server?.url) throw new Error('"host" option is missed. Please, provide it in the config');
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
        this.axios = axios.create({
          baseURL: this.xray,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${encodedToken}`,
          },
        });

        break;
    }

    // Set Project Key
    if (!options.projectKey) throw new Error('"projectKey" option is missed. Please, provide it in the config');

    // Set Test Plan
    if (!options.testPlan) throw new Error('"testPlan" option are missed. Please provide them in the config');
  }

  async createRun(results: Execution) {
    const URL = `${this.requestUrl}/import/execution`;
    const total = results.tests.length;
    let passed = 0;
    let failed = 0;
    let todo = 0;


    results.tests!.forEach((test: { status: any; }) => {
      switch (test.status) {
        case 'PASSED':
          passed = passed + 1;
          break;
        case 'FAILED':
          failed = failed + 1;
          break;
      }
    });

    try {
      const response = await this.axios.post(URL, JSON.stringify(results));
      if (response.status !== 200) throw new Error(`${response.status} - Failed to create test cycle`);
      const {
        data: { key },
      } = response;

      // Results
      console.log(`${bold(blue(`-------------------------------------`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`✅ Test status: ${key}`))}`);
      console.log(`${bold(blue(`✅ Tests ran: ${total}`))}`);
      console.log(`${bold(green(`✅ Tests passed: ${passed}`))}`);
      console.log(`${bold(red(`✅ Tests failed: ${failed}`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`✅ Test cycle ${key} has been created`))}`);
      console.log(`${bold(blue('👇 Check out the test result'))}`);
      console.log(`${bold(blue(`🔗 ${this.jira}/browse/${key}`))}`);
      console.log(`${bold(blue(` `))}`);
      console.log(`${bold(blue(`-------------------------------------`))}`);

    } catch (error) {
      if (isAxiosError(error)) {
        console.error(`Config: ${inspect(error.config)}`);

        if (error.response) {
          throw new Error(
            `\nStatus: ${error.response.status} \nHeaders: ${inspect(error.response.headers)} \nData: ${inspect(error.response.data)}`,
          );
        } else if (error.request) {
          throw new Error(`The request was made but no response was received. \n Error: ${inspect(error.toJSON())}`);
        } else {
          throw new Error(`Something happened in setting up the request that triggered an Error\n : ${inspect(error.message)}`);
        }
      }

      throw new Error(`\nUnknown error: ${error}`);
    }
  }
}
