/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TestService } from '@salesforce/apex-node';
import {
  AsyncTestConfiguration,
  AsyncTestArrayConfiguration
} from '@salesforce/apex-node/lib/src/tests/types';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { buildDescription, logLevels } from '../../../../utils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'run');

export const TestLevel = [
  'RunLocalTests',
  'RunAllTestsInOrg',
  'RunSpecifiedTests'
];

export const resultFormat = ['human', 'tap', 'junit', 'json'];
export default class Run extends SfdxCommand {
  public static description = buildDescription(
    messages.getMessage('commandDescription'),
    messages.getMessage('longDescription')
  );

  public static longDescription = messages.getMessage('longDescription');
  public static examples = [
    `$ sfdx force:apex:test:run`,
    `$ sfdx force:apex:test:run -n "MyClassTest,MyOtherClassTest" -r human`,
    `$ sfdx force:apex:test:run -s "MySuite,MyOtherSuite" -c --json`,
    `$ sfdx force:apex:test:run -t "MyClassTest.testCoolFeature,MyClassTest.testAwesomeFeature,AnotherClassTest,namespace.TheirClassTest.testThis" -r human`,
    `$ sfdx force:apex:test:run -l RunLocalTests -d <path to outputdir> -u me@my.org`
  ];

  protected static supportsUsername = true;

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
    apiversion: flags.builtin(),
    codecoverage: flags.boolean({
      char: 'c',
      description: messages.getMessage('codeCoverageDescription')
    }),
    outputdir: flags.string({
      char: 'd',
      description: messages.getMessage('outputDirectoryDescription')
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('testLevelDescription'),
      options: TestLevel
    }),
    classnames: flags.string({
      char: 'n',
      description: messages.getMessage('classNamesDescription')
    }),
    resultformat: flags.enum({
      char: 'r',
      description: messages.getMessage('resultFormatLongDescription'),
      options: resultFormat
    }),
    suitenames: flags.string({
      char: 's',
      description: messages.getMessage('suiteNamesDescription')
    }),
    tests: flags.string({
      char: 't',
      description: messages.getMessage('testsDescription')
    }),
    wait: flags.string({
      char: 'w',
      description: messages.getMessage('waitDescription')
    }),
    synchronous: flags.boolean({
      char: 'y',
      description: messages.getMessage('synchronousDescription')
    }) /*,
    verbose: flags.string({
      description: messages.getMessage('verboseDescription')
    }) **/
  };

  public async run(): Promise<AnyJson> {
    try {
      if (!this.org) {
        return Promise.reject(
          new Error(messages.getMessage('missing_auth_error'))
        );
      }
      const conn = this.org.getConnection();
      const testService = new TestService(conn);
      let payload: AsyncTestConfiguration | AsyncTestArrayConfiguration;
      if (this.flags.tests) {
        payload = {
          tests: [
            {
              className: this.flags.tests
            }
          ],
          testLevel: this.flags.testlevel
        };
      } else {
        payload = {
          classNames: this.flags.classnames,
          suiteNames: this.flags.suitenames,
          testLevel: this.flags.testlevel
        };
      }

      const res = await testService.runTestAsynchronous(
        payload,
        this.flags.codecoverage
      );
      return res;
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
