/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { ApexLogGetOptions } from '../types';
import { QueryResult } from '../types/common';
import { nls } from '../i18n';
import * as fs from 'fs';
import * as path from 'path';

const MAX_NUM_LOGS = 25;

export class LogService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // readableStream cannot be used until updates are made in jsforce and sfdx-core
  public async getLogs(options: ApexLogGetOptions): Promise<string[]> {
    let logIdList: string[] = [];
    if (options.numberOfLogs) {
      logIdList = await this.getLogIds(options.numberOfLogs);
    } else {
      logIdList.push(options.logId);
    }

    const connectionRequests = logIdList.map(async id => {
      const url = `${this.connection.tooling._baseUrl()}/sobjects/ApexLog/${id}/Body`;
      const logRecord = await this.connectionRequest(url);
      if (options.outputDir) {
        const filePath = path.join(`${options.outputDir}`, `${id}.txt`);
        const stream = fs.createWriteStream(filePath);
        stream.write(logRecord);
      }
      return logRecord;
    });
    const result = await Promise.all(connectionRequests);
    return options.outputDir ? [] : result;
  }

  public async getLogIds(numberOfLogs: number): Promise<string[]> {
    if (numberOfLogs <= 0) {
      throw new Error(nls.localize('num_logs_error'));
    }
    numberOfLogs = Math.min(numberOfLogs, MAX_NUM_LOGS);
    const query = `Select Id from ApexLog Order By StartTime DESC LIMIT ${numberOfLogs}`;
    const response = (await this.connection.tooling.query(
      query
    )) as QueryResult;
    return response.records.map(record => record.Id);
  }

  public async connectionRequest(url: string): Promise<string> {
    const log = await this.connection.request(url);
    return JSON.stringify(log);
  }
}
