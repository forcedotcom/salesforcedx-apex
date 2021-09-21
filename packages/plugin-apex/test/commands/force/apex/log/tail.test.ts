/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@salesforce/command/lib/test';
import { LogService } from '@salesforce/apex-node';
import { StreamingClient } from '@salesforce/core';

const logString =
  '52.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG';

describe('force:apex:log:tail', () => {
  test
    .withOrg({ username: 'test@username.com' }, true)
    .stub(StreamingClient.prototype, 'handshake', async () => '')
    .stub(StreamingClient.prototype, 'subscribe', async () => '')
    .stub(LogService.prototype, 'prepareTraceFlag', () => undefined)
    .stub(LogService.prototype, 'getLogById', async () => logString)
    .stub(LogService.prototype, 'createStreamingClient', async () => {
      await LogService.prototype.logCallback({ sobject: { Id: 'xxxxxx' } });
    })
    .stdout()
    .command(['force:apex:log:tail'])
    .it('runs default command with default output', ctx => {
      expect(ctx.stdout).to.contain(
        '52.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG'
      );
    });
});
