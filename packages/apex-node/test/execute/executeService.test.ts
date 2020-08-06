/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection } from '@salesforce/core';
import { MockTestOrgData, testSetup } from '@salesforce/core/lib/testSetup';
import { assert, expect } from 'chai';
import * as fs from 'fs';
import * as readline from 'readline';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import { ExecuteService } from '../../src/execute';
import { nls } from '../../src/i18n';
import { ExecuteAnonymousResponse } from '../../src/types';
import { ExecAnonResult, SoapResponse } from '../../src/types/execute';

const $$ = testSetup();

describe('Apex Execute Tests', async () => {
  const testData = new MockTestOrgData();
  let mockConnection: Connection;
  let sandboxStub: SinonSandbox;
  let fsStub: SinonStub;

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
    sandboxStub.stub(fs, 'readFileSync').returns('System.assert(true);');
    fsStub = sandboxStub.stub(fs, 'existsSync').returns(true);
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should execute and display successful result in correct format', async () => {
    const apexExecute = new ExecuteService(mockConnection);
    const log =
      '47.0 APEX_CODE,DEBUG;APEX_PROFILING,INFO\nExecute Anonymous: System.assert(true);|EXECUTION_FINISHED\n';
    const execAnonResult: ExecAnonResult = {
      result: {
        column: -1,
        line: -1,
        compiled: 'true',
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: 'true'
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: log } },
        'soapenv:Body': {
          executeAnonymousResponse: execAnonResult
        }
      }
    };
    const expectedResult: ExecuteAnonymousResponse = {
      result: {
        column: -1,
        line: -1,
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: true,
        logs: log
      }
    };
    sandboxStub
      .stub(ExecuteService.prototype, 'connectionRequest')
      .resolves(soapResponse);
    const response = await apexExecute.executeAnonymous({
      apexFilePath: 'filepath/to/anonApex/file'
    });

    expect(response).to.eql(expectedResult);
  });

  it('should execute and display runtime issue in correct format', async () => {
    const apexExecute = new ExecuteService(mockConnection);
    const log =
      '47.0 APEX_CODE,DEBUG;APEX_PROFILING,INFO\nExecute Anonymous: System.assert(false);|EXECUTION_FINISHED\n';
    const execAnonResult: ExecAnonResult = {
      result: {
        column: 1,
        line: 6,
        compiled: 'true',
        compileProblem: '',
        exceptionMessage: 'System.AssertException: Assertion Failed',
        exceptionStackTrace: 'AnonymousBlock: line 1, column 1',
        success: 'false'
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: log } },
        'soapenv:Body': {
          executeAnonymousResponse: execAnonResult
        }
      }
    };
    const expectedResult: ExecuteAnonymousResponse = {
      result: {
        column: 1,
        line: 6,
        compiled: true,
        compileProblem: '',
        exceptionMessage: 'System.AssertException: Assertion Failed',
        exceptionStackTrace: 'AnonymousBlock: line 1, column 1',
        success: false,
        logs: log
      }
    };
    sandboxStub
      .stub(ExecuteService.prototype, 'connectionRequest')
      .resolves(soapResponse);

    const response = await apexExecute.executeAnonymous({
      apexFilePath: 'filepath/to/anonApex/file'
    });
    expect(response).to.eql(expectedResult);
  });

  it('should execute and display compile issue in correct format', async () => {
    const apexExecute = new ExecuteService(mockConnection);
    const execAnonResult: ExecAnonResult = {
      result: {
        column: 1,
        line: 6,
        compiled: 'false',
        compileProblem: `Unexpected token '('.`,
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: 'false'
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: '' } },
        'soapenv:Body': {
          executeAnonymousResponse: execAnonResult
        }
      }
    };

    const expectedResult: ExecuteAnonymousResponse = {
      result: {
        column: 1,
        line: 6,
        compiled: false,
        compileProblem: `Unexpected token '('.`,
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: false,
        logs: ''
      }
    };
    sandboxStub
      .stub(ExecuteService.prototype, 'connectionRequest')
      .resolves(soapResponse);

    const response = await apexExecute.executeAnonymous({
      apexFilePath: 'filepath/to/anonApex/file'
    });
    expect(response).to.eql(expectedResult);
  });

  it('should handle access token session id error correctly', async () => {
    const apexExecute = new ExecuteService(mockConnection);
    const log =
      '47.0 APEX_CODE,DEBUG;APEX_PROFILING,INFO\nExecute Anonymous: System.assert(true);|EXECUTION_FINISHED\n';
    const execAnonResult: ExecAnonResult = {
      result: {
        column: -1,
        line: -1,
        compiled: 'true',
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: 'true'
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: log } },
        'soapenv:Body': {
          executeAnonymousResponse: execAnonResult
        }
      }
    };
    const expectedResult: ExecuteAnonymousResponse = {
      result: {
        column: -1,
        line: -1,
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: true,
        logs: log
      }
    };

    const connRequestStub = sandboxStub.stub(
      ExecuteService.prototype,
      'connectionRequest'
    );
    sandboxStub.stub(ExecuteService.prototype, 'refreshAuth');
    const error = new Error('INVALID_SESSION_ID');
    error.name = 'ERROR_HTTP_500';
    connRequestStub.onFirstCall().throws(error);
    connRequestStub.onSecondCall().resolves(soapResponse);

    const response = await apexExecute.executeAnonymous({
      apexFilePath: 'filepath/to/anonApex/file'
    });
    expect(response).to.eql(expectedResult);
    expect(connRequestStub.calledTwice);
  });

  it('should raise an error when the source file is not found', async () => {
    const apexFile = 'filepath/to/anonApex/file';
    const apexExecute = new ExecuteService(mockConnection);
    fsStub.restore();
    fsStub.returns(false);

    try {
      await apexExecute.executeAnonymous({ apexFilePath: apexFile });
      assert.fail('Expected an error');
    } catch (e) {
      assert.equal(nls.localize('file_not_found_error', apexFile), e.message);
    }
  });

  it('should handle Buffer input correctly', async () => {
    const apexExecute = new ExecuteService(mockConnection);
    const log =
      '47.0 APEX_CODE,DEBUG;APEX_PROFILING,INFO\nExecute Anonymous: System.assert(true);|EXECUTION_FINISHED\n';
    const bufferInput = Buffer.from('System.assert(true);');
    const execAnonResult: ExecAnonResult = {
      result: {
        column: -1,
        line: -1,
        compiled: 'true',
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: 'true'
      }
    };
    const soapResponse: SoapResponse = {
      'soapenv:Envelope': {
        'soapenv:Header': { DebuggingInfo: { debugLog: log } },
        'soapenv:Body': {
          executeAnonymousResponse: execAnonResult
        }
      }
    };
    const expectedResult: ExecuteAnonymousResponse = {
      result: {
        column: -1,
        line: -1,
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        success: true,
        logs: log
      }
    };
    sandboxStub
      .stub(ExecuteService.prototype, 'connectionRequest')
      .resolves(soapResponse);
    const response = await apexExecute.executeAnonymous({
      apexCode: bufferInput
    });

    expect(response).to.eql(expectedResult);
  });

  it('should throw an error if no option is specified', async () => {
    try {
      const executeService = new ExecuteService(mockConnection);
      await executeService.executeAnonymous({});
      assert.fail();
    } catch (e) {
      assert.equal(nls.localize('option_exec_anon_error'), e.message);
    }
  });

  it('should throw an error if user input fails', async () => {
    const errorText = 'This is the error';
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const on = (event: string, listener: (err?: Error) => {}) => {
      try {
        if (event === 'error') {
          listener(new Error(errorText));
        }
        listener();
      } catch (e) {
        throw e;
      }
    };
    sandboxStub
      .stub(readline, 'createInterface')
      //@ts-ignore
      .returns({ on });

    try {
      const executeService = new ExecuteService(mockConnection);
      await executeService.getUserInput();
    } catch (e) {
      assert.equal(
        nls.localize('unexpected_exec_anon_input_error', errorText),
        e.message
      );
    }
  });

  it('should process user input correctly', async () => {
    const inputText = 'This should be the only text';
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const on = (event: string, listener: (input: string) => {}) => {
      listener(inputText);
    };
    sandboxStub
      .stub(readline, 'createInterface')
      //@ts-ignore
      .returns({ on });

    const executeService = new ExecuteService(mockConnection);
    const text = await executeService.getUserInput();
    expect(text).to.equal(`${inputText}\n`);
  });

  it('should throw error if user is idle', async () => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const on = (event: string, listener: () => {}) => {
      listener();
    };
    sandboxStub
      .stub(readline, 'createInterface')
      //@ts-ignore
      .returns({ on });

    try {
      const executeService = new ExecuteService(mockConnection);
      await executeService.getUserInput();
    } catch (e) {
      assert.equal(nls.localize('exec_anon_input_timeout'), e.message);
    }
  });
});
