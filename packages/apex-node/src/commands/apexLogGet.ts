import { Connection } from '@salesforce/core';
import { ApexLogGetOptions } from '../types/service';
import { QueryResult } from '../types/common';
import { nls } from '../i18n';
import * as fs from 'fs';
const fsPromises = fs.promises;

const MAX_NUM_LOGS = 25;

export class ApexLogGet {
  public readonly connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async getLogIds(numberOfLogs: number): Promise<string[]> {
    if (numberOfLogs <= 0) {
      throw new Error(nls.localize('num_logs_error'));
    }
    numberOfLogs = numberOfLogs > MAX_NUM_LOGS ? MAX_NUM_LOGS : numberOfLogs;
    const query = `Select Id from ApexLog Order By StartTime DESC LIMIT ${numberOfLogs}`;

    const response = (await this.connection.tooling.query(
      query
    )) as QueryResult;
    const logIds: string[] = [];
    for (let record of response.records) {
      logIds.push(record.Id);
    }

    return logIds;
  }

  public async execute(options: ApexLogGetOptions): Promise<string[]> {
    let logIdList: string[] = [];
    if (options.numberOfLogs) {
      logIdList = await this.getLogIds(options.numberOfLogs);
    } else {
      logIdList.push(options.logId);
    }

    let logRecords: string[] = [];
    for (let id of logIdList) {
      const url = `${this.connection.instanceUrl}/services/data/v${
        this.connection.version
      }/tooling/sobjects/ApexLog/${id}/Body`;

      const response = await this.connectionRequest(url);
      logRecords.push(response);

      if (options.outputDir) {
        await fsPromises.writeFile(`${options.outputDir}/${id}.txt`, response);
      }
    }
    return logRecords;
  }

  public async connectionRequest(url: string): Promise<string> {
    const result = await this.connection.request(url);
    return JSON.stringify(result);
  }
}
