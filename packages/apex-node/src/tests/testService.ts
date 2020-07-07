/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SyncTestConfiguration,
  SyncTestResult,
  SyncTestErrorResult
} from './types';
import { ApiRequest } from '../types';

export class TestService extends ApiRequest {
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

    const testRun = await this.runRequest(request, true);
    return testRun as SyncTestResult | SyncTestErrorResult[];
  }
}
