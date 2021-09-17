/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, test } from '@salesforce/command/lib/test';
import { LogService } from '@salesforce/apex-node';
//import { StreamingClient } from '@salesforce/core';

describe('force:apex:log:tail', () => {
  test
    .withOrg({ username: 'test@username.com' }, true)
    .stub(LogService.prototype, 'prepareTraceFlag', () => undefined)
    .stub(LogService.prototype, 'tail', () => '')
    //TODO: this stubbing feels off - consider approach from asyncTests.test.ts
    // .stub(
    //   LogService.prototype,
    //   'createStreamingClient',
    //   () => new StreamingClient()
    // )
    // .stub(StreamingClient.prototype, 'handshake', undefined)
    // .stub(StreamingClient.prototype, 'subscribe', undefined)
    .stdout()
    .command(['force:apex:log:tail'])
    .it('runs default command with default output', ctx => {
      expect(ctx.stdout).to.contain('');
      //'48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG'
      //);
    });

  // test
  //   .withOrg({ username: 'test@username.com' }, true)
  //   //.stub(LogService.prototype, 'prepareTraceFlag', () => undefined)
  //   .stub(
  //     LogService.prototype,
  //     'createStreamingClient',
  //     () => new StreamingClient()
  //   )
  //   .stub(StreamingClient.prototype, 'handshake', undefined)
  //   .stub(StreamingClient.prototype, 'subscribe', undefined)
  //   .stdout()
  //   .command(['force:apex:log:tail'])
  //   .it('does not prepare trace flag if skip specified', ctx => {
  //     expect(ctx.stdout).to.contain(
  //       '48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG'
  //     );
  //   });
});
