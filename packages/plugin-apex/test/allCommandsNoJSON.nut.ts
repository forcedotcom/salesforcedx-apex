/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

let session: TestSession;

describe('verifies all commands run successfully', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join('test', 'apexLibraryTests')
      },
      setupCommands: [
        `sfdx force:org:create -d 1 -s -f ${path.join(
          'config',
          'project-scratch-def.json'
        )}`,
        'sfdx force:source:push'
      ]
    });
  });

  //tail
  it('tails logs', () => {
    execCmd('force:apex:log:tail', { ensureExitCode: 0 });
  });
  /*it('executes apex', () => {
    execCmd('force:apex:execute', { ensureExitCode: 0 });
  });
  it('gets logs', () => {
    execCmd('force:apex:log:get -n 1', { ensureExitCode: 0 });
  });
  it('lists logs', () => {
    execCmd('force:apex:log:list', { ensureExitCode: 0 });
  });
  it('reports tests', () => {
    execCmd('force:apex:test:report', { ensureExitCode: 0 });
  });
  it('runs tests', () => {
    execCmd('force:apex:test:run', { ensureExitCode: 0 });
  });*/

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
