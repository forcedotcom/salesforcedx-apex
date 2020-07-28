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
import { nls } from '../i18n';
import {
  StreamingClientInfoBuilder,
  StreamingService,
  RequestService
} from '../streaming';

export class TestService {
  public readonly connection: Connection;
  protected myStreamingService = StreamingService.getInstance();
  protected myRequestService = new RequestService();

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
  ): Promise<void> {
    // Promise<AsyncTestResult> {
    const isStreamingConnected = await this.connectStreaming(options);
    console.log(`streaming ==> ${isStreamingConnected}`);

    // NOTE: we need to replace polling with a streaming api subscription.
    // we will poll for 10-20 seconds, if the tests are still running then we'll use
    // streaming api to get the results.
    // const testQueueResult = ''; // await this.testRunQueueStatusPoll(testRunId);
    // @ts-ignore
    // return await this.getTestResultData(testQueueResult, testRunId);
  }

  public async getTestResultData(
    testQueueResult: ApexTestQueueItem,
    testRunId: string
  ): Promise<AsyncTestResult> {
    let testRunSummaryQuery =
      'SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, ';
    testRunSummaryQuery +=
      'MethodsEnqueued, StartTime, EndTime, TestTime, UserId ';
    testRunSummaryQuery += `FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
    const testRunSummaryResults = (await this.connection.tooling.query(
      testRunSummaryQuery
    )) as ApexTestRunResult;

    let apexTestResultQuery = 'SELECT Id, QueueItemId, StackTrace, Message, ';
    apexTestResultQuery +=
      'RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, ';
    apexTestResultQuery +=
      'ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix, ApexClass.FullName ';
    apexTestResultQuery += 'FROM ApexTestResult WHERE QueueItemId IN (%s)';

    // TODO: this needs to iterate and create a comma separated string of ids
    // and check for query length
    const apexResultId = testQueueResult.records[0].Id;
    const apexTestResults = (await this.connection.tooling.query(
      util.format(apexTestResultQuery, `'${apexResultId}'`)
    )) as ApexTestResult;

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
        RunTime: item.RunTime,
        TestTimestamp: item.TestTimestamp, // TODO: convert timestamp
        FullName: `${item.ApexClass.FullName}.${item.MethodName}`
      };
    });

    if (testRunSummaryResults.records.length === 0) {
      throw new Error(nls.localize('no_test_result_summary', testRunId));
    }

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
    };
    return result;
  }

  public async connectStreaming(
    options: AsyncTestConfiguration | AsyncTestArrayConfiguration
  ): Promise<boolean> {
    const channel = StreamingService.TEST_RESULT_CHANNEL;

    const clientInfo = new StreamingClientInfoBuilder()
      .forChannel(channel)
      .withConnectedHandler(async () => {
        console.log(`connection handler ===> ${channel}`);
        const url = `${this.connection.tooling._baseUrl()}/runTestsAsynchronous`;
        const request = {
          method: 'POST',
          url,
          body: JSON.stringify(options),
          headers: { 'content-type': 'application/json' }
        };

        const testRunId = (await this.connection.tooling.request(
          request
        )) as string;
        console.log(`testRunId ==== > ${testRunId}`);
      })
      .withDisconnectedHandler(() => {
        console.log(`${channel} disconnected`);
      })
      .withErrorHandler((reason: string) => {
        // this.errorToDebugConsole(reason);
        console.log('error handler ==> ', reason);
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withMsgHandler((message: any) => {
        // console.log('message handles ===> ', message);
        // const data = message as DebuggerMessage;
        if (message) {
          this.handleEvent(message);
        }
      })
      .build();

    this.myRequestService.instanceUrl = 'https://na96.salesforce.com';
    this.myRequestService.accessToken =
      '00D41000000FH4I!AQ8AQFkaxZONAcvIKlmmnbLZRvXZtlAaJ3PzqGhbMUyqlp2kdqegjfpt6J3SzEAMaLhS_sPhB8a5nKwfneecyvnGCkHfLld_';

    return this.myStreamingService.subscribe(this.myRequestService, clientInfo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleEvent(data: any): void {
    console.log(`handleEvent ====> ${data}`);
  }

  public async testRunQueueStatusPoll(
    testRunId: string,
    timeout = 15000,
    interval = 500
  ): Promise<ApexTestQueueItem> {
    let result: ApexTestQueueItem;
    let triedOnce = false;
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultId FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    const endTime = Date.now() + timeout;
    const wait = (interval: number): Promise<void> => {
      return new Promise(resolve => {
        setTimeout(resolve, interval);
      });
    };

    do {
      if (triedOnce) {
        await wait(interval);
      }

      try {
        result = (await this.connection.tooling.query(
          queryApexTestQueueItem
        )) as ApexTestQueueItem;
      } catch (e) {
        throw new Error(e.message);
      }

      if (result.records.length === 0) {
        throw new Error(nls.localize('no_test_queue_results', testRunId));
      }

      switch (result.records[0].Status) {
        case ApexTestQueueItemStatus.Completed:
        case ApexTestQueueItemStatus.Failed:
        case ApexTestQueueItemStatus.Aborted:
          return result;
      }

      triedOnce = true;
    } while (Date.now() < endTime);

    return result;
  }
}
