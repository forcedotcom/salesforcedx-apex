/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { RequestData } from './execute';
import { nls } from '../i18n';

enum logLevel {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
  fatal = 'fatal'
}

export type CommonOptions = {
  json?: boolean;
  loglevel?: logLevel;
};

export type QueryResult = {
  records: { Id: string }[];
};

export abstract class ApiRequest {
  protected connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async runRequest(request: RequestData, isTooling = false) {
    let count = 0;
    while (count < 2) {
      try {
        if (isTooling) {
          const result = await this.connection.tooling.request(request);
          return result;
        }
        const result = await this.connection.request(request);
        return result;
      } catch (e) {
        if (
          e.name === 'ERROR_HTTP_500' &&
          e.message &&
          e.message.includes('INVALID_SESSION_ID')
        ) {
          await this.refreshAuth(this.connection);
          count += 1;
        } else {
          nls.localize('unexpected_execute_command_error', e.message);
          throw new Error(e.message);
        }
      }
    }
  }

  public async refreshAuth(connection: Connection) {
    const requestInfo = { url: connection.baseUrl(), method: 'GET' };
    return await connection.request(requestInfo);
  }
}
