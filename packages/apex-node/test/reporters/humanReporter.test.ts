/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { HumanReporter } from '../../src';
import chalk from 'chalk';
import {
  successResult,
  testResults,
  coverageResult,
  coverageFailResult
} from './testResults';

const failedInverse = chalk.inverse.bold.red(' Failed ');
const pass = chalk.inverse.bold.green(' Pass ');
const fail = chalk.inverse.bold.red(' Fail ');
const passed = chalk.bold.green;
const failed = chalk.bold.red;
const skipped = chalk.bold.yellow;

describe('Human Reporter Tests', () => {
  const reporter = new HumanReporter();

  it('should format test results with failures', () => {
    const result = reporter.format(testResults, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain(
      `${fail}   AnimalLocatorTest.testMissingAnimal                                                                               \n` +
        '                                                                                                                           \n' +
        '         System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:              \n'
    );
    expect(result).to.contain(
      'Class.AnimalLocatorTest.testMissingAnimal: line 22, column 1'
    );
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
    expect(result).to.contain(
      '=== Test Summary\n' +
        'NAME                 VALUE             \n' +
        '───────────────────  ──────────────────\n' +
        `Outcome              ${failedInverse}          \n` +
        'Tests Ran            16                \n' +
        `Passed               ${passed('12 passed (88%)')}   \n` +
        `Failed               ${failed('4 failed (13%)')}    \n` +
        `Skipped              ${skipped('0 skipped (0%)')}    \n` +
        'Test Run Id          7073t000061uwZI   \n' +
        'Test Execution Time  5463 ms           \n' +
        'Org Id               00D3t000001vIruEAE\n' +
        'Username             tpo-3             \n'
    );
    expect(result).to.contain(
      '=== Failed Tests\n' +
        'OUTCOME  TEST NAME                                                                                             RUNTIME (MS)\n' +
        '───────  ────────────────────────────────────────────────────────────────────────────────────────────────────  ────────────\n' +
        `${fail}   AwesomeCalculatorTest.testCallout                                                                                 \n` +
        `${fail}   AnimalLocatorTest.testMissingAnimal                                                                               \n` +
        '                                                                                                                           \n' +
        '         System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:              \n'
    );
  });

  it('should format tests with 0 failures', () => {
    const result = reporter.format(successResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain(
      `${pass}   AccountServiceTest.should_create_account  86 ms       \n`
    );
    expect(result).to.contain(
      `${pass}   AwesomeCalculatorTest.testCallout         23 ms       \n`
    );
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
    expect(result).to.not.contain('=== Failed Tests');
  });

  it('should format test results with code coverage', () => {
    const result = reporter.format(coverageResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain(
      `ApexTestClass  ${chalk.bold.red(' 12.5% ')}  9,10`
    );
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
    expect(result).to.not.contain('=== Failed Tests');
  });

  it('should format test results with detailed coverage specified', () => {
    const pass = chalk.inverse.bold.green(' Pass ');
    const result = reporter.format(coverageResult, true);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain(
      `ApexTestClass  ${chalk.bold.red(' 12.5% ')}  9,10`
    );
    expect(result).to.not.contain('=== Test Results');
    expect(result).to.contain(
      '=== Apex Code Coverage for Test Run 7073t000061uwZI'
    );
    expect(result).to.contain(
      `${pass}   AccountServiceTest.should_create_account                               86 ms       \n`
    );
    expect(result).to.contain('=== Test Summary');
    expect(result).to.not.contain('=== Failed Tests');
  });

  it('should format test results with failures with detailed coverage specified', () => {
    const result = reporter.format(coverageFailResult, true);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain(
      `ApexTestClass  ${chalk.bold.red(' 12.5% ')}  9,10           \n`
    );
    expect(result).to.not.contain('=== Test Results');
    expect(result).to.contain(
      '=== Apex Code Coverage for Test Run 7073t000061uwZI'
    );
    expect(result).to.contain(
      `${pass}   AccountServiceTest.should_create_account                                                                                           86 ms       \n`
    );
    const fail = chalk.inverse.bold.red(' Fail ');
    expect(result).to.contain(
      `${fail}   AnimalLocatorTest.testMissingAnimal                                                                                                5 ms        \n` +
        '                                                                                                                                                        \n' +
        '         System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:                                           \n'
    );
    expect(result).to.contain(
      'Class.AnimalLocatorTest.testMissingAnimal: line 22, column 1'
    );
    expect(result).to.contain('=== Test Summary');
    expect(result).to.contain('=== Apex Code Coverage Failed Tests');
    expect(result).to.contain(
      '=== Apex Code Coverage Failed Tests\n' +
        'OUTCOME  TEST NAME                                                                                             CLASS BEING TESTED  PERCENT  RUNTIME (MS)\n' +
        '───────  ────────────────────────────────────────────────────────────────────────────────────────────────────  ──────────────────  ───────  ────────────\n' +
        `${fail}   AnimalLocatorTest.testMissingAnimal                                                                                                5 ms        \n` +
        '                                                                                                                                                        \n' +
        '         System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:                                           \n' +
        '         Class.AnimalLocatorTest.testMissingAnimal: line 22, column 1                                                                                   \n'
    );
  });
});
