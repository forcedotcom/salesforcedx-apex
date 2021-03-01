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

export class HumanReporter {
  public format(testResult: TestResult, detailedCoverage: boolean): string {
    let tbResult = this.formatSummary(testResult);
    if (!testResult.codecoverage || !detailedCoverage) {
      tbResult += this.formatTestResults(testResult.tests);
    }

    if (testResult.codecoverage) {
      if (detailedCoverage) {
        tbResult += this.formatDetailedCov(testResult);
      }
      tbResult += this.formatCodeCov(testResult.codecoverage);
    }
    return tbResult;
  }

  private formatSummary(testResult: TestResult): string {
    const tb = new Table();

    // Summary Table
    const summaryRowArray: Row[] = [
      {
        name: nls.localize('outcome'),
        value: testResult.summary.outcome
      },
      {
        name: nls.localize('testsRan'),
        value: String(testResult.summary.testsRan)
      },
      {
        name: nls.localize('passRate'),
        value: testResult.summary.passRate
      },
      {
        name: nls.localize('failRate'),
        value: testResult.summary.failRate
      },
      {
        name: nls.localize('skipRate'),
        value: testResult.summary.skipRate
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
              value: String(testResult.summary.orgWideCoverage)
            }
          ]
        : [])
    ];

    const summaryTable = tb.createTable(
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

  private formatTestResults(tests: ApexTestResultData[]): string {
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
          name: elem.fullName,
          outcome: elem.outcome,
          msg: elem.message ? msg : '',
          runtime:
            elem.outcome !== ApexTestResultOutcome.Fail ? `${elem.runTime}` : ''
        });
      }
    );

    let testResultTable = '\n\n';
    testResultTable += tb.createTable(
      testRowArray,
      [
        {
          key: 'name',
          label: nls.localize('testNameColHeader')
        },
        { key: 'outcome', label: nls.localize('outcomeColHeader') },
        { key: 'msg', label: nls.localize('msgColHeader') },
        { key: 'runtime', label: nls.localize('runtimeColHeader') }
      ],
      nls.localize('testResultsHeader')
    );
    return testResultTable;
  }

  private formatDetailedCov(testResult: TestResult): string {
    const tb = new Table();
    const testRowArray: Row[] = [];
    testResult.tests.forEach((elem: ApexTestResultData) => {
      const msg = elem.stackTrace
        ? `${elem.message}\n${elem.stackTrace}`
        : elem.message;

      if (elem.perClassCoverage) {
        elem.perClassCoverage.forEach(perClassCov => {
          testRowArray.push({
            name: elem.fullName,
            coveredClassName: perClassCov.apexClassOrTriggerName,
            outcome: elem.outcome,
            coveredClassPercentage: perClassCov.percentage,
            msg: elem.message ? msg : '',
            runtime: `${elem.runTime}`
          });
        });
      } else {
        testRowArray.push({
          name: elem.fullName,
          coveredClassName: '',
          outcome: elem.outcome,
          coveredClassPercentage: '',
          msg: elem.message ? msg : '',
          runtime: `${elem.runTime}`
        });
      }
    });

    let detailedCovTable = '\n\n';
    detailedCovTable += tb.createTable(
      testRowArray,
      [
        {
          key: 'name',
          label: nls.localize('testNameColHeader')
        },
        {
          key: 'coveredClassName',
          label: nls.localize('classTestedHeader')
        },
        {
          key: 'outcome',
          label: nls.localize('outcomeColHeader')
        },
        {
          key: 'coveredClassPercentage',
          label: nls.localize('percentColHeader')
        },
        { key: 'msg', label: nls.localize('msgColHeader') },
        { key: 'runtime', label: nls.localize('runtimeColHeader') }
      ],
      nls.localize('detailedCodeCovHeader', [testResult.summary.testRunId])
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
          percent: elem.percentage,
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
