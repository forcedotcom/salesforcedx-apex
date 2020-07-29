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

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'logGet');

export default class LogGet extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');
  public static longDescription = messages.getMessage('longDescription');
  public static examples = [
    `$ sfdx force:apex:log:get -i <log id>`,
    `$ sfdx force:apex:log:get -i <log id> -u me@my.org`,
    `$ sfdx force:apex:log:get -n 2 -c`
  ];
  protected static supportsUsername = true;
  protected static requiresProject = false;

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
      min: 1,
      max: 25,
      description: messages.getMessage('numberFlagDescription')
    }),
    outputdir: flags.string({
      char: 'd',
      description: messages.getMessage('outputDirFlagDescription'),
      default: '.'
    })
  };

  public async run(): Promise<AnyJson> {
    try {
      if (!this.org) {
        throw new Error('Must pass a username and/or OAuth options when creating an AuthInfo instance.');
      }

      const conn = this.org.getConnection();
      const logService = new LogService(conn);
      if (!this.flags.logid && !this.flags.number && this.flags.outputdir === '.') {
        this.flags.number = 1;
      }
      const logs = await logService.getLogs({
        logId: this.flags.logid,
        numberOfLogs: this.flags.number,
        outputDir: this.flags.outputdir
      });

      if (logs.length === 0) {
        this.ux.log('No results found');
      }

      if (this.flags.json) {
        const logResult: AnyJson = [];
        logs.forEach(log => {
          logResult.push({
            log: JSON.parse(log)
          });
        })
        return logResult;
      } else {
        // tslint:disable-next-line:only-arrow-functions
        logs.forEach(log => {
          this.ux.log(JSON.parse(log));
        });
        return {};
      }
    } catch(e) {
      return Promise.reject(e);
    }
  } 
}
