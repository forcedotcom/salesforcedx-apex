/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync } from 'fs';
import * as util from 'util';
import { Connection } from '@salesforce/core';
import {
  soapTemplate,
  SoapResponse,
  soapEnv,
  soapBody,
  soapHeader
} from './utils';
import { ExecuteAnonymousResponse } from '../types';

export class ApexExecute {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async execute(filePath: string): Promise<ExecuteAnonymousResponse> {
    const data = readFileSync(filePath, 'utf8');
    const request = this.buildExecRequest(data);

    const result = ((await this.connection.request(
      request
    )) as unknown) as SoapResponse;
    const formattedResult = this.formatResult(result);
    return formattedResult;
  }

  private buildExecRequest(data: string) {
    const action = 'executeAnonymous';
    const debugHeader =
      '<apex:DebuggingHeader><apex:debugLevel>DEBUGONLY</apex:debugLevel></apex:DebuggingHeader>';
    const actionBody = `<apexcode>${data}</apexcode>`;
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
      body: util.format(
        soapTemplate,
        this.connection.accessToken,
        debugHeader,
        action,
        actionBody,
        action
      ),
      headers: requestHeaders
    };

    return request;
  }

  public formatResult(soapResponse: SoapResponse): ExecuteAnonymousResponse {
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
}
