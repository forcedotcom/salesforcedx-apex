/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { SyncTestConfiguration, TestItem } from './types';

export class TestService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async runTestSynchronous(options: SyncTestConfiguration) {
    const url = `${this.connection.tooling._baseUrl()}/runTestsSynchronous`;

    const testData: SyncTestConfiguration = {
      tests: [{ className: 'waaa' }, { className: 'two' }]
    };

    const request = {
      method: 'POST',
      url,
      body: JSON.stringify(options),
      headers: { 'content-type': 'application/json' }
    };

    const testRun = await this.connection.tooling.request(request);
    return testRun;
  }
}
