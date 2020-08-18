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
import {
  ApexCodeCoverageAggregate,
  ApexOrgWideCoverage
} from '../../src/tests/types';

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

  it('should return test code coverage result', async () => {
    toolingQueryStub.resolves({
      done: true,
      totalSize: 2,
      records: [
        {
          ApexClassOrTrigger: {
            Id: '01pxx00000avcNeAAL',
            Name: 'ApexClassExample'
          },
          NumLinesCovered: 0,
          NumLinesUncovered: 9,
          Coverage: {
            coveredLines: [],
            uncoveredLines: [3, 8, 10, 13, 16, 21, 22, 24, 28]
          }
        },
        {
          ApexClassOrTrigger: {
            Id: '01pxx00000avc00AAL',
            Name: 'ApexSampleV2'
          },
          NumLinesCovered: 19,
          NumLinesUncovered: 1,
          Coverage: {
            coveredLines: [
              3,
              4,
              6,
              7,
              8,
              9,
              15,
              18,
              19,
              22,
              23,
              24,
              27,
              28,
              29,
              30,
              31,
              33,
              34
            ],
            uncoveredLines: [35]
          }
        },
        {
          ApexClassOrTrigger: {
            Id: '01qxp00000av340AAL',
            Name: 'MyTestTrigger'
          },
          NumLinesCovered: 0,
          NumLinesUncovered: 0,
          Coverage: {
            coveredLines: [],
            uncoveredLines: []
          }
        }
      ]
    } as ApexCodeCoverageAggregate);
    const testSrv = new TestService(mockConnection);

    const testCodeCoverageResult = await testSrv.getTestCodeCoverage();
    expect(testCodeCoverageResult.length).to.equal(3);
    expect(testCodeCoverageResult[0].apexId).to.equal('01pxx00000avcNeAAL');
    expect(testCodeCoverageResult[0].name).to.equal('ApexClassExample');
    expect(testCodeCoverageResult[0].type).to.equal('ApexClass');
    expect(testCodeCoverageResult[0].numLinesCovered).to.equal(0);
    expect(testCodeCoverageResult[0].numLinesUncovered).to.equal(9);
    expect(testCodeCoverageResult[0].percentage).to.equal('0%');

    expect(testCodeCoverageResult[1].apexId).to.equal('01pxx00000avc00AAL');
    expect(testCodeCoverageResult[1].name).to.equal('ApexSampleV2');
    expect(testCodeCoverageResult[1].type).to.equal('ApexClass');
    expect(testCodeCoverageResult[1].numLinesCovered).to.equal(19);
    expect(testCodeCoverageResult[1].numLinesUncovered).to.equal(1);
    expect(testCodeCoverageResult[1].percentage).to.equal('95%');

    expect(testCodeCoverageResult[2].apexId).to.equal('01qxp00000av340AAL');
    expect(testCodeCoverageResult[2].name).to.equal('MyTestTrigger');
    expect(testCodeCoverageResult[2].type).to.equal('ApexTrigger');
    expect(testCodeCoverageResult[2].numLinesCovered).to.equal(0);
    expect(testCodeCoverageResult[2].numLinesUncovered).to.equal(0);
    expect(testCodeCoverageResult[2].percentage).to.equal('0%');
  });

  it('should return test code coverage result', async () => {
    toolingQueryStub.resolves({
      done: true,
      totalSize: 0,
      records: []
    } as ApexCodeCoverageAggregate);
    const testSrv = new TestService(mockConnection);
    const testCodeCoverageResult = await testSrv.getTestCodeCoverage();
    expect(testCodeCoverageResult.length).to.equal(0);
  });
});
