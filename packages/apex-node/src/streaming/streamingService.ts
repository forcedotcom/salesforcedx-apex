/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RequestService } from './requestService';
import { StreamingClient, StreamingClientInfo } from './streamingClient';

export class StreamingService {
  public static TEST_RESULT_CHANNEL = '/systemTopic/ApexDebuggerEvent'; // '/systemTopic/TestResult';
  public static DEFAULT_TIMEOUT = 14400;
  private static instance: StreamingService;
  private readonly apiVersion = '41.0';
  private testRunEventClient!: StreamingClient;

  public static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService();
    }
    return StreamingService.instance;
  }

  public getClient(): StreamingClient | undefined {
    return this.testRunEventClient;
  }

  public hasProcessedEvent(replayId: number): boolean {
    const client = this.getClient();
    if (client && replayId > client.getReplayId()) {
      return false;
    }
    return true;
  }

  public markEventProcessed(replayId: number): void {
    const client = this.getClient();
    if (client) {
      client.setReplayId(replayId);
    }
  }

  public async subscribe(
    requestService: RequestService,
    testRunEventClientInfo: StreamingClientInfo
  ): Promise<boolean> {
    const urlElements = [
      this.removeTrailingSlashURL(requestService.instanceUrl),
      'cometd',
      this.apiVersion
    ];
    const streamUrl = urlElements.join('/');

    this.testRunEventClient = new StreamingClient(
      streamUrl,
      requestService,
      testRunEventClientInfo
    );
    await this.testRunEventClient.subscribe();
    return Promise.resolve(this.isReady());
  }

  private removeTrailingSlashURL(instanceUrl?: string): string {
    return instanceUrl ? instanceUrl.replace(/\/+$/, '') : '';
  }

  public disconnect(): void {
    if (this.testRunEventClient) {
      this.testRunEventClient.disconnect();
    }
  }

  public isReady(): boolean {
    if (this.testRunEventClient && this.testRunEventClient.isConnected()) {
      return true;
    }
    return false;
  }
}
