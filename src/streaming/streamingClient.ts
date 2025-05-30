/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Client } from 'faye';
import { Connection, LoggerLevel } from '@salesforce/core';
import {
  RetrieveResultsInterval,
  StreamMessage,
  StreamingErrors,
  TestResultMessage
} from './types';
import { Progress } from '../common';
import { nls } from '../i18n';
import { elapsedTime, refreshAuth } from '../utils';
import {
  ApexTestProgressValue,
  ApexTestQueueItem,
  ApexTestQueueItemRecord,
  ApexTestQueueItemStatus,
  TestRunIdResult
} from '../tests/types';
import { Duration } from '@salesforce/kit';

const TEST_RESULT_CHANNEL = '/systemTopic/TestResult';
const DEFAULT_STREAMING_TIMEOUT_SEC = 14400;

export interface AsyncTestRun {
  runId: string;
  queueItem: ApexTestQueueItem;
}

export class Deferred<T> {
  public promise: Promise<T>;
  public resolve: Function;
  constructor() {
    this.promise = new Promise((resolve) => (this.resolve = resolve));
  }
}

export class StreamingClient {
  // This should be a Client from Faye, but I'm not sure how to get around the type
  // that is exported from jsforce.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private readonly conn: Connection;
  private progress?: Progress<ApexTestProgressValue>;
  public subscribedTestRunId: string;
  private subscribedTestRunIdDeferred = new Deferred<string>();
  public get subscribedTestRunIdPromise(): Promise<string> {
    return this.subscribedTestRunIdDeferred.promise;
  }

  private removeTrailingSlashURL(instanceUrl?: string): string {
    return instanceUrl ? instanceUrl.replace(/\/+$/, '') : '';
  }

  public getStreamURL(instanceUrl: string): string {
    const urlElements = [
      this.removeTrailingSlashURL(instanceUrl),
      'cometd',
      this.conn.getApiVersion()
    ];
    return urlElements.join('/');
  }

  public constructor(
    connection: Connection,
    progress?: Progress<ApexTestProgressValue>
  ) {
    this.conn = connection;
    this.progress = progress;
    const streamUrl = this.getStreamURL(this.conn.instanceUrl);
    this.client = new Client(streamUrl, {
      timeout: DEFAULT_STREAMING_TIMEOUT_SEC
    });

    this.client.on('transport:up', () => {
      this.progress?.report({
        type: 'StreamingClientProgress',
        value: 'streamingTransportUp',
        message: nls.localize('streamingTransportUp')
      });
    });

    this.client.on('transport:down', () => {
      this.progress?.report({
        type: 'StreamingClientProgress',
        value: 'streamingTransportDown',
        message: nls.localize('streamingTransportDown')
      });
    });

    this.client.addExtension({
      incoming: async (
        message: StreamMessage,
        callback: (message: StreamMessage) => void
      ) => {
        if (message?.error) {
          // throw errors on handshake errors
          if (message.channel === '/meta/handshake') {
            this.disconnect();
            throw new Error(
              nls.localize('streamingHandshakeFail', message.error)
            );
          }

          // refresh auth on 401 errors
          if (message.error === StreamingErrors.ERROR_AUTH_INVALID) {
            await this.init();
            callback(message);
            return;
          }

          // call faye callback on handshake advice
          if (message.advice && message.advice.reconnect === 'handshake') {
            callback(message);
            return;
          }

          // call faye callback on 403 unknown client errors
          if (message.error === StreamingErrors.ERROR_UNKNOWN_CLIENT_ID) {
            callback(message);
            return;
          }

          // default: disconnect and throw error
          this.disconnect();
          throw new Error(message.error);
        }
        callback(message);
      }
    });
  }

  // NOTE: There's an intermittent auth issue with Streaming API that requires the connection to be refreshed
  // The builtin org.refreshAuth() util only refreshes the connection associated with the instance of the org you provide, not all connections associated with that username's orgs
  public async init(): Promise<void> {
    await refreshAuth(this.conn);

    const accessToken = this.conn.getConnectionOptions().accessToken;
    if (accessToken) {
      this.client.setHeader('Authorization', `OAuth ${accessToken}`);
    } else {
      throw new Error(nls.localize('noAccessTokenFound'));
    }
  }

  public handshake(): Promise<void> {
    return new Promise((resolve) => {
      this.client.handshake(() => {
        resolve();
      });
    });
  }

