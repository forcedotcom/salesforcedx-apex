/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestService } from '@salesforce/apex-node';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'build');

export default class Build extends SfdxCommand {
  protected static requiresUsername = true;
  // Guaranteed by requires username
  protected org!: Org;

  protected static flagsConfig = {
    suitename: flags.string({
      char: 's',
      description: messages.getMessage('suitenameDescription'),
      required: true
    }),
    testclasses: flags.string({
      char: 't',
      description: messages.getMessage('testClassesDescription'),
      dependsOn: ['suitename']
    })
  };

  public async run(): Promise<void> {
    const conn = this.org.getConnection();
    const testService = new TestService(conn);
    const testClasses = this.flags.testclasses
      ? this.flags.testclasses.split(',')
      : [];
    await testService.buildSuite(this.flags.suitename, testClasses);
  }
}
