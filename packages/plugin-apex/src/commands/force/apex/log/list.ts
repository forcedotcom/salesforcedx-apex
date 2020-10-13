/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogService } from '@salesforce/apex-node';
import { LogIdRecord } from '@salesforce/apex-node/lib/src/logs/types';
import { Table } from '@salesforce/apex-node/lib/src/common';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org } from '@salesforce/core';
import { buildDescription, logLevels } from '../../../../utils';
import { Row } from '@salesforce/apex-node/lib/src/common/table';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'list');

export default class List extends SfdxCommand {
  protected static requiresUsername = true;
  // Guaranteed by requires username
  protected org!: Org;

  public static description = buildDescription(
    messages.getMessage('commandDescription'),
    messages.getMessage('longDescription')
  );

  public static longDescription = messages.getMessage('longDescription');
  public static examples = [
    `$ sfdx force:apex:log:list`,
    `$ sfdx force:apex:log:list -u me@my.org`
  ];

  protected static flagsConfig = {
    json: flags.boolean({
      description: messages.getMessage('jsonDescription')
    }),
    loglevel: flags.enum({
      description: messages.getMessage('logLevelDescription'),
      longDescription: messages.getMessage('logLevelLongDescription'),
      default: 'warn',
      options: logLevels
    }),
    apiversion: flags.builtin()
  };

  public async run(): Promise<LogIdRecord[]> {
    try {
      const conn = this.org.getConnection();
      const logService = new LogService(conn);

      const logRecords = await logService.getLogIdRecords();
      const table = this.formatTable(logRecords);
      this.ux.log(table);
      this.ux.log(logRecords[0].Id);
      this.ux.log(logRecords[1].Id);
      this.ux.log(logRecords[2].Id);
      return logRecords;
    } catch (e) {
      return [{} as LogIdRecord];
    }
  }

  public formatTable(logRecords: LogIdRecord[]): string {
    const tb = new Table();
    const logRowArray: Row[] = [];

    for (const logRecord of logRecords) {
      const row: Row = {
        APPLICATION: logRecord.Application,
        DURATION: String(logRecord.DurationMilliseconds),
        ID: logRecord.Id,
        LOCATION: logRecord.Location,
        SIZE: String(logRecord.LogLength),
        USER: logRecord.LogUser.Name,
        OPERATION: logRecord.Operation,
        REQUEST: logRecord.Request,
        STARTTIME: logRecord.StartTime,
        STATUS: logRecord.Status
      };
      logRowArray.push(row);
    }

    const tableResult = tb.createTable(
      logRowArray,
      [
        {
          key: 'name',
          label: 'colHeader'
        }
      ],
      'Test Summary Header'
    );
    return tableResult;
  }
}
