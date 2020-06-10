/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { ApexExecute } from './commands';
import { ExecuteAnonymousResponse } from './types';
import { nls } from './i18n';

export class ApexService {
  public readonly connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async apexExecute(
    filepath: string
  ): Promise<ExecuteAnonymousResponse> {
    try {
      const apexExecute = new ApexExecute(this.connection);
      const result = await apexExecute.execute(filepath);
      return result;
    } catch (e) {
      throw new Error(
        nls.localize('unexpected_command_error', 'force:apex:execute. ') +
          e.message
      );
    }
  }
}
