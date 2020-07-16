/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import {
  SyncTestConfiguration,
  SyncTestResult,
  SyncTestErrorResult,
  AsyncTestConfiguration,
  AsyncTestArrayConfiguration
} from './types';
import * as util from 'util';

export class TestService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async runTestSynchronous(
    options: SyncTestConfiguration
  ): Promise<SyncTestResult | SyncTestErrorResult[]> {
    const url = `${this.connection.tooling._baseUrl()}/runTestsSynchronous`;
    const request = {
      method: 'POST',
      url,
      body: JSON.stringify(options),
      headers: { 'content-type': 'application/json' }
    };

    const testRun = await this.connection.tooling.request(request);
    return testRun as SyncTestResult | SyncTestErrorResult[];
  }

  public async runTestAsynchronous(
    options: AsyncTestConfiguration | AsyncTestArrayConfiguration
  ): Promise<any> {
    const url = `${this.connection.tooling._baseUrl()}/runTestsAsynchronous`;
    const request = {
      method: 'POST',
      url,
      body: JSON.stringify(options),
      headers: { 'content-type': 'application/json' }
    };

    const testRunId = await this.connection.tooling.request(request);
    // write testrunid to file

    // query/poll for test run status
    //@ts-ignore
    const testQueueResult = await this.testRunQueueStatusPoll(testRunId);
    console.log(testQueueResult);
    // query for test results

    // get individual test results
    const queryApexTestResult = `SELECT Id, QueueItemId, StackTrace, Message, AsyncApexJobId, MethodName, Outcome, ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix, RunTime
        FROM ApexTestResult WHERE QueueItemId IN (%s)`;

    // @ts-ignore
    const apexResultId = testQueueResult.records[0].Id;
    const ATRResults = await this.connection.tooling.query(
      util.format(queryApexTestResult, `'${apexResultId}'`)
    );

    // TODO: retrieve summary info
    /* const query = `SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, MethodsEnqueued, StartTime, EndTime, TestTime, UserId
        FROM ApexTestRunResult
        WHERE AsyncApexJobId = '${testRunId}'`;

        */
    // query for code coverage info if needed
    // mix ATRResults with summary info and code coverage
    return ATRResults;
  }

  public async testRunQueueStatusPoll(
    testRunId: string,
    timeout = 10000,
    interval = 100
  ): Promise<any> {
    const endTime = Date.now() + timeout;
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultID FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    // @ts-ignore
    const checkTestRun = async (resolve, reject): Promise<any> => {
      const result = await this.connection.tooling.query(
        queryApexTestQueueItem
      );

      if (result.records.length === 0) {
        throw new Error('no results');
      }
      //@ts-ignore
      switch (result.records[0].Status) {
        case 'Completed':
          resolve(result);
          break;
        case 'Failed':
          const deployError = new Error('Test failure');
          reject(deployError);
          break;
        case 'Processing':
        case '':
        default:
          if (Date.now() < endTime) {
            setTimeout(checkTestRun, interval, resolve, reject);
          } else {
            reject(new Error('Timed out'));
          }
      }
    };

    return new Promise(checkTestRun);
  }
}
