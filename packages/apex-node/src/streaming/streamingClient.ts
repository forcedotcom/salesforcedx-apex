/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Client as FayeClient } from 'faye';
import { Connection, Org } from '@salesforce/core';
import { ApexTestQueueItem, ApexTestQueueItemStatus } from '../tests/types';
import { StreamMessage, TestResultMessage } from './types';

const TEST_RESULT_CHANNEL = '/systemTopic/TestResult';
const DEFAULT_STREAMING_TIMEOUT_MS = 14400;

export class StreamingClient {
  private client: FayeClient;
  private conn: Connection;
  private successfulHandshake = false;
  private apiVersion = '36.0';

  private removeTrailingSlashURL(instanceUrl?: string): string {
    return instanceUrl ? instanceUrl.replace(/\/+$/, '') : '';
  }

  public getStreamURL(instanceUrl: string): string {
    const urlElements = [
      this.removeTrailingSlashURL(instanceUrl),
      'cometd',
      this.apiVersion
    ];
    return urlElements.join('/');
  }

  public constructor(connection: Connection) {
    this.conn = connection;
    const streamUrl = this.getStreamURL(this.conn.instanceUrl);
    this.client = new FayeClient(streamUrl, {
      timeout: DEFAULT_STREAMING_TIMEOUT_MS
    });

    this.client.on('transport:up', () => {
      console.log('Listening for streaming state changes....');
    });

    this.client.on('transport:down', () => {
      console.log(
        'Faye generated a transport:down event. Faye will try and recover.'
      );
    });

    this.client.addExtension({
      incoming: (
        message: StreamMessage,
        callback: (message: StreamMessage) => void
      ) => {
        if (message && message.channel === '/meta/handshake') {
          if (message.successful === true) {
            this.successfulHandshake = true;
          } else if (message.error) {
            this.successfulHandshake = false;
            throw new Error(`Test run handshake failed: ${message.error}`);
          }
        }
        callback(message);
      }
    });
  }

  public async init(): Promise<void> {
    const username = this.conn.getUsername();
    const org = await Org.create({ aliasOrUsername: username });
    await org.refreshAuth();

    const accessToken = this.conn.getConnectionOptions().accessToken;
    if (accessToken) {
      this.client.setHeader('Authorization', `OAuth ${accessToken}`);
    } else {
      throw new Error('No access token');
    }
  }

  public async subscribe(): Promise<ApexTestQueueItem> {
    return new Promise((subscriptionResolve, subscriptionReject) => {
      try {
        this.client.subscribe(
          TEST_RESULT_CHANNEL,
          async (message: TestResultMessage) => {
            const result = await this.handler(message);

            if (result) {
              this.client.disconnect();
              subscriptionResolve(result);
            }
          }
        );
      } catch (e) {
        this.client.disconnect();
        subscriptionReject(e);
      }
    });
  }

  // TODO: should make sure to filter out the test runs from other sources
  public async handler(message: TestResultMessage): Promise<ApexTestQueueItem> {
    const testRunId = message.sobject.Id;
    const queryApexTestQueueItem = `SELECT Id, Status, ApexClassId, TestRunResultId FROM ApexTestQueueItem WHERE ParentJobId = '${testRunId}'`;
    let result;
    let completedRecordProcess = true;
    try {
      result = (await this.conn.tooling.query(
        queryApexTestQueueItem
      )) as ApexTestQueueItem;

      if (result.records === undefined) {
        throw new Error('can not find any records');
      }

      for (let i = 0; i < result.records.length; i++) {
        const item = result.records[i];
        if (
          item.Status === ApexTestQueueItemStatus.Queued ||
          item.Status === ApexTestQueueItemStatus.Holding ||
          item.Status === ApexTestQueueItemStatus.Preparing ||
          item.Status === ApexTestQueueItemStatus.Processing
        ) {
          completedRecordProcess = false;
          break;
        }
      }
    } catch (e) {
      throw new Error(e.message);
    }

    if (completedRecordProcess) {
      return result;
    } else {
      console.log(`Processing test run ${testRunId}`);
    }
    return null;
  }
}
