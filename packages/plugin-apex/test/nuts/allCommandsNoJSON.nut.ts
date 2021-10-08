/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { Connection, AuthInfo } from '@salesforce/core';
import { getString } from '@salesforce/ts-types';
import { expect } from 'chai';

let session: TestSession;
let conn: Connection;

describe('verifies all commands run successfully', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'apexNut',
        sourceDir: path.join('test', 'nuts', 'apexTestApp', 'TestApp')
      },
      setupCommands: [
        'sfdx config:set restDeploy=false',
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
        'sfdx force:source:push'
      ]
    });
    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: getString(session.setup[1], 'result.username')
      })
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  // it('executes apex', () => {
  //   execCmd('force:apex:execute -f ~/TestApp/test.apex', { ensureExitCode: 0 });
  // });
  /*it('runs tests', () => {
    execCmd('force:apex:test:run', { ensureExitCode: 0 });
  });
  it('reports tests', async () => {
    const testRunQueryResult = await conn.tooling.query<{ Id: string }>(
      'SELECT Id from AsyncApexJob Order By CreatedDate DESC LIMIT 1'
    );
    expect(testRunQueryResult.totalSize).to.equal(1);
    const testRunId = testRunQueryResult.records[0].Id;
    execCmd(`force:apex:test:report -i ${testRunId}`, { ensureExitCode: 0 });
  });*/
  // it('gets logs', () => {
  //   execCmd('force:apex:log:get -n 1', { ensureExitCode: 0 });
  // });
  // it('lists logs', () => {
  //   execCmd('force:apex:log:list', { ensureExitCode: 0 });
  // });
  //tail - add command
  /*it('tails logs', () => {
    execCmd('force:apex:log:tail', { ensureExitCode: 0 });
  });*/
});
