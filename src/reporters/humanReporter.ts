/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { elapsedTime, HeapMonitor, Row, Table } from '../utils';
import {
  ApexTestResultData,
  ApexTestResultOutcome,
  CodeCoverageResult,
  TestResult
} from '../tests';
import { nls } from '../i18n';
import { LoggerLevel } from '@salesforce/core';
import * as os from 'node:os';

export class HumanReporter {
  @elapsedTime()
  public format(
    testResult: TestResult,
    detailedCoverage: boolean,
    concise: boolean = false
  ): string {
    HeapMonitor.getInstance().checkHeapSize('HumanReporter.format');
    try {
      let tbResult: string = '';
      if (!testResult.codecoverage || !detailedCoverage) {
        tbResult += this.formatTestResults(testResult.tests, concise);
      }

      if (testResult.codecoverage) {
        if (detailedCoverage) {
          tbResult += this.formatDetailedCov(testResult, concise);
        }
        if (!concise) {
          tbResult += this.formatCodeCov(testResult.codecoverage);
        }
      }
      if (testResult.setup && !concise) {
        tbResult += this.formatSetup(testResult);
      }
      tbResult += this.formatSummary(testResult);
      return tbResult;
    } finally {
      HeapMonitor.getInstance().checkHeapSize('HumanReporter.format');
    }
  }

  @elapsedTime()
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
        name: nls.localize('testSetupTime'),
        value: `${testResult.summary.testSetupTimeInMs || 0} ms`
      },
      {
        name: nls.localize('testExecutionTime'),
        value: `${testResult.summary.testExecutionTimeInMs} ms`
      },
      {
        name: nls.localize('testTotalTime'),
        value: `${testResult.summary.testTotalTimeInMs} ms`
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

    let summaryTable = os.EOL.repeat(2);
    return (summaryTable += tb.createTable(
      summaryRowArray,
      [
        {
          key: 'name',
          label: nls.localize('nameColHeader')
        },
        { key: 'value', label: nls.localize('valueColHeader') }
      ],
      nls.localize('testSummaryHeader')
    ));
  }

  @elapsedTime()
  private formatTestResults(
    tests: ApexTestResultData[],
    concise: boolean
  ): string {
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
        if (
          !concise ||
          elem.outcome === ApexTestResultOutcome.Fail ||
          elem.outcome === ApexTestResultOutcome.CompileFail
        ) {
          const msg = elem.stackTrace
            ? `${elem.message}\n${elem.stackTrace}`
            : elem.message;

          testRowArray.push({
            name: elem.fullName,
            outcome: elem.outcome,
            msg: elem.message ? msg : '',
            runtime:
              elem.outcome !== ApexTestResultOutcome.Fail
                ? `${elem.runTime}`
                : ''
          });
        }
      }
    );

    let testResultTable: string = '';
    if (testRowArray.length > 0) {
      testResultTable = os.EOL.repeat(2);
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
    }
    return testResultTable;
  }

  @elapsedTime()
  private formatSetup(testResult: TestResult): string {
    const tb = new Table();
    const testRowArray: Row[] = [];
    testResult.setup.forEach((elem) => {
      testRowArray.push({
        name: elem.fullName,
        time: `${elem.testSetupTime}`,
        runId: testResult.summary.testRunId
      });
    });
    let testResultTable: string = '';
    if (testRowArray.length > 0) {
      testResultTable = os.EOL.repeat(2);
      testResultTable += tb.createTable(
        testRowArray,
        [
          {
            key: 'name',
            label: nls.localize('testSetupMethodNameColHeader')
          },
          { key: 'time', label: nls.localize('setupTimeColHeader') }
        ],
        nls
          .localize('testSetupResultsHeader')
          .replace('runId', testRowArray[0].runId)
      );
    }
    return testResultTable;
  }

  @elapsedTime()
  private formatDetailedCov(testResult: TestResult, concise: boolean): string {
    const tb = new Table();
    const testRowArray: Row[] = [];
    testResult.tests.forEach((elem: ApexTestResultData) => {
      if (
        !concise ||
        elem.outcome === ApexTestResultOutcome.Fail ||
        elem.outcome === ApexTestResultOutcome.CompileFail
      ) {
        const msg = elem.stackTrace
          ? `${elem.message}\n${elem.stackTrace}`
          : elem.message;

        if (elem.perClassCoverage) {
          elem.perClassCoverage.forEach((perClassCov) => {
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
      }
    });

    let detailedCovTable: string = '';
    if (testRowArray.length > 0) {
      detailedCovTable = os.EOL.repeat(2);
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
    }
    return detailedCovTable;
  }

  @elapsedTime()
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

    let codeCovTable = os.EOL.repeat(2);
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

  @elapsedTime('elapsedTime', LoggerLevel.TRACE)
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
