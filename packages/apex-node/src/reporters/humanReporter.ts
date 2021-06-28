/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Row, Table } from '../utils';
import {
  ApexTestResultData,
  ApexTestResultOutcome,
  CodeCoverageResult,
  TestResult
} from '../tests';
import { nls } from '../i18n';
import chalk from 'chalk';

const PASS = chalk.inverse.bold.green(' Pass ');
export class HumanReporter {
  public format(testResult: TestResult, detailedCoverage: boolean): string {
    let tbResult = '';
    if (!testResult.codecoverage || !detailedCoverage) {
      tbResult += this.formatTestResults(
        testResult.tests,
        nls.localize('testResultsHeader')
      );
    }

    if (testResult.codecoverage) {
      if (detailedCoverage) {
        tbResult += this.formatAllDetailedCov(testResult);
      }
      tbResult += this.formatCodeCov(testResult.codecoverage);
    }

    tbResult += this.formatSummary(testResult);

    if (!testResult.codecoverage || !detailedCoverage) {
      tbResult += this.formatFailed(testResult.tests);
    }

    if (testResult.codecoverage && detailedCoverage) {
      tbResult += this.formatFailedCov(testResult);
    }
    return tbResult;
  }

  private formatSummary(testResult: TestResult): string {
    const tb = new Table();

    const succesful = testResult.summary.outcome === 'Passed';
    // Summary Table
    const summaryRowArray: Row[] = [
      {
        name: nls.localize('outcome'),
        value: succesful
          ? chalk.inverse.bold.green(` ${testResult.summary.outcome} `)
          : chalk.inverse.bold.red(` ${testResult.summary.outcome} `)
      },
      {
        name: nls.localize('testsRan'),
        value: String(testResult.summary.testsRan)
      },
      {
        name: nls.localize('passedSummary'),
        value: chalk.bold.green(
          `${testResult.summary.passing} ${nls.localize('passed')} (${
            testResult.summary.passRate
          })`
        )
      },
      {
        name: nls.localize('failedSummary'),
        value: chalk.bold.red(
          `${testResult.summary.failing} ${nls.localize('failed')} (${
            testResult.summary.failRate
          })`
        )
      },
      {
        name: nls.localize('skippedSummary'),
        value: chalk.bold.yellow(
          `${testResult.summary.skipped} ${nls.localize('skipped')} (${
            testResult.summary.skipRate
          })`
        )
      },
      {
        name: nls.localize('testRunId'),
        value: testResult.summary.testRunId
      },
      {
        name: nls.localize('testExecutionTime'),
        value: `${testResult.summary.testExecutionTimeInMs} ms`
      },
      {
        name: nls.localize('orgId'),
        value: testResult.summary.orgId
      },
      {
        name: nls.localize('username'),
        value: testResult.summary.username
      },
      ...(testResult.summary.orgWideCoverage
        ? [
            {
              name: nls.localize('orgWideCoverage'),
              value:
                parseInt(testResult.summary.orgWideCoverage) >= 75
                  ? chalk.bold.green(testResult.summary.orgWideCoverage)
                  : chalk.bold.red(testResult.summary.orgWideCoverage)
            }
          ]
        : [])
    ];

    let summaryTable = '\n\n';
    summaryTable += tb.createTable(
      summaryRowArray,
      [
        {
          key: 'name',
          label: nls.localize('nameColHeader')
        },
        { key: 'value', label: nls.localize('valueColHeader') }
      ],
      nls.localize('testSummaryHeader')
    );
    return summaryTable;
  }

  private formatFailed(tests: ApexTestResultData[]): string {
    const failedTests = tests.filter(
      test => test.outcome === ApexTestResultOutcome.Fail
    );
    return this.formatTestResults(failedTests, 'Failed Tests');
  }

  private formatTestResults(
    tests: ApexTestResultData[],
    tableHeader: string
  ): string {
    if (tests.length === 0) {
      return '';
    }

    const tb = new Table();
    const testRowArray: Row[] = [];

    tests.forEach(
      (elem: {
        fullName: string;
        outcome: ApexTestResultOutcome;
        message: string | null;
        runTime: number;
        stackTrace: string | null;
      }) => {
        const msg = elem.stackTrace
          ? `${elem.message}\n${elem.stackTrace}`
          : elem.message;

        testRowArray.push({
          name: msg ? `${elem.fullName}\n\n${msg}\n` : elem.fullName,
          outcome:
            elem.outcome === ApexTestResultOutcome.Pass
              ? PASS
              : chalk.inverse.bold.red(` ${elem.outcome} `),
          runtime:
            elem.outcome !== ApexTestResultOutcome.Fail
              ? `${elem.runTime} ms`
              : ''
        });
      }
    );

    let testResultTable = '\n\n';
    testResultTable += tb.createTable(
      testRowArray,
      [
        { key: 'outcome', label: nls.localize('outcomeColHeader') },
        {
          key: 'name',
          label: nls.localize('testNameColHeader')
        },
        { key: 'runtime', label: nls.localize('runtimeColHeader') }
      ],
      tableHeader
    );
    return testResultTable;
  }

