/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  TestResult,
  ApexTestResultData,
  CodeCoverageResult,
  PerClassCoverage,
  ApexTestResultOutcome
} from './tests/types';

function getRandomString(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePerClassCoverage(): PerClassCoverage {
  const coveredLines = Array.from({ length: getRandomNumber(1, 10) }, () =>
    getRandomNumber(1, 100)
  );
  return {
    apexClassOrTriggerName: getRandomString(),
    apexClassOrTriggerId: getRandomString(),
    apexTestClassId: getRandomString(),
    apexTestMethodName: getRandomString(),
    numLinesCovered: coveredLines.length,
    numLinesUncovered: 0,
    percentage: '100%',
    coverage: {
      coveredLines,
      uncoveredLines: []
    }
  };
}

function generateApexTestResultData(): ApexTestResultData {
  return {
    id: getRandomString(),
    queueItemId: getRandomString(),
    stackTrace: null,
    message: null,
    asyncApexJobId: getRandomString(),
    methodName: getRandomString(),
    outcome: ApexTestResultOutcome.Pass,
    apexLogId: null,
    apexClass: {
      id: getRandomString(),
      name: getRandomString(),
      namespacePrefix: null,
      fullName: getRandomString()
    },
    runTime: getRandomNumber(1, 100),
    testTimestamp: new Date().toISOString(),
    fullName: getRandomString(),
    perClassCoverage: Array.from(
      { length: getRandomNumber(1, 10) },
      generatePerClassCoverage
    )
  };
}

function generateCodeCoverageResult(): CodeCoverageResult {
  const coveredLines = Array.from({ length: getRandomNumber(1, 10) }, () =>
    getRandomNumber(1, 100)
  );
  return {
    apexId: getRandomString(),
    name: getRandomString(),
    type: 'ApexClass',
    numLinesCovered: coveredLines.length,
    numLinesUncovered: 0,
    percentage: '100%',
    coveredLines,
    uncoveredLines: []
  };
}

export function generateTestResult(
  numTests: number,
  numCodeCoverageResults: number
): TestResult {
  return {
    summary: {
      outcome: 'Failed',
      testsRan: numTests,
      passing: numTests,
      failing: 0,
      skipped: 0,
      passRate: '100%',
      failRate: '0%',
      skipRate: '0%',
      testStartTime: new Date().toISOString(),
      testExecutionTimeInMs: getRandomNumber(1, 100),
      testTotalTimeInMs: getRandomNumber(1, 100),
      commandTimeInMs: getRandomNumber(1, 100),
      hostname:
        'https://efficiency-power-3791-dev-ed.scratch.my.salesforce.com',
      orgId: getRandomString(),
      username: getRandomString(),
      testRunId: getRandomString(),
      userId: getRandomString(),
      totalLines: numCodeCoverageResults,
      coveredLines: numCodeCoverageResults,
      testRunCoverage: '100%',
      orgWideCoverage: '100%'
    },
    tests: Array.from({ length: numTests }, generateApexTestResultData),
    codecoverage: Array.from(
      { length: numCodeCoverageResults },
      generateCodeCoverageResult
    )
  };
}
