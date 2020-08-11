/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { colorLogs } from '../src/utils';
import { expect } from 'chai';
import * as chalk from 'chalk';

describe('Colorize Tests', async () => {
  it('should color time/date format correctly', async () => {
    const testData = '12:47:29.584';
    let expectedData = testData.replace(
      new RegExp(/\b([\w]+\.)+(\w)+\b/g),
      `${chalk.blueBright('$&')}`
    );
    expectedData = expectedData.replace(
      new RegExp(/\b([0-9]+|true|false|null)\b/g),
      `${chalk.blueBright('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });

  it('should color exception message correctly', async () => {
    const testData =
      '$CalloutInTestmethodException: Methods defined as TestMethod do not support Web service callouts"';
    const expectedData = testData.replace(
      new RegExp(/\b([a-zA-Z.]*Exception)\b/g),
      `${chalk.bold.red('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });

  it('should color debug message correctly', async () => {
    const testData = 'SYSTEM,DEBUG;VALIDATION';
    const expectedData = testData.replace(
      new RegExp(/\b(DEBUG)\b/g),
      `${chalk.bold.cyan('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });

  it('should color basic strings correctly', async () => {
    const testData = 'testdevhub@ria.com';
    const expectedData = testData.replace(
      new RegExp(/\b([\w]+\.)+(\w)+\b/g),
      `${chalk.blueBright('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });

  it('should color info text correctly', async () => {
    const testData = 'APEX_PROFILING,INFO;';
    const expectedData = testData.replace(
      new RegExp(/\b(HINT|INFO|INFORMATION)\b/g),
      `${chalk.bold.green('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });

  it('should color warn text correctly', async () => {
    const testData = 'APEX_PROFILING,WARN;';
    const expectedData = testData.replace(
      new RegExp(/\b(WARNING|WARN)\b/g),
      `${chalk.bold.yellow('$&')}`
    );
    const coloredData = colorLogs(testData);
    expect(coloredData).to.eql(expectedData);
  });
});
