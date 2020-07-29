/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexExecuteOptions,
  ExecuteAnonymousResponse,
  ExecuteService
} from '@salesforce/apex-node';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as chalk from 'chalk';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'execute');

const success = chalk.bold.green;
const error = chalk.bold.red;

export default class Execute extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');
  public static longDescription = messages.getMessage('longDescription');

  public static examples = [
    `$ sfdx force:apex:execute -f ~/test.apex`,
    `$ sfdx force:apex:execute \nStart typing Apex code. Press the Enter key after each line, then press CTRL+D when finished.`
  ];
  protected static supportsUsername = true;

  protected static flagsConfig = {
    apexcodefile: flags.filepath({
      char: 'f',
      description: messages.getMessage('apexCodeFileDescription')
    }),
    loglevel: flags.enum({
      description: messages.getMessage('logLevelDescription'),
      longDescription: messages.getMessage('logLevelLongDescription'),
      default: 'warn',
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
      ]
    }),
    apiversion: flags.builtin()
  };

  public async run(): Promise<AnyJson> {
    if (!this.org) {
      throw new Error(
        'Must pass a username and/or OAuth options when creating an AuthInfo instance.'
      );
    }
    const conn = this.org?.getConnection();
    // @ts-ignore
    const exec = new ExecuteService(conn);

    const execAnonOptions: ApexExecuteOptions = {
      ...(this.flags.apexcodefile
        ? { apexFilePath: this.flags.apexcodefile }
        : { userInput: true })
    };
    const result = await exec.executeAnonymous(execAnonOptions);
    if (this.flags.json) {
      return result.result;
    }
    this.ux.log(this.formatResult(result));
    return this.formatResult(result);
  }

  private formatResult(response: ExecuteAnonymousResponse): string {
    let outputText = '';
    if (response.result.compiled === true) {
      outputText += `${success(
        messages.getMessage('execute_compile_success')
      )}\n`;
      if (response.result.success === true) {
        outputText += `${success(
          messages.getMessage('execute_runtime_success')
        )}\n`;
      } else {
        outputText += error(`Error: ${response.result.exceptionMessage}\n`);
        outputText += error(`Error: ${response.result.exceptionStackTrace}\n`);
      }
      outputText += `\n${response.result.logs}`;
    } else {
      outputText += error(
        `Error: Line: ${response.result.line}, Column: ${response.result.column}\n`
      );
      outputText += error(`Error: ${response.result.compileProblem}\n`);
    }
    return outputText;
  }
}
