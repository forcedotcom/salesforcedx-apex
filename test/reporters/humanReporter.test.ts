/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { HumanReporter } from '../../src';
import {
  successResult,
  testResults,
  coverageResult,
  coverageFailResult,
  setupResult
} from './testResults';

describe('Human Reporter Tests', () => {
  const reporter = new HumanReporter();

  it('should format test results with failures', () => {
    const result = reporter.format(testResults, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain(
      'AnimalLocatorTest.testMissingAnimal                  Fail     System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:'
    );
    expect(result).to.contain(
      'Class.AnimalLocatorTest.testMissingAnimal: line 22, column 1'
    );
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
  });

  it('should format tests with 0 failures', () => {
    const result = reporter.format(successResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain(
      'AccountServiceTest.should_create_account  Pass              86 '
    );
    expect(result).to.contain(
      'AwesomeCalculatorTest.testCallout         Pass              23'
    );
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
  });

  it('should format test results with code coverage', () => {
    const result = reporter.format(coverageResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain('ApexTestClass  12.5%    9,10');
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
  });

  it('should format test results with setup methods', () => {
    const result = reporter.format(setupResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
    expect(result).to.contain(
      '=== Test Setup Time by Test Class for Run 7073t000061uwZI'
    );
    expect(result).to.contain('AccountServiceTest.setup_method  24');
    expect(result).to.contain('Test Setup Time      24 ms');
    expect(result).to.contain('Test Total Time      5487 ms');
  });

  it('should not display test setup summary if class has no setup methods', () => {
    const result = reporter.format(successResult, false);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
    expect(result).to.not.contain(
      '=== Test Setup Time by Test Class for Run 7073t000061uwZI'
    );
    expect(result).to.not.contain('AccountServiceTest.setup_method  24');
    expect(result).to.contain('Test Setup Time      0 ms');
    expect(result).to.contain('Test Total Time      5463 ms');
  });

  it('should not display test setup summary if concise is true', () => {
    const result = reporter.format(setupResult, false, true);
    expect(result).to.not.be.empty;
    expect(result).to.not.contain(
      '=== Test Setup Time by Test Class for Run 7073t000061uwZI'
    );
    expect(result).to.not.contain('AccountServiceTest.setup_method  24');
  });

  it('should format test results with detailed coverage specified', () => {
    const result = reporter.format(coverageResult, true);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain('ApexTestClass  12.5%    9,10');
    expect(result).to.not.contain('=== Test Results');
    expect(result).to.contain(
      '=== Apex Code Coverage for Test Run 7073t000061uwZI'
    );
    expect(result).to.contain(
      'AccountServiceTest.should_create_account                      Pass                       86'
    );
    expect(result).to.contain('=== Test Summary');
  });

  it('should format test results with failures with detailed coverage specified', () => {
    const result = reporter.format(coverageFailResult, true);
    expect(result).to.not.be.empty;
    expect(result).to.contain('=== Apex Code Coverage by Class');
    expect(result).to.contain('ApexTestClass  12.5%    9,10');
    expect(result).to.not.contain('=== Test Results');
    expect(result).to.contain(
      '=== Apex Code Coverage for Test Run 7073t000061uwZI'
    );
    expect(result).to.contain(
      'AccountServiceTest.should_create_account                      Pass                                                                                                                    86'
    );
    expect(result).to.contain(
      'AnimalLocatorTest.testMissingAnimal                           Fail              System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual'
    );
    expect(result).to.contain(
      'Class.AnimalLocatorTest.testMissingAnimal: line 22, column 1'
    );
    expect(result).to.contain('=== Test Summary');
  });

  it('should format test results and skip successful tests if concise is true', () => {
    const result = reporter.format(testResults, false, true);
    expect(result).to.not.be.empty;
    expect(result).to.not.contain(
      'AccountServiceTest.should_create_account             Pass                                                                                                           86'
    );
    expect(result).to.contain('AwesomeCalculatorTest.testCallout       Fail');
    expect(result).to.contain('=== Test Results');
    expect(result).to.contain('=== Test Summary');
  });

  it('should format test results and not display coverage results if concise is true', () => {
    const result = reporter.format(coverageFailResult, true, true);
    expect(result).to.not.be.empty;
    expect(result).to.not.contain('=== Apex Code Coverage by Class');
    expect(result).to.not.contain('ApexTestClass  12.5%    9,10');
    expect(result).to.contain(
      '=== Apex Code Coverage for Test Run 7073t000061uwZI'
    );
    expect(result).to.not.contain(
      'AccountServiceTest.should_create_account             Pass                                                                                                           86'
    );
    expect(result).to.contain(
      'AnimalLocatorTest.testMissingAnimal                      Fail              System.AssertException: Assertion Failed: Should not have found an animal: Expected: FooBar, Actual:'
    );
    expect(result).to.contain('=== Test Summary');
  });
});
