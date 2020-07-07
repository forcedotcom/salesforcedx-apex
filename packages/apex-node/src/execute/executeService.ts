/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { existsSync, readFileSync } from 'fs';
import {
  SoapResponse,
  soapEnv,
  soapBody,
  soapHeader,
  RequestData,
  action
} from '../types/execute';
import {
  ExecuteAnonymousResponse,
  ApexExecuteOptions,
  ApiRequest
} from '../types';
import { nls } from '../i18n';
import { encodeBody } from './utils';

export class ExecuteService extends ApiRequest {
  public async executeAnonymous(
    options: ApexExecuteOptions
  ): Promise<ExecuteAnonymousResponse> {
    let data: string;

    if (options.apexFilePath) {
      if (!existsSync(options.apexFilePath)) {
        throw new Error(
          nls.localize('file_not_found_error', options.apexFilePath)
        );
      }
      data = readFileSync(options.apexFilePath, 'utf8');
    } else {
      data = String(options.apexCode);
    }
    const request = this.buildExecRequest(data);
    const result = (await this.runRequest(request)) as SoapResponse;
    return this.jsonFormat(result);
  }

  // Tooling API execute anonymous apex REST endpoint was not used because
  // it requires multiple api calls to turn on trace flag, execute anonymous apex, and get the generated debug log
  private buildExecRequest(data: string): RequestData {
    const body = encodeBody(this.connection.accessToken, data);
    const postEndpoint = `${this.connection.instanceUrl}/services/Soap/s/${
      this.connection.version
    }/${this.connection.accessToken.split('!')[0]}`;
    const requestHeaders = {
      'content-type': 'text/xml',
      soapaction: action
    };
    const request = {
      method: 'POST',
      url: postEndpoint,
      body,
      headers: requestHeaders
    };

    return request;
  }

  public jsonFormat(soapResponse: SoapResponse): ExecuteAnonymousResponse {
    const execAnonResponse =
      soapResponse[soapEnv][soapBody].executeAnonymousResponse.result;

    const formattedResponse = {
      result: {
        compiled: execAnonResponse.compiled === 'true' ? true : false,
        compileProblem: execAnonResponse.compileProblem,
        success: execAnonResponse.success === 'true' ? true : false,
        line: execAnonResponse.line,
        column: execAnonResponse.column,
        exceptionMessage: execAnonResponse.exceptionMessage,
        exceptionStackTrace: execAnonResponse.exceptionStackTrace,
        logs: soapResponse[soapEnv][soapHeader].DebuggingInfo.debugLog
      }
    };

    return formattedResponse;
  }
}
