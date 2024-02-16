/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as sinon from 'sinon';
import { Logger } from '@salesforce/core';
import { elapsedTime } from '../../src/utils/elapsedTime';
import { expect } from 'chai';

describe('elapsedTime', () => {
  let sandbox: sinon.SinonSandbox;
  let loggerStub: sinon.SinonStubbedInstance<Logger>;
  let loggerChildStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerStub = sandbox.stub(Logger.prototype);
    loggerChildStub = sandbox.stub(Logger, 'childFromRoot').returns(loggerStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should log the entry and exit of the method', () => {
    class DummyClass {
      @elapsedTime()
      dummyMethod() {
        return 'dummyResult';
      }
    }

    const dummyInstance = new DummyClass();
    dummyInstance.dummyMethod();

    sinon.assert.calledOnce(loggerChildStub);
    sinon.assert.calledWith(loggerChildStub, 'elapsedTime');
    sinon.assert.callOrder(loggerStub.debug);
    sinon.assert.calledWith(
      loggerStub.debug,
      sinon.match.has('msg', 'DummyClass.dummyMethod - enter')
    );
    sinon.assert.calledWith(
      loggerStub.debug,
      sinon.match.has('msg', 'DummyClass.dummyMethod - exit')
    );
  });

  it('should throw the error if the method throws an error', () => {
    class DummyClass {
      @elapsedTime()
      dummyMethod() {
        throw new Error('dummyError');
      }
    }

    const dummyInstance = new DummyClass();

    expect(() => dummyInstance.dummyMethod()).to.throw(Error, 'dummyError');
  });
});