  private formatFailedCov(testResult: TestResult): string {
    const failedTests = testResult.tests.filter(
      test => test.outcome === ApexTestResultOutcome.Fail
    );

    return this.formatDetailedCov(
      failedTests,
      'Apex Code Coverage Failed Tests'
    );
  }

  private formatAllDetailedCov(testResult: TestResult): string {
    return this.formatDetailedCov(
      testResult.tests,
      nls.localize('detailedCodeCovHeader', [testResult.summary.testRunId])
    );
  }

  private formatDetailedCov(
    tests: ApexTestResultData[],
    tableTitle: string
  ): string {
    const tb = new Table();
    const testRowArray: Row[] = [];
    tests.forEach((elem: ApexTestResultData) => {
      const msg = elem.stackTrace
        ? `${elem.message}\n${elem.stackTrace}`
        : elem.message;

      if (elem.perClassCoverage) {
        elem.perClassCoverage.forEach(perClassCov => {
          testRowArray.push({
            name: msg ? `${elem.fullName}\n\n${msg}\n` : elem.fullName,
            coveredClassName: perClassCov.apexClassOrTriggerName,
            outcome:
              elem.outcome === ApexTestResultOutcome.Pass
                ? PASS
                : chalk.inverse.bold.red(` ${elem.outcome} `),
            coveredClassPercentage: perClassCov.percentage,
            runtime: `${elem.runTime} ms`
          });
        });
      } else {
        testRowArray.push({
          name: msg ? `${elem.fullName}\n\n${msg}\n` : elem.fullName,
          coveredClassName: '',
          outcome:
            elem.outcome === ApexTestResultOutcome.Pass
              ? PASS
              : chalk.inverse.bold.red(` ${elem.outcome} `),
          coveredClassPercentage: '',
          runtime: `${elem.runTime} ms`
        });
      }
    });

    let detailedCovTable = '\n\n';
    detailedCovTable += tb.createTable(
      testRowArray,
      [
        {
          key: 'outcome',
          label: nls.localize('outcomeColHeader')
        },
        {
          key: 'name',
          label: nls.localize('testNameColHeader')
        },
        {
          key: 'coveredClassName',
          label: nls.localize('classTestedHeader')
        },
        {
          key: 'coveredClassPercentage',
          label: nls.localize('percentColHeader')
        },
        { key: 'runtime', label: nls.localize('runtimeColHeader') }
      ],
      tableTitle
    );
    return detailedCovTable;
  }

  private formatCodeCov(codeCoverages: CodeCoverageResult[]): string {
    const tb = new Table();
    const codeCovRowArray: Row[] = [];
    codeCoverages.forEach(
      (elem: {
        name: string;
        percentage: string;
        uncoveredLines: number[];
      }) => {
        codeCovRowArray.push({
          name: elem.name,
          percent:
            parseInt(elem.percentage) >= 75
              ? chalk.bold.green(` ${elem.percentage} `)
              : chalk.bold.red(` ${elem.percentage} `),
          uncoveredLines: this.formatUncoveredLines(elem.uncoveredLines)
        });
      }
    );

    let codeCovTable = '\n\n';
    codeCovTable += tb.createTable(
      codeCovRowArray,
      [
        {
          key: 'name',
          label: nls.localize('classesColHeader')
        },
        {
          key: 'percent',
          label: nls.localize('percentColHeader')
        },
        {
          key: 'uncoveredLines',
          label: nls.localize('uncoveredLinesColHeader')
        }
      ],
      nls.localize('codeCovHeader')
    );
    return codeCovTable;
  }

  private formatUncoveredLines(uncoveredLines: number[]): string {
    const arrayLimit = 5;
    if (uncoveredLines.length === 0) {
      return '';
    }

    const limit =
      uncoveredLines.length > arrayLimit ? arrayLimit : uncoveredLines.length;
    let processedLines = uncoveredLines.slice(0, limit).join(',');
    if (uncoveredLines.length > arrayLimit) {
      processedLines += '...';
    }
    return processedLines;
  }
}
