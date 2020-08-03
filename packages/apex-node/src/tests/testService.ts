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
import { StreamingService, RequestService } from '../streaming';
import { StreamingClient } from '../streaming/streamingClient';

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
  ): Promise<AsyncTestResult> {
    const sClient = new StreamingClient(this.connection);
    await sClient.init();
    const handShakeStatus = await sClient.handshake();
    console.log(`handShakeStatus ===> ${handShakeStatus}`);
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

    const testQueueResult = await sClient.subscribe();
    return await this.getTestResultData(testQueueResult, testRunId);
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

  /*
  public async coreStreaming(conn: Connection): Promise<any> {
    function streamProcessor(message: any): StatusResult {
      console.log('streamProcessor ====>', message);
      const testRunId = message.sobject.Id;
      const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultId FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
      let result;
      let recStatusCompleted = true;
      try {
        result = (conn.tooling.query(
          queryApexTestQueueItem
        ) as unknown) as ApexTestQueueItem;

        result.records.forEach(item => {
          if (item.Status === 'Queued' || item.Status === 'Processing') {
            recStatusCompleted = false;
          }
        });
      } catch (e) {
        throw new Error(e.message);
      }
      console.log(`result =====> `, result);

      return { completed: recStatusCompleted };
    }

    async function startStream(username: string): Promise<void> {
      const org = await Org.create({ aliasOrUsername: username });
      const options: StreamingClient.Options = new StreamingClient.DefaultOptions(
        org,
        '/systemTopic/TestResult',
        streamProcessor
      );

      const asyncStatusClient = await StreamingClient.create(options);

      const handshake = await asyncStatusClient.handshake();
      console.log('Handshaked!', handshake);
      const subscription = await asyncStatusClient.subscribe(async () => {
        console.log('Subscribed!');
      });

      console.log('subscription status ===>', subscription);
    }
    const username = this.connection.getUsername();
    await startStream(username);
  }
  */
  /*
  public async connectStreaming(startTime: [number, number]): Promise<boolean> {
    const channel = StreamingService.TEST_RESULT_CHANNEL;
    const clientInfo = new StreamingClientInfoBuilder()
      .forChannel(channel)
      .withConnectedHandler(() => {
        console.log(`connection handler ===> ${channel}`);
        const hrend = process.hrtime(startTime);
        const timestamp = Number(
          util.format('%d%d', hrend[0], hrend[1] / 1000000)
        );
        console.log(`connection handler timestamp => ${timestamp}`);
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

    this.myRequestService.instanceUrl = this.connection.instanceUrl;
    this.myRequestService.accessToken = this.connection.accessToken;
    console.log('myRequestService ==> ', this.myRequestService);
    this.myStreamingService.handshake();
    return await this.myStreamingService.subscribe(
      this.myRequestService,
      clientInfo
    );
  }
*/
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async handleEvent(data: any): Promise<void> {
    console.log(`handleEvent ====> ${data}`, data);
    /*
     {
        event: { 
          type: 'updated',
          createdDate: '2020-07-30T03:50:08.000+0000' 
        },
        sobject: { Id: '7072M0000AM9jRTQQZ' }
      }
     */
    // every event will return a test run id, we need to query for it's status and decide if we need to keep waiting
    // or we can continue to get the test run results
    const testRunId = data.sobject.Id;
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultId FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    let result;
    let recStatusCompleted = true;
    try {
      result = (await this.connection.tooling.query(
        queryApexTestQueueItem
      )) as ApexTestQueueItem;

      if (result.records === undefined) {
        throw new Error('can not find any records');
      }
      result.records.forEach(item => {
        if (item.Status === 'Queued' || item.Status === 'Processing') {
          recStatusCompleted = false;
        }
      });
    } catch (e) {
      throw new Error(e.message);
    }
    console.log(`result =====> `, result.records.length);
    console.log(`recStatusCompleted ====>`, recStatusCompleted);
    if (recStatusCompleted) {
      // this.myStreamingService.disconnect();
      await this.getTestResultData(result, testRunId);
    }
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
