/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection } from '@salesforce/core';
import { MockTestOrgData, testSetup } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import * as fs from 'fs';
import { createSandbox, SinonSandbox } from 'sinon';
import { ApexLogGet } from '../../src/commands/apexLogGet';

const $$ = testSetup();

describe('Apex Log Get Tests', () => {
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

  it('should return correct number of logs', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const logIds = ['07WgsWfsFF', 'FTWrd5lfg'];
    const logs = ['48jnskd', '67knmdfklDF'];
    const connRequestStub = sandboxStub.stub(
      ApexLogGet.prototype,
      'connectionRequest'
    );
    connRequestStub.onFirstCall().resolves(logs[0]);
    connRequestStub.onSecondCall().resolves(logs[1]);
    sandboxStub.stub(ApexLogGet.prototype, 'getLogIds').resolves(logIds);
    const response = await apexLogGet.execute({ numberOfLogs: 2 });
    expect(response.length).to.eql(2);
  });

  it('should return correct log given log id', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    const log = ['48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT..'];
    const logId = ['08YpsWfsUE'];
    const getLogIdStub = sandboxStub
      .stub(ApexLogGet.prototype, 'getLogIds')
      .resolves(logId);
    sandboxStub.stub(ApexLogGet.prototype, 'execute').resolves(log);
    const response = await apexLogGet.execute({ logId: '07L5w00005PGdTnEAL' });
    expect(response.length).to.eql(1);
    expect(getLogIdStub.callCount).to.eql(0);
  });

  it('should handle exceeding log limit', async () => {
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
    sandboxStub.stub(ApexLogGet.prototype, 'getLogIds').resolves(logs);
    const response = await apexLogGet.execute({ numberOfLogs: 27 });
    expect(response.length).to.eql(25);
  });

  it('should handle invalid id', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    sandboxStub
      .stub(ApexLogGet.prototype, 'connectionRequest')
      .throws(new Error('invalid id'));
    try {
      await apexLogGet.execute({ logId: '07L5tgg0005PGdTnEAL' });
    } catch (e) {
      expect(e.message).to.equal('invalid id');
    }
  });

  it('should throw an error if 0 logs are requested', async () => {
    const apexLogGet = new ApexLogGet(mockConnection);
    try {
      await apexLogGet.getLogIds(0);
    } catch (e) {
      expect(e.message).to.equal(
        'Expected number of logs to be greater than 0.'
      );
    }
  });
});