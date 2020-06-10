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

  public async getSingleLog(logID: string) {
    const url = util.format(
      '%s/services/data/v%s/tooling/sobjects/ApexLog/%s/Body',
      this.connection.instanceUrl,
      this.connection.version,
      logID
    );

    const response = await this.connection.request(url);

    return response;

    // get the logs for the specified logid
    //if not mentioned then return the latest log
  }

  public async getMultipleLogs(numberOfLogs: number) {
    //return the n most recent logs
  }
}
