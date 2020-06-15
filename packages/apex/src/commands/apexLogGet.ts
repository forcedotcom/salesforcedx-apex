import { Connection } from '@salesforce/core';
import * as util from 'util';

export class ApexLogGet {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // return the n most recent log id's
  public async getLogIds(numberOfLogs: number) {
    const restrictLogs = numberOfLogs > 0 ? `+DESC+LIMIT+${numberOfLogs}` : '';
    const url = util.format(
      '%s/services/data/v%s/tooling/query/?q=' +
        'Select+Id,+Application,+DurationMilliseconds,+Location,+LogLength,+LogUser.Name,+Operation,+Request,StartTime,+Status+' +
        'From+ApexLog+' +
        'Order+By+StartTime' +
        '%s',
      this.connection.instanceUrl,
      this.connection.version,
      restrictLogs
    );
    const response = await this.connection.request(url);
    const records = JSON.stringify(response);

    // To store log id's in an array
    let logId: string[] = [];
    JSON.parse(records, (key, value) => {
      if (key === 'Id') {
        logId.push(value);
      }
    });
    return logId;
  }

  /**
   * Handle -n and -i flags for force:apex:log:get
   * Output log bodies of last N number of logs
   * @param numberOfLogs {number} number of logs to retrieve
   * @param logId {string} logId - the debug log to retrieve
   */
  public async getLogs(numberOfLogs?: number, logId?: string) {
    let logIdList: string[] = [];
    if (numberOfLogs) {
      logIdList = await this.getLogIds(numberOfLogs);
    } else {
      logIdList.push(logId);
    }

    let logRecords: string[] = [];

    // Given logId retrieve log
    for (let i = 0; i < logIdList.length; i++) {
      const url = util.format(
        '%s/services/data/v%s/tooling/sobjects/ApexLog/%s/Body',
        this.connection.instanceUrl,
        this.connection.version,
        logIdList[i]
      );
      const response = await this.connection.request(url);
      const stringResponse = JSON.stringify(response);
      logRecords.push(stringResponse);
    }
    return logRecords;
  }
}
