/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection } from '@salesforce/core';
import { MockTestOrgData, testSetup } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import { TestService } from '../../src/tests';
import { ApexOrgWideCoverage } from '../../src/tests/types';

const $$ = testSetup();
let mockConnection: Connection;
let sandboxStub: SinonSandbox;
let toolingQueryStub: SinonStub;
const testData = new MockTestOrgData();

describe('Run Apex tests code coverage', () => {
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
    toolingQueryStub = sandboxStub.stub(mockConnection.tooling, 'query');
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should return org wide coverage result', async () => {
    toolingQueryStub.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          PercentCovered: '33'
        }
      ]
    } as ApexOrgWideCoverage);
    const testSrv = new TestService(mockConnection);

    const orgWideCoverageResult = await testSrv.getOrgWideCoverage();
    expect(orgWideCoverageResult).to.equal('33%');
  });

  it('should return 0% org wide coverage when no records are available', async () => {
    toolingQueryStub.onFirstCall().resolves({
      done: true,
      totalSize: 0,
      records: []
    } as ApexOrgWideCoverage);
    const testSrv = new TestService(mockConnection);

    const orgWideCoverageResult = await testSrv.getOrgWideCoverage();
    expect(orgWideCoverageResult).to.equal('0%');
  });
});
