import { Connection } from '@salesforce/core';
import * as util from 'util';

export class ApexLogGet {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async getLogIds(numberOfLogs: number) {
    const restrictLogs = numberOfLogs > 0 ? `+DESC+LIMIT+${numberOfLogs}` : '';
    const query = util.format(
      'Select+Id,+Application,+DurationMilliseconds,+Location,+LogLength,+LogUser.Name,+Operation,+Request,StartTime,+Status+' +
        'From+ApexLog+' +
        'Order+By+StartTime' +
        '%s',
      restrictLogs
    );
    const url = util.format(
      '%s/services/data/v%s/tooling/query/?q=%s',
      this.connection.instanceUrl,
      this.connection.version,
      query
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
      numberOfLogs = numberOfLogs > 25 ? 25 : numberOfLogs;
      logIdList = await this.getLogIds(numberOfLogs);
    } else {
      logIdList.push(logId);
    }

    let logRecords: string[] = [];
    // Given logId retrieve log
    for (let id of logIdList) {
      const url = util.format(
        '%s/services/data/v%s/tooling/sobjects/ApexLog/%s/Body',
        this.connection.instanceUrl,
        this.connection.version,
        id
      );
      const response = await this.connectionRequest;
      const stringResponse = JSON.stringify(response);
      logRecords.push(stringResponse);
    }
    return logRecords;
  }

  public async connectionRequest(url: string) {
    const result = await this.connection.request(url);
    return result;
  }
}
