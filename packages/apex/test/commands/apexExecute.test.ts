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
import { ApexService, ExecuteAnonymousResponse } from '../../src';
import { SoapResponse } from '../../src/commands/utils';
import { ApexExecute } from '../../src/commands/apexExecute';

const $$ = testSetup();

describe('apexExecute tests', () => {
  const testData = new MockTestOrgData();
  let mockConnection: Connection;
  let sandboxStub: SinonSandbox;
  const data = 'System.assert(true);';

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
    const mockFS = sandboxStub.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should execute and display successful result in correct format', async () => {
    const apexService = new ApexService(mockConnection);
    const execAnonResponse: ExecuteAnonymousResponse = {
      result: {
        column: -1,
        line: -1,
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: true,
        logs: 'logs for successful run'
      }
    };
    sandboxStub
      .stub(ApexService.prototype, 'apexExecute')
      .resolves(execAnonResponse);
    const response = await apexService.apexExecute('filepath/to/anonApex/file');
    expect(response).to.eql(execAnonResponse);
  });

  it('should execute and display runtime issue in correct format', async () => {
    const apexService = new ApexService(mockConnection);
    const log =
      '47.0 APEX_CODE,DEBUG;APEX_PROFILING,INFO\nExecute Anonymous: System.assert(false);|EXECUTION_FINISHED\n';
    const execAnonResponse: ExecuteAnonymousResponse = {
      result: {
        column: 1,
        line: 6,
        compiled: true,
        compileProblem: '',
        exceptionMessage: 'System.AssertException: Assertion Failed',
        exceptionStackTrace: 'AnonymousBlock: line 1, column 1',
        success: false
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: log } },
        'soapenv:Body': { executeAnonymousResponse: execAnonResponse }
      }
    };
    sandboxStub
      .stub(ApexExecute.prototype, 'connectionRequest')
      .resolves(soapResponse);

    const response = await apexService.apexExecute('filepath/to/anonApex/file');
    execAnonResponse.result.logs = log;
    expect(response).to.eql(execAnonResponse);
  });

  it('should execute and display compile issue in correct format', async () => {
    const apexService = new ApexService(mockConnection);
    const execAnonResponse: ExecuteAnonymousResponse = {
      result: {
        column: 1,
        line: 6,
        compiled: false,
        compileProblem: `Unexpected token '('.`,
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: false
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: '' } },
        'soapenv:Body': { executeAnonymousResponse: execAnonResponse }
      }
    };
    sandboxStub
      .stub(ApexExecute.prototype, 'connectionRequest')
      .resolves(soapResponse);

    const response = await apexService.apexExecute('filepath/to/anonApex/file');
    execAnonResponse.result.logs = '';
    expect(response).to.eql(execAnonResponse);
  });
});
