/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { StreamingClient } from './streamingClient';

export class StreamingService {
  public static TEST_RESULT_CHANNEL = '/systemTopic/TestResult'; // '/topic/AllAccounts'; // '/systemTopic/ApexDebuggerEvent';
  public static DEFAULT_TIMEOUT = 14400;
  private static instance: StreamingService;
  private readonly apiVersion = '36.0';
  private testRunEventClient!: StreamingClient;

  public static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService();
    }
    return StreamingService.instance;
  }
  /*
  public getClient(): StreamingClient | undefined {
    console.log('streamingService.getClient');
    return this.testRunEventClient;
  }

  public hasProcessedEvent(replayId: number): boolean {
    console.log('streamingService.hasProcessedEvent replayId ===> ', replayId);
    const client = this.getClient();
    if (client && replayId > client.getReplayId()) {
      return false;
    }
    return true;
  }

  public markEventProcessed(replayId: number): void {
    console.log('streamingService.markEventProcessed replayId ===> ', replayId);
    const client = this.getClient();
    if (client) {
      client.setReplayId(replayId);
    }
  }

  public async handshake(): Promise<boolean> {
    return await this.testRunEventClient.handshake();
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
    console.log(`subscribe url ===> ${streamUrl}`);
    this.testRunEventClient = new StreamingClient(
      streamUrl,
      requestService,
      testRunEventClientInfo
    );

    await this.testRunEventClient.subscribe();
    console.log('after testRunEventClient.subscribe()');
    const status = await this.testRunEventClient.handshake();
    return Promise.resolve(status);
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
    console.log('isReady ===>', this.testRunEventClient.isConnected());
    if (this.testRunEventClient && this.testRunEventClient.isConnected()) {
      return true;
    }
    return false;
  } */
}
