/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { JUnitReporter } from '../../src';
import { formatStartTime } from '../../src/utils';
import {
  testResults,
  junitResult,
  junitSuccess,
  junitCodeCov,
  junitMissingVal,
  successResult
} from './testResults';

describe('JUnit Reporter Tests', () => {
  const reporter = new JUnitReporter();

  it('should format test results with failures', () => {
    const result = reporter.format(testResults);
    expect(result).to.not.be.empty;
    expect(result).to.eql(junitResult);
    expect(result).to.contain('</failure>');
  });

  it('should format tests with 0 failures', async () => {
    const result = reporter.format(successResult);
    expect(result).to.not.be.empty;
    expect(result).to.eql(junitSuccess);
    expect(result).to.not.contain('</failure>');
  });

  it('should format test results with undefined or empty values', () => {
    successResult.summary.testRunId = '';
    successResult.summary.userId = undefined;

    const result = reporter.format(successResult);
    expect(result).to.not.be.empty;
    expect(result).to.eql(junitMissingVal);
    expect(result).to.not.contain('testRunId');
    expect(result).to.not.contain('userId');
  });

  it('should format test results with code coverage', () => {
    successResult.codecoverage = [
      {
        apexId: '001917xACG',
        name: 'ApexTestClass',
        type: 'ApexClass',
        numLinesCovered: 8,
        numLinesUncovered: 2,
        percentage: '12.5%',
        coveredLines: [1, 2, 3, 4, 5, 6, 7, 8],
        uncoveredLines: [9, 10]
      }
    ];
    successResult.summary.orgWideCoverage = '85%';
    const result = reporter.format(successResult);
    expect(result).to.not.be.empty;
    expect(result).to.eql(junitCodeCov);
    expect(result).to.contain('orgWideCoverage');
  });

  it('should format start time even when custom locale is used', () => {
    process.env.LC_ALL = 'en_CA'; // TODO: clear/restore after test
    const date = new Date();
    const testStartTime = `${date.toDateString()} ${date.toLocaleTimeString()}`;
    // TODO: add regex check for presence of a.m / pm. in testStartTime
    // expect(new RegExp(/.*[a|p]\.m\.$/g).test(testStartTime)).to.equal(true);
    const timestamp = formatStartTime(testStartTime);
    // Date value should be the same after formatting with locale
    // Ignore the loss of precision (last field of milliseconds) in formatting conversion
    expect(timestamp.split('.')[0]).to.equal(date.toISOString().split('.')[0]);
  });
});
