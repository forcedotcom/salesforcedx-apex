/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Client as FayeClient } from 'faye';
import { DEFAULT_STREAMING_TIMEOUT_MS } from './constants';
import { Connection, Org } from '@salesforce/core';
import { ApexTestQueueItem, ApexTestQueueItemStatus } from '../tests/types';

export interface StreamingEvent {
  createdDate: string;
  replayId?: number;
  type: string;
}
export interface TestResultMessage {
  event: StreamingEvent;
  sobject: {
    Id: string;
  };
}

export interface StreamMessage {
  channel: string;
  clientId: string;
  successful?: boolean;
  id?: string;
  data?: TestResultMessage;
}
const TEST_RESULT_CHANNEL = '/systemTopic/TestResult';

export class StreamingClient {
  private client: FayeClient;
  private conn: Connection;
  private successfulHandshake = false;
  public readonly DEFAULT_HANDSHAKE_TIMEOUT = 30000;
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
      console.log('transport:down  =====>');
    });

    this.client.addExtension({
      incoming: (
        message: StreamMessage,
        callback: (message: StreamMessage) => void
      ) => {
        if (
          message &&
          message.channel === '/meta/handshake' &&
          message.successful === true
        ) {
          this.successfulHandshake = true;
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

  public async handshake(): Promise<boolean> {
    let triedOnce = false;
    const endTime = Date.now() + this.DEFAULT_HANDSHAKE_TIMEOUT;
    const wait = (interval: number): Promise<void> => {
      return new Promise(resolve => {
        setTimeout(resolve, interval);
      });
    };

    do {
      if (triedOnce) {
        await wait(200);
      }

      if (this.successfulHandshake) {
        return true;
      }

      triedOnce = true;
    } while (Date.now() < endTime);

    return this.successfulHandshake;
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
    let recStatusCompleted = true;
    try {
      result = (await this.conn.tooling.query(
        queryApexTestQueueItem
      )) as ApexTestQueueItem;

      if (result.records === undefined) {
        throw new Error('can not find any records');
      }
      // change this to a for loop so we can stop iterating on the first record that's not completely processed.
      result.records.forEach(item => {
        if (
          item.Status === ApexTestQueueItemStatus.Queued ||
          item.Status === ApexTestQueueItemStatus.Holding ||
          item.Status === ApexTestQueueItemStatus.Preparing ||
          item.Status === ApexTestQueueItemStatus.Processing
        ) {
          recStatusCompleted = false;
        }
      });
    } catch (e) {
      throw new Error(e.message);
    }

    if (recStatusCompleted) {
      return result;
    } else {
      console.log(`Processing test run ${testRunId}`);
    }
    return null;
  }
}
