/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { JUnitReporter, TapReporter, TestService } from '@salesforce/apex-node';
import { TestResult } from '@salesforce/apex-node/lib/src/tests/types';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { HumanReporter, JsonReporter } from '../../../../reporters';
import { buildDescription, logLevels, resultFormat } from '../../../../utils';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'report');

export default class Report extends SfdxCommand {
  protected static requiresUsername = true;
  // Guaranteed by requires username
  protected org!: Org;

  public static description = buildDescription(
    messages.getMessage('commandDescription'),
    messages.getMessage('longDescription')
  );

  public static longDescription = messages.getMessage('longDescription');
  public static examples = [
    `$ sfdx force:apex:test:report -i <test run id>`,
    `$ sfdx force:apex:test:report -i <test run id> -r junit`,
    `$ sfdx force:apex:test:report -i <test run id> -c --json`,
    `$ sfdx force:apex:test:report -i <test run id> -c -d <path to outputdir> -u me@myorg`
  ];

  protected static flagsConfig = {
    testrunid: flags.string({
      char: 'i',
      description: messages.getMessage('testRunIdDescription'),
      required: true
    }),
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
    resultformat: flags.enum({
      char: 'r',
      description: messages.getMessage('resultFormatLongDescription'),
      options: resultFormat
    }),
    wait: flags.string({
      char: 'w',
      description: messages.getMessage('waitDescription')
    }),
    verbose: flags.builtin({
      description: messages.getMessage('verboseDescription')
    })
  };

  public async run(): Promise<AnyJson> {
    try {
      const conn = this.org.getConnection();
      const testService = new TestService(conn);
      const result = await testService.reportAsyncResults(
        this.flags.testrunid,
        this.flags.codecoverage
      );

      switch (this.flags.resultformat) {
        case 'tap':
          this.logTap(result);
          break;
        case 'junit':
          this.logJUnit(result);
          break;
        default:
          this.logHuman(result, true);
      }

      return this.logJson(result);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private logHuman(result: TestResult, detailedCoverage: boolean): void {
    try {
      const humanReporter = new HumanReporter();
      const output = humanReporter.format(result, detailedCoverage);
      this.ux.log(output);
    } catch (e) {
      this.ux.logJson(result);
      const msg = messages.getMessage('testResultProcessErr', [e]);
      this.ux.error(msg);
    }
  }

  private logTap(result: TestResult): void {
    try {
      const reporter = new TapReporter();
      const hint = this.formatReportHint(result);
      this.ux.log(reporter.format(result, [hint]));
    } catch (err) {
      this.ux.logJson(result);
      const msg = messages.getMessage('testResultProcessErr', [err]);
      this.ux.error(msg);
    }
  }

  private logJUnit(result: TestResult): void {
    try {
      const reporter = new JUnitReporter();
      this.ux.log(reporter.format(result));
    } catch (e) {
      this.ux.logJson(result);
      const msg = messages.getMessage('testResultProcessErr', [e]);
      this.ux.error(msg);
    }
  }

  private logJson(result: TestResult): AnyJson {
    try {
      const reporter = new JsonReporter();
      return reporter.format(result);
    } catch (e) {
      this.ux.logJson(result);
      const msg = messages.getMessage('testResultProcessErr', [e]);
      this.ux.error(msg);
    }
    return result;
  }

  private formatReportHint(result: TestResult): string {
    let reportArgs = `-i ${result.summary.testRunId}`;
    if (this.flags.targetusername) {
      reportArgs += ` -u ${this.flags.targetusername}`;
    }
    const hint = messages.getMessage('apexTestReportFormatHint', [reportArgs]);
    return hint;
  }
}
