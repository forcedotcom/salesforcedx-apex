/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexTestResultOutcome, TestResult } from '../tests/types';

export class JUnitReporter {
  public format(testResult: TestResult): string {
    // header
    let JUNIT_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    JUNIT_TEMPLATE += `<testsuites>\n`;
    JUNIT_TEMPLATE += `    <testsuite name="force.apex" `;
    JUNIT_TEMPLATE += `timestamp="${testResult.summary.testStartTime}" `;
    JUNIT_TEMPLATE += `hostname="${testResult.summary.hostname}" `;
    JUNIT_TEMPLATE += `tests="${testResult.summary.numTestsRan}" `;
    JUNIT_TEMPLATE += `failures="${testResult.summary.failing}"  `;
    JUNIT_TEMPLATE += `time="${this.msToSecond(
      testResult.summary.testExecutionTime
    )} s">\n`;

    // properties
    JUNIT_TEMPLATE += `        <properties>\n`;
    for (let [key, value] of Object.entries(testResult.summary)) {
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.length === 0)
      ) {
        continue;
      }
      if (key === 'testExecutionTime') {
        value = `${this.msToSecond(value as number)} s`;
      }
      if (key === 'testStartTime') {
        const date = new Date(testResult.summary.testStartTime);
        value = `${date.toDateString()} ${date.toLocaleTimeString()}`;
      }

      JUNIT_TEMPLATE += `            <property name="${key}" value="${value}"/>\n`;
    }
    JUNIT_TEMPLATE += `        </properties>\n`;

    // test cases
    for (const testCase of testResult.tests) {
      JUNIT_TEMPLATE += `        <testcase name="${
        testCase.methodName
      }" classname="${testCase.apexClass.fullName}" time="${this.msToSecond(
        testCase.runTime
      )}">\n`;

      if (
        testCase.outcome === ApexTestResultOutcome.Fail ||
        testCase.outcome === ApexTestResultOutcome.CompileFail
      ) {
        JUNIT_TEMPLATE += `            <failure message="${testCase.message}">`;
        if (testCase.stackTrace) {
          JUNIT_TEMPLATE += `<![CDATA[${testCase.stackTrace}]]>`;
        }
        JUNIT_TEMPLATE += `</failure>\n`;
      }

      JUNIT_TEMPLATE += `        </testcase>\n`;
    }

    JUNIT_TEMPLATE += `    </testsuite>\n`;
    JUNIT_TEMPLATE += `</testsuites>\n`;
    return JUNIT_TEMPLATE;
  }

  private msToSecond(timestamp: number): string {
    return (timestamp / 1000).toFixed(2);
  }
}
