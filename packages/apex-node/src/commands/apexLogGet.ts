import { Connection } from '@salesforce/core';
import * as util from 'util';

export class ApexLogGet {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async execute(logID: string) {
    //invalid  --> check for invalid flag and throw error
    //if no parameter than return the latest log
    //u --> default org if flag is not used
    //apiversion --> ??
    //number  --> call getMultipleLogs()
    //logid  --> call getSingleLog()
    //json  --> if json flag is true then no color return plain
    //color  --> no json flag, check for color flag, color the log lines
    //loglevel --> store the logs at $HOME/.sfdx/sfdx.log
  }

  // get the logs for the specified logid
  //if not mentioned then return the latest log
  public async getSingleLog(logID: string) {
    const url = util.format(
      '%s/services/data/v%s/tooling/sobjects/ApexLog/%s/Body',
      this.connection.instanceUrl,
      this.connection.version,
      logID
    );
    const response = await this.connection.request(url);
    return response;
  }

  //return the n most recent logs
  public async getMultipleLogs(numberOfLogs: number) {
    const restrictLogs =
      numberOfLogs && numberOfLogs > 0
        ? `+DESconst C+LIMIT+${numberOfLogs}`
        : '';
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

    // List of id's
    const response = await this.connection.request(url);
    return response;

    // print response to check its data
  }

  public async getLogs(numberOfLogs?: number, logId?: string) {
    let logIdList: string[] = [];
    if (numberOfLogs) {
      //  const result = helper(numberOfLogs);
      // get log ids for each log -> make a list of log ids
    } else {
      logIdList.push(logId);
      // add logId to list of ids
    }

    let logRecords: string[] = [];
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
    // build url
    //for every id in list of log ids
    // connection.request(url)
  }
}
