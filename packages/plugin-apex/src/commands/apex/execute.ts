/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexExecuteOptions, ExecuteService } from '@salesforce/apex-node';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'execute');

export default class Execute extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `Executes one or more lines of Apex code entered on the command line, or executes the code in a local file. To execute your code interactively, run this command with no parameters. At the prompt, enter all your Apex code; press CTRL-D when you're finished. Your code is then executed in a single execute anonymous request. For more information, see "Anonymous Blocks" in the Apex Developer Guide.\n\nExamples:\n`,
    '   $ sfdx force:apex:execute -f ~/test.apex',
    '   $ sfdx force:apex:execute \n   >> Start typing Apex code. Press the Enter key after each line,\n   >> then press CTRL+D when finished.'
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

  public async run(): Promise<void> {
    if (!this.org) {
      throw new Error(
        'Must pass a username and/or OAuth options when creating an AuthInfo instance.'
      );
    }
    const conn = this.org!.getConnection();
    const exec = new ExecuteService(conn);

    const execAnonOptions: ApexExecuteOptions = {
      ...(this.flags.apexcodefile
        ? { apexFilePath: this.flags.apexcodefile }
        : {})
    };
    const result = await exec.executeAnonymous(execAnonOptions);
    if (this.flags.json) {
      this.ux.log(result.result.logs);
    }
  }
}
