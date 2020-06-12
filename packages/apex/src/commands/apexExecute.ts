/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { readFileSync } from 'fs';
import {
  SoapResponse,
  soapEnv,
  soapBody,
  soapHeader,
  RequestData,
  encodeBody,
  action
} from './utils';
import { ExecuteAnonymousResponse, ApexExecuteOptions } from '../types';

export class ApexExecute {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async execute(
    options: ApexExecuteOptions
  ): Promise<ExecuteAnonymousResponse> {
    const data = readFileSync(options.apexCodeFile, 'utf8');
    const request = this.buildExecRequest(data);

    const result = await this.connectionRequest(request);
    const jsonResult = this.jsonFormat(result);
    return jsonResult;
  }

  private buildExecRequest(data: string): RequestData {
    const actionBody = `<apexcode>${data}</apexcode>`;
    const body = encodeBody(this.connection.accessToken, actionBody);
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
      soapResponse[soapEnv][soapBody].executeAnonymousResponse;

    const formattedResponse: ExecuteAnonymousResponse = {
      result: {
        compiled: execAnonResponse.result.compiled,
        compileProblem: execAnonResponse.result.compileProblem,
        success: execAnonResponse.result.success,
        line: execAnonResponse.result.line,
        column: execAnonResponse.result.column,
        exceptionMessage: execAnonResponse.result.exceptionMessage,
        exceptionStackTrace: execAnonResponse.result.exceptionStackTrace,
        logs: soapResponse[soapEnv][soapHeader].DebuggingInfo.debugLog
      }
    };

    return formattedResponse;
  }

  public async connectionRequest(
    requestData: RequestData
  ): Promise<SoapResponse> {
    const result = (await this.connection.request(requestData)) as SoapResponse;
    return result;
  }
}
