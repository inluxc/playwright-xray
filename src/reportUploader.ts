import axios, { type Axios } from "axios";
import FormData from "form-data";
import type { XrayTestResult as XrayTestResultCloud } from "./types/cloud.types";
import type { XrayTestResult as XrayTestResultServer } from "./types/server.types";
import type { XrayOptions } from "./types/xray.types";

type XrayTestResult = XrayTestResultCloud | XrayTestResultServer;

export class ReportUploader {
  private readonly options: XrayOptions;
  axios: Axios;
  private requestUrl: string;

  constructor(options: XrayOptions) {
    // Init vars
    this.options = options;
    // Set Jira URL
    this.verifyXrayParameters(options);

    // Init axios instance
    this.axios = axios;
    this.requestUrl = "";

    // Set if multipart should be used
    if (options.useMultipart) {
      if (options.jira.type !== "cloud") {
        throw new Error("Multipart upload is only supported for Xray Cloud");
      }
    }

    this.axios.defaults.headers.options = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    };
  }

  private verifyXrayParameters(options: XrayOptions) {
    if (!options.jira.url) throw new Error('"jira.url" option is missed. Please, provide it in the config');
    // Set Jira Server Type
    if (!options.jira.type) throw new Error('"jira.type" option is missed. Please, provide it in the config');
    // Set Jira API apiVersion
    if (!options.jira.apiVersion) throw new Error('"jira.apiVersion" option is missed. Please, provide it in the config');
    // Verify Multipart options if useMultipart is true
    if ("useMultiPart" in options) {
      if (options.jira.type === "cloud") {
        if (options.multiPart === undefined) {
          throw new Error("Multipart options must be provided when useMultipart is true");
        }
        if (options.multiPart.project === undefined || options.multiPart.issuetype === undefined) {
          throw new Error("Multipart options must include project and issuetype");
        }
        if (options.multiPart.xrayFields === undefined) {
          throw new Error("Multipart options must include xrayFields");
        }
        if (options.multiPart.multiPartUrl === undefined) {
          throw new Error("Multipart options must include multiPartUrl");
        }
      } else {
        throw new Error(
          "Multipart options only supported for Xray Cloud. Please set useMultipart to false or remove multipart options from the config",
        );
      }
    }
  }

  async initialzeJiraConnection() {
    let xray = "";
    let username = "";
    let password = "";
    let token = "";
    switch (this.options.jira.type) {
      case "cloud":
        // Set Xray Server URL
        xray =
          this.options.cloud?.xrayUrl === undefined || !this.options.cloud?.xrayUrl
            ? "https://xray.cloud.getxray.app/"
            : this.options.cloud.xrayUrl;

        // Set Xray Credencials
        if (!this.options.cloud?.client_id || !this.options.cloud?.client_secret) {
          throw new Error('"cloud.client_id" and/or "cloud.client_secret" options are missed. Please provide them in the config');
        }

        username = this.options.cloud?.client_id;
        password = this.options.cloud?.client_secret;

        // Set Request URL
        this.requestUrl = new URL("api/v2", xray).toString();

        //Create Axios Instance with Auth
        try {
          const request = await this.axios.post(`${this.requestUrl}/authenticate`, {
            client_id: username,
            client_secret: password,
          });
          this.axios = axios.create({
            baseURL: xray,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${request.data}`,
            },
          });
        } catch (error) {
          throw new Error(`Failed to authenticate to host ${xray} with error: ${error}`);
        }

        break;

      case "server":
        // Set Xray Server URL
        if (!this.options.jira?.url) throw new Error('"host" option is missed. Please, provide it in the config');
        xray = this.options.jira?.url;

        // Set Xray Credencials
        if (this.options.server) {
          if ("token" in this.options.server) {
            token = this.options.server.token as string;
          } else if ("username" in this.options.server && "password" in this.options.server) {
            username = this.options.server.username as string;
            password = this.options.server.password as string;
          } else {
            throw new Error(
              '"server.token" or "server.username & server.password" options are missing. Please provide either token or username and password in the config',
            );
          }
        }

        // Set Request URL
        this.requestUrl =
          xray + (this.options.jira.apiVersion !== "1.0" ? `rest/raven/${this.options.jira.apiVersion}/api` : "rest/raven/1.0");

        //Create Axios Instance with Auth
        if (token) {
          this.axios = axios.create({
            baseURL: xray,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
        if (username && password) {
          this.axios = axios.create({
            baseURL: xray,
            auth: {
              username,
              password,
            },
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
        break;
    }
  }

  async sendMultpartToXray(multipartFiles: { info: string; testResult: string }) {
    const multiPartUrl = `${this.options.multiPart.multiPartUrl + (this.options.multiPart.multiPartUrl?.endsWith("/") ? "" : "/")}api/${this.options.jira.apiVersion}/import/execution/multipart`;
    const formData = new FormData();

    formData.append("info", multipartFiles.info, {
      filename: "info.json",
      contentType: "application/json",
    });
    formData.append("results", multipartFiles.testResult, {
      filename: "results.json",
      contentType: "application/json",
    });

    const resp = await this.axios.post(multiPartUrl, formData, {
      headers: { ...formData?.getHeaders() },
      maxBodyLength: 107374182400, //100gb
      maxContentLength: 107374182400, //100gb
      timeout: 600000, //10min
    });

    if (resp.status !== 200) throw new Error(`${resp.status} - Failed to import test execution results to Xray`);
    return resp.data.key;
  }

  async sendSinglePartToXray(results: XrayTestResult, options: XrayOptions) {
    const URL = `${this.requestUrl}/import/execution`;
    axios.defaults.headers.common["Content-Type"] = "application/json";
    const response = await this.axios.post(URL, JSON.stringify(results), {
      maxBodyLength: 107374182400, //100gb
      maxContentLength: 107374182400, //100gb
      timeout: 600000, //10min
      proxy: options.proxy !== undefined ? options.proxy : false,
    });
    if (response.status !== 200) throw new Error(`${response.status} - Failed to create test execution`);

    if ("testIssues" in response.data) {
      if (response.data.testIssues?.error?.length > 0) {
        throw new Error(
          `Partial test reporting failure for the following tests: ${response.data.testIssues.error.map((e: { testKey: string }) => e.testKey).join(", ")}`,
        );
      }
    }

    let key = response.data.key;
    if (options.jira.type === "server") {
      key = response.data.testExecIssue.key;
    }
    return key;
  }
}
