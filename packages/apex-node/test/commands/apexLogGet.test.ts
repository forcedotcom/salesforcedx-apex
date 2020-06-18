/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection } from '@salesforce/core';
import { MockTestOrgData, testSetup } from '@salesforce/core/lib/testSetup';
import { expect, assert } from 'chai';
import * as fs from 'fs';
import { createSandbox, SinonSandbox } from 'sinon';
import { ApexLogGet } from '../../src/commands/apexLogGet';

const $$ = testSetup();

describe('apexLogGet tests', () => {
  const testData = new MockTestOrgData();
  let mockConnection: Connection;
  let sandboxStub: SinonSandbox;

  beforeEach(async () => {
    sandboxStub = createSandbox();
    $$.setConfigStubContents('AuthInfoConfig', {
      contents: await testData.getConfig()
    });
    mockConnection = await Connection.create({
      authInfo: await AuthInfo.create({
        username: testData.username
      })
    });
    sandboxStub.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should check the number of logs', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const logIds = ['07WgsWfsFF', 'FTWrd5lfg'];
    const logs = ['48jnskd', '67knmdfklDF'];
    sandboxStub.stub(ApexLogGet.prototype, 'getLogIds').resolves(logIds);
    sandboxStub.stub(ApexLogGet.prototype, 'connectionRequest').resolves(logs);
    const response = await apexLogGet.getLogs(2);
    expect(response.length).to.eql(2);
  });

  it('should check for log id', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const logs = ['48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT..'];
    sandboxStub.stub(ApexLogGet.prototype, 'getLogs').resolves(logs);
    const response = await apexLogGet.getLogs(0, '07L5w00005PGdTnEAL');
    expect(response.length).to.eql(1);
  });

  it('should check the number of log limit', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const logs = [
      '47.0',
      '48.0',
      'ASDG',
      'APEX',
      'CODE',
      'FINEST',
      'PROFILING',
      'INFO',
      'CALLOUT',
      'ASDA',
      'ADAD',
      'Ajkl',
      'SADkl',
      'FSDFS',
      'DASD',
      'ASD',
      'NKJN',
      'ADA',
      'GGS',
      'ADASD',
      'SDA',
      'ADA',
      'JKH',
      'DH',
      'FGFD'
    ];
    sandboxStub.stub(ApexLogGet.prototype, 'getLogs').resolves(logs);
    const response = await apexLogGet.getLogs(27);
    expect(response.length).to.eql(25);
  });

  it('should check for invalid id', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const logs = ['48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT..'];
    sandboxStub
      .stub(ApexLogGet.prototype, 'connectionRequest')
      .throws(new Error('invalid id'));
    try {
      const response = await apexLogGet.getLogs(
        undefined,
        '07L5tgg0005PGdTnEAL'
      );
    } catch (e) {
      expect(e.message).to.equal('invalid id');
    }
  });
});
