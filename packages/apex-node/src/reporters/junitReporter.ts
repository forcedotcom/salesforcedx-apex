/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexTestResultData,
  ApexTestResultOutcome,
  TestResult
} from '../tests/types';

// cli currently has spaces in multiples of four for junit format
const tab = '    ';

export class JUnitReporter {
  public format(testResult: TestResult): string {
    const { summary, tests } = testResult;

    let output = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    output += `<testsuites>\n`;
    output += `${tab}<testsuite name="force.apex" `;
    output += `timestamp="${new Date(summary.testStartTime).toISOString()}" `;
    output += `hostname="${summary.hostname}" `;
    output += `tests="${summary.testsRan}" `;
    output += `failures="${summary.failing}"  `;
    output += `errors="0"  `;
    output += `time="${this.msToSecond(summary.testExecutionTime)}">\n`;

    output += this.buildProperties(testResult);
    output += this.buildTestCases(tests);

    output += `${tab}</testsuite>\n`;
    output += `</testsuites>\n`;
    return output;
  }

  private buildProperties(testResult: TestResult): string {
    let junitProperties = `${tab}${tab}<properties>\n`;

    Object.entries(testResult.summary).forEach(([key, value]) => {
      // skipRate not in cli spec
      if (this.isEmpty(value) || key === 'skipRate') {
        return;
      }
      if (['testExecutionTime', 'testTotalTime', 'commandTime'].includes(key)) {
        value = `${this.msToSecond(value)} s`;
      }

      junitProperties += `${tab}${tab}${tab}<property name="${key}" value="${value}"/>\n`;
    });

    junitProperties += `${tab}${tab}</properties>\n`;
    return junitProperties;
  }

  private buildTestCases(tests: ApexTestResultData[]): string {
    let junitTests = '';

    for (const testCase of tests) {
      junitTests += `${tab}${tab}<testcase name="${
        testCase.methodName
      }" classname="${testCase.apexClass.fullName}" time="${this.msToSecond(
        testCase.runTime
      )}">\n`;

      if (
        testCase.outcome === ApexTestResultOutcome.Fail ||
        testCase.outcome === ApexTestResultOutcome.CompileFail
      ) {
        junitTests += `${tab}${tab}${tab}<failure message="${testCase.message}">`;
        if (testCase.stackTrace) {
          junitTests += `<![CDATA[${testCase.stackTrace}]]>`;
        }
        junitTests += `</failure>\n`;
      }

      junitTests += `${tab}${tab}</testcase>\n`;
    }
    return junitTests;
  }

  private isEmpty(value: string | number): boolean {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.length === 0)
    ) {
      return true;
    }
    return false;
  }

  private msToSecond(timestamp: string | number): string {
    // remove ms suffix
    if (typeof timestamp === 'string') {
      timestamp = parseInt(timestamp.slice(0, -3));
    }
    return (timestamp / 1000).toFixed(2);
  }
}
