/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { ApexLogGetOptions, LogIdQueryResult, LogIdRecord } from './types';
import { createFile } from '../common';
import { nls } from '../i18n';
import * as path from 'path';
import { AnyJson } from '@salesforce/ts-types';

const MAX_NUM_LOGS = 25;

export class LogService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // i think this should be private
  public async getIdList(options: ApexLogGetOptions): Promise<string[]> {
    if (
      !(
        typeof options.logId === 'string' ||
        typeof options.numberOfLogs === 'number'
      )
    ) {
      throw new Error(nls.localize('missing_info_log_error'));
    }

    if (typeof options.numberOfLogs === 'number') {
      const logIdRecordList = await this.getLogIdRecords(options.numberOfLogs);
      return logIdRecordList.map(logRecord => logRecord.Id);
    }
    return [options.logId];
  }

  // TODO: readableStream cannot be used until updates are made in jsforce and sfdx-core
  public async getLogs(options: ApexLogGetOptions): Promise<string[]> {
    const logIdList = await this.getIdList(options);
    const logPaths: string[] = [];
    const connectionRequests = logIdList.map(async id => {
      const url = `${this.connection.tooling._baseUrl()}/sobjects/ApexLog/${id}/Body`;
      const logRecord = await this.toolingRequest(url);
      if (options.outputDir) {
        const logPath = path.join(options.outputDir, `${id}.log`);
        logPaths.push(logPath);
        createFile(logPath, logRecord);
      }
      return String(logRecord);
    });

    const logs = await Promise.all(connectionRequests);
    if (logPaths.length > 0) {
      return logPaths;
    }
    return logs;
  }

  // mess with this to return more than just the ID will need to add the other table headers to the query request
  public async getLogIdRecords(numberOfLogs?: number): Promise<LogIdRecord[]> {
    let query =
      'Select Id, Application, DurationMilliseconds, Location, LogLength, LogUser.Name, Operation, Request, StartTime, Status from ApexLog Order By StartTime';

    if (numberOfLogs) {
      if (numberOfLogs <= 0) {
        throw new Error(nls.localize('num_logs_error'));
      }
      numberOfLogs = Math.min(numberOfLogs, MAX_NUM_LOGS);
      query += `DESC LIMIT ${numberOfLogs}`;
    }
    const response = (await this.connection.tooling.query(
      query
    )) as LogIdQueryResult;
    return response.records as LogIdRecord[];
  }

  // method to format the date data correctly

  // method to table format

  public async toolingRequest(url: string): Promise<AnyJson> {
    const log = (await this.connection.tooling.request(url)) as AnyJson;
    return log;
  }
}