  public disconnect(): void {
    this.client.disconnect();
    this.hasDisconnected = true;
  }

  public hasDisconnected = false;

  @elapsedTime()
  public async subscribe(
    action?: () => Promise<string>,
    testRunId?: string,
    timeout?: Duration
  ): Promise<AsyncTestRun | TestRunIdResult> {
    return new Promise((subscriptionResolve, subscriptionReject) => {
      let intervalId: NodeJS.Timeout;
      // start timeout
      const timeoutId = setTimeout(
        () => {
          this.disconnect();
          clearInterval(intervalId);
          subscriptionResolve({ testRunId });
        },
        timeout?.milliseconds ?? DEFAULT_STREAMING_TIMEOUT_SEC * 1000
      );

      try {
        this.client.subscribe(
          TEST_RESULT_CHANNEL,
          async (message: TestResultMessage) => {
            const result = await this.handler(message);

            if (result) {
              this.disconnect();
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              subscriptionResolve({
                runId: this.subscribedTestRunId,
                queueItem: result
              });
            }
          }
        );

        if (action) {
          action()
            .then((id) => {
              this.subscribedTestRunId = id;
              this.subscribedTestRunIdDeferred.resolve(id);

              if (!this.hasDisconnected) {
                intervalId = setInterval(async () => {
                  const result = await this.getCompletedTestRun(id);
                  if (result) {
                    this.disconnect();
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    subscriptionResolve({
                      runId: this.subscribedTestRunId,
                      queueItem: result
                    });
                  }
                }, RetrieveResultsInterval);
              }
            })
            .catch((e) => {
              this.disconnect();
              clearInterval(intervalId);
              clearTimeout(timeoutId);
              subscriptionReject(e);
            });
        } else {
          this.subscribedTestRunId = testRunId;
          this.subscribedTestRunIdDeferred.resolve(testRunId);

          if (!this.hasDisconnected) {
            intervalId = setInterval(async () => {
              const result = await this.getCompletedTestRun(testRunId);
              if (result) {
                this.disconnect();
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                subscriptionResolve({
                  runId: this.subscribedTestRunId,
                  queueItem: result
                });
              }
            }, RetrieveResultsInterval);
          }
        }
      } catch (e) {
        this.disconnect();
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        subscriptionReject(e);
      }
    });
  }

  private isValidTestRunID(testRunId: string, subscribedId?: string): boolean {
    if (testRunId.length !== 15 && testRunId.length !== 18) {
      return false;
    }

    const testRunId15char = testRunId.substring(0, 14);
    if (subscribedId) {
      const subscribedTestRunId15char = subscribedId.substring(0, 14);
      return subscribedTestRunId15char === testRunId15char;
    }
    return true;
  }

  @elapsedTime()
  public async handler(
    message?: TestResultMessage,
    runId?: string
  ): Promise<ApexTestQueueItem> {
    const testRunId = runId || message.sobject.Id;
    if (!this.isValidTestRunID(testRunId, this.subscribedTestRunId)) {
      return null;
    }

    const result = await this.getCompletedTestRun(testRunId);
    if (result) {
      return result;
    }

    this.progress?.report({
      type: 'StreamingClientProgress',
      value: 'streamingProcessingTestRun',
      message: nls.localize('streamingProcessingTestRun', testRunId),
      testRunId
    });
    return null;
  }

  @elapsedTime('elapsedTime', LoggerLevel.TRACE)
  private async getCompletedTestRun(
    testRunId: string
  ): Promise<ApexTestQueueItem> {
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultId FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    const result = await this.conn.tooling.query<ApexTestQueueItemRecord>(
      queryApexTestQueueItem,
      {
        autoFetch: true
      }
    );

    if (result.records.length === 0) {
      throw new Error(nls.localize('noTestQueueResults', testRunId));
    }

    this.progress?.report({
      type: 'TestQueueProgress',
      value: result
    });

    if (
      result.records.some(
        (item) =>
          item.Status === ApexTestQueueItemStatus.Queued ||
          item.Status === ApexTestQueueItemStatus.Holding ||
          item.Status === ApexTestQueueItemStatus.Preparing ||
          item.Status === ApexTestQueueItemStatus.Processing
      )
    ) {
      return null;
    }
    return result;
  }
}
