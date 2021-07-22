/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import {
  DEFAULT_DEBUG_LEVEL_NAME,
  LOG_TYPE,
  MAX_NUM_LOGS,
  TAIL_LISTEN_TIMEOUT_MIN
} from './constants';
import {
  ApexLogGetOptions,
  LogQueryResult,
  LogRecord,
  LogResult
} from './types';
import * as path from 'path';
import * as util from 'util';
import { nls } from '../i18n';
import { createFile } from '../utils';
import { QueryResult } from '../utils/types';

export class LogService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async getLogIds(options: ApexLogGetOptions): Promise<string[]> {
    if (
      !(
        typeof options.logId === 'string' ||
        typeof options.numberOfLogs === 'number'
      )
    ) {
      throw new Error(nls.localize('missingInfoLogError'));
    }

    if (typeof options.numberOfLogs === 'number') {
      const logIdRecordList = await this.getLogRecords(options.numberOfLogs);
      return logIdRecordList.map(logRecord => logRecord.Id);
    }
    return [options.logId];
  }

  // TODO: readableStream cannot be used until updates are made in jsforce and sfdx-core
  public async getLogs(options: ApexLogGetOptions): Promise<LogResult[]> {
    const logIdList = await this.getLogIds(options);
    const logPaths: string[] = [];
    const connectionRequests = logIdList.map(async id => {
      const url = `${this.connection.tooling._baseUrl()}/sobjects/ApexLog/${id}/Body`;
      const logRecord = await this.toolingRequest(url);
      //const logRecord = await this.getLogById(id);
      if (options.outputDir) {
        const logPath = path.join(options.outputDir, `${id}.log`);
        logPaths.push(logPath);
        createFile(logPath, logRecord);
      }
      return String(logRecord);
    });

    const logs = await Promise.all(connectionRequests);
    if (logPaths.length > 0) {
      const logMap: LogResult[] = [];
      for (let i = 0; i < logs.length; i++) {
        logMap.push({ log: logs[i], logPath: logPaths[i] });
      }
      return logMap;
    }

    return logs.map(log => {
      return { log };
    });
  }

  public async getLogById(logId: string): Promise<AnyJson> {
    const url = `${this.connection.tooling._baseUrl()}/sobjects/ApexLog/${logId}/Body`;
    const response = (await this.connection.tooling.request(url)) as AnyJson;
    return { log: response.toString() || '' };
  }

  public async getLogRecords(numberOfLogs?: number): Promise<LogRecord[]> {
    let apexLogQuery =
      'Select Id, Application, DurationMilliseconds, Location, LogLength, LogUser.Name, ' +
      'Operation, Request, StartTime, Status from ApexLog Order By StartTime DESC';
    if (typeof numberOfLogs === 'number') {
      if (numberOfLogs <= 0) {
        throw new Error(nls.localize('numLogsError'));
      }
      numberOfLogs = Math.min(numberOfLogs, MAX_NUM_LOGS);
      apexLogQuery += ` LIMIT ${numberOfLogs}`;
    }

    const response = (await this.connection.tooling.query(
      apexLogQuery
    )) as LogQueryResult;
    return response.records as LogRecord[];
  }

  async createTraceFlag(userId: string): Promise<void> {
    const DebugLevelId = await this.getDebugLevelId(DEFAULT_DEBUG_LEVEL_NAME);
    const startDate = new Date();
    const expirationDate = new Date(startDate);
    expirationDate.setMinutes(startDate.getMinutes() + TAIL_LISTEN_TIMEOUT_MIN);
    const traceFlag = {
      LogType: LOG_TYPE,
      TracedEntityId: userId,
      StartDate: startDate,
      ExpirationDate: expirationDate,
      DebugLevelId
    };

    await this.connection.tooling.create('TraceFlag', traceFlag);
  }

  private async getDebugLevelId(debugLevel: string): Promise<string> {
    const DEBUG_LEVEL_QUERY =
      "SELECT Id FROM DebugLevel WHERE DeveloperName = '%s'";
    const debugQuery = util.format(DEBUG_LEVEL_QUERY, debugLevel);
    const debugLevelResult = await this.connection.tooling.query<{
      Id: string;
    }>(debugQuery);
    if (!this.hasRecords(debugLevelResult)) {
      throw new SfdxError(nls.localize('debugLevelNotFound', debugLevel));
    }

    return debugLevelResult.records[0].Id;
  }

  async usernameToUserId(username: string): Promise<string> {
    const USERNAME_QUERY = "SELECT Id FROM User WHERE Username = '%s'";
    return (
      await this.connection.singleRecordQuery<{ Id: string }>(
        util.format(USERNAME_QUERY, username)
      )
    ).Id;
  }

  async getTraceFlag(
    userId: string
  ): Promise<
    QueryResult<{
      ExpirationDate: string;
      StartDate: string;
      DebugLevelId: string;
    }>
  > {
    const TRACE_FLAG_QUERY =
      'SELECT Id, DebugLevelId, StartDate, ExpirationDate FROM TraceFlag ' +
      "WHERE TracedEntityId = '%s' AND LogType = '%s'" +
      'ORDER BY CreatedDate DESC ' +
      'LIMIT 1';
    const traceQuery = util.format(TRACE_FLAG_QUERY, userId, LOG_TYPE);
    return await this.connection.tooling.query(traceQuery);
  }

  public async toolingRequest(url: string): Promise<AnyJson> {
    const log = (await this.connection.tooling.request(url)) as AnyJson;
    return log;
  }

  private hasRecords(result: QueryResult): boolean {
    return result?.records?.length > 0;
  }
}
