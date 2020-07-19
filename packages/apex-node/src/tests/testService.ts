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
  AsyncTestArrayConfiguration,
  ApexTestRunResult,
  ApexTestResult,
  ApexTestQueueItem,
  ApexTestQueueItemStatus,
  AsyncTestResult
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
  ): Promise<AsyncTestResult> {
    const url = `${this.connection.tooling._baseUrl()}/runTestsAsynchronous`;
    const request = {
      method: 'POST',
      url,
      body: JSON.stringify(options),
      headers: { 'content-type': 'application/json' }
    };

    const testRunId = await this.connection.tooling.request(request) as string;
    const testQueueResult = await this.testRunQueueStatusPoll(testRunId);

    return this.getTestResultData(testQueueResult, testRunId, false);
  }

  public async getTestResultData(testQueueResult: ApexTestQueueItem, testRunId: string, codeCoverage: boolean): Promise<AsyncTestResult> {
    let testRunSummaryQuery = 'SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, ';
    testRunSummaryQuery += 'MethodsEnqueued, StartTime, EndTime, TestTime, UserId ';
    testRunSummaryQuery += `FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
    const testRunSummaryResults = await this.connection.tooling.query(testRunSummaryQuery) as ApexTestRunResult;

    let apexTestResultQuery = 'SELECT Id, QueueItemId, StackTrace, Message, ';
    apexTestResultQuery += 'RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, ';
    apexTestResultQuery += 'ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix, ApexClass.FullName ';
    apexTestResultQuery += 'FROM ApexTestResult WHERE QueueItemId IN (%s)';

    // TODO: this needs to iterate and create a comma separated string of ids
    // and check for query length
    const apexResultId = testQueueResult.records[0].Id;
    const apexTestResults = await this.connection.tooling.query(
      util.format(apexTestResultQuery, `'${apexResultId}'`)
    ) as ApexTestResult;

    // Iterate over test results, format and add them as results.tests
    const testResults = apexTestResults.records.map(item => {
      return {
        Id: item.Id,
        QueueItemId: item.QueueItemId,
        StackTrace: item.StackTrace,
        Message: item.Message,
        AsyncApexJobId: item.AsyncApexJobId,
        MethodName: item.MethodName,
        Outcome: item.Outcome,
        ApexLogId: item.ApexLogId,
        ApexClass: {
          Id: item.ApexClass.Id,
          Name: item.ApexClass.Name,
          NamespacePrefix: item.ApexClass.NamespacePrefix,
          FullName: item.ApexClass.FullName
        },
        Runtime: item.Runtime,
        TestTimestamp: item.TestTimestamp, // TODO: convert timestamp
        FullName: `${item.ApexClass.FullName}.${item.MethodName}`
      }
    });

    const summaryRecord = testRunSummaryResults.records[0];
    
    // TODO: add code coverage
    const result: AsyncTestResult = {
      summary: {
        outcome: summaryRecord.Status,
        testStartTime: summaryRecord.StartTime,
        testExecutionTime: summaryRecord.TestTime,
        testRunId,
        userId: summaryRecord.UserId
      },
      tests: testResults
    }
    return result;
  }

  public async testRunQueueStatusPoll(
    testRunId: string,
    timeout = 10000,
    interval = 100
  ): Promise<ApexTestQueueItem> {
    const endTime = Date.now() + timeout;
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultID FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    //@ts-ignore
    const checkTestRun = async (resolve, reject): Promise<any> => {
      const result = await this.connection.tooling.query(
        queryApexTestQueueItem
      ) as ApexTestQueueItem;

      if (result.records.length === 0) {
        throw new Error('No test run results');
      }

      switch (result.records[0].Status) {
        case ApexTestQueueItemStatus.Completed:
          resolve(result);
          break;
        case ApexTestQueueItemStatus.Failed:
          const testRunError = new Error('Test run failed');
          reject(testRunError);
          break;
        case ApexTestQueueItemStatus.Aborted:
          const testRunCancelledError = new Error('Test run was cancelled');
          reject(testRunCancelledError);
          break;
        case ApexTestQueueItemStatus.Holding:
        case ApexTestQueueItemStatus.Preparing:
        case ApexTestQueueItemStatus.Processing:
        case ApexTestQueueItemStatus.Queued:
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
