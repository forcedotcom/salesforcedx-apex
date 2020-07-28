/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LogService } from '@salesforce/apex-node';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'logGet');

export default class LogGet extends SfdxCommand {
  public static description = messages.getMessage('apexLogGetDescription');
  public static help = messages.getMessage('apexLogGetHelp');
  public static examples = [
    `$ sfdx force:apex:log:get -i <log id>
    `,
    `$ sfdx force:apex:log:get -i <log id> -u me@my.org
    `,
    `$ sfdx force:apex:log:get -n 2 -c
    `
  ];

  protected static flagsConfig = {
    json: flags.boolean({
      description: messages.getMessage('jsonFlagDescription')
    }),
    loglevel: flags.enum({
      description: messages.getMessage('logLevelFlagDescription'),
      options: [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'FATAL'
      ],
      default: 'warn'
    }),
    apiversion: flags.builtin(),
    color: flags.boolean({
      char: 'c',
      description: messages.getMessage('colorFlagDescription')
    }),
    logid: flags.id({
      char: 'i',
      description: messages.getMessage('logIDFlagDescription')
    }),
    number: flags.number({
      char: 'n',
      description: messages.getMessage('numberFlagDescription')
    }),
    outputdir: flags.string({
      char: 'd',
      description: messages.getMessage('outputDirFlagDescription'),
      default: '.'
    })
  };

  protected static supportsUsername = true;
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    if (!this.org) {
      throw new Error('Must pass a username and/or OAuth options when creating an AuthInfo instance.');
    }

    const conn = this.org.getConnection();
    const logService = new LogService(conn);
    // When no flag is given it will print out the most recent log
    if (!this.flags.logid && !this.flags.number && this.flags.outputdir === '.') {
      this.flags.number = 1;
    }
    const logs = await logService.getLogs({
      logId: this.flags.logid,
      numberOfLogs: this.flags.number,
      outputDir: this.flags.outputdir
    });

    // If no logs are available
    if (logs.length === 0) {
      this.ux.log('No results found');
    }

    // Holds for printing out logs using --json
    if (this.flags.json) {
      const logResult = [];
      for (let i = 0; i < logs.length; i++) {
        logResult[i] = {
          log : JSON.parse(logs[i])
        };
      }
      return logResult;
    } else {
      // tslint:disable-next-line:only-arrow-functions
      logs.forEach(log => {
        this.ux.log(JSON.parse(log));
      });
      return {logResult : 'ers'};
    }
  }
}
