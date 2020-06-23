import { Connection } from '@salesforce/core';
import * as util from 'util';
import { ApexLogGetOptions } from '../types/service';
import * as fs from 'fs';

const MAX_NUM_LOGS = 25;

export class ApexLogGet {
  public readonly connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async getLogIds(numberOfLogs: number): Promise<string[]> {
    numberOfLogs = numberOfLogs > MAX_NUM_LOGS ? MAX_NUM_LOGS : numberOfLogs;
    const restrictLogs = numberOfLogs > 0 ? `+DESC+LIMIT+${numberOfLogs}` : '';
    const query = `Select+Id,+Application,+DurationMilliseconds,+Location,+LogLength,+LogUser.Name,+Operation,+Request,StartTime,+Status+From+ApexLog+Order+By+StartTime${restrictLogs}`;
    const url = util.format(
      '%s/services/data/v%s/tooling/query/?q=%s',
      this.connection.instanceUrl,
      this.connection.version,
      query
    );

    const response = await this.connection.request(url);
    const records = JSON.stringify(response);

    let logIds: string[] = [];
    JSON.parse(records, (key, value) => {
      if (key === 'Id') {
        logIds.push(value);
      }
    });
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
      const url = util.format(
        '%s/services/data/v%s/tooling/sobjects/ApexLog/%s/Body',
        this.connection.instanceUrl,
        this.connection.version,
        id
      );
      const response = await this.connectionRequest(url);
      const stringResponse = JSON.stringify(response);
      logRecords.push(stringResponse);
    }

    if (options.outputDir) {
      fs.writeFile(
        `${options.outputDir}/sfdxLogs.txt`,
        logRecords.join(', '),
        err => {
          if (err) throw err;
          console.log(
            `Logs are successfully written in the file located: ${
              options.outputDir
            }`
          );
        }
      );
    } else {
      return logRecords;
    }
  }

  public async connectionRequest(url: string) {
    const result = await this.connection.request(url);
    return result;
  }
}
