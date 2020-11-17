/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { JUnitReporter } from '../../src';
import {
  testResults,
  junitResult,
  junitSuccess,
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
});
