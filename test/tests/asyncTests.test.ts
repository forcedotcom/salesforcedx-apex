/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection, Logger } from '@salesforce/core';
import { elapsedTime } from '../../src/utils';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { assert, expect } from 'chai';
import sinon, {
  assert as sinonAssert,
  createSandbox,
  SinonSandbox,
  SinonSpy,
  SinonStub
} from 'sinon';
import {
  TestService,
  OutputDirConfig,
  ApexTestProgressValue,
  Progress,
  JUnitFormatTransformer,
  TapFormatTransformer,
  CancellationTokenSource
} from '../../src';
import {
  AsyncTestConfiguration,
  TestLevel,
  ApexTestQueueItemStatus,
  ApexTestResultOutcome,
  ApexTestQueueItem,
  ApexTestRunResultStatus,
  ApexTestRunResult,
  ApexTestResult,
  ApexOrgWideCoverage,
  ApexCodeCoverageAggregate,
  ApexCodeCoverage,
  ApexTestQueueItemRecord,
  ResultFormat,
  TestRunIdResult,
  FlowTestResult
} from '../../src/tests/types';
import { AsyncTestRun, StreamingClient } from '../../src/streaming';
import { fail } from 'assert';
import { nls } from '../../src/i18n';
import {
  codeCoverageQueryResult,
  mixedPerClassCodeCoverage,
  mixedTestResults,
  missingTimeTestData,
  testResultData,
  testRunId,
  testStartTime,
  diagnosticFailure,
  diagnosticResult,
  skippedTestData,
  flowTestResultData
} from '../testData';
import { join } from 'path';
import fs from 'node:fs/promises';
import * as diagnosticUtil from '../../src/tests/diagnosticUtil';
import * as utils from '../../src/tests/utils';
import { AsyncTests } from '../../src/tests/asyncTests';
import { QUERY_RECORD_LIMIT } from '../../src/tests/constants';
import { Writable } from 'node:stream';

let mockConnection: Connection;
let sandboxStub: SinonSandbox;
let toolingRequestStub: SinonStub;
let retrieveMaxApiVersionStub: SinonStub;
let singleRecordQueryStub: SinonStub;
const testData = new MockTestOrgData();

describe('Run Apex tests asynchronously', () => {
  const $$ = new TestContext();

  let timeStub: SinonStub;
  let formatSpy: SinonSpy;
  const pollResponse: ApexTestQueueItem = {
    done: true,
    totalSize: 1,
    records: [
      {
        Id: '7092M000000Vt94QAC',
        Status: ApexTestQueueItemStatus.Completed,
        ApexClassId: '01p2M00000O6tXZQAZ',
        TestRunResultId: '05m2M000000TgYuQAK'
      }
    ]
  };

  beforeEach(async () => {
    sandboxStub = createSandbox();

    await $$.stubAuths(testData);
    mockConnection = await testData.getConnection();
    retrieveMaxApiVersionStub = sandboxStub
      .stub(mockConnection, 'retrieveMaxApiVersion')
      .resolves('61.0');
    sandboxStub
      .stub(mockConnection, 'instanceUrl')
      .get(() => 'https://na139.salesforce.com');
    sandboxStub.stub(mockConnection, 'getApiVersion').resolves('50.0');
    timeStub = sandboxStub
      .stub(Date.prototype, 'getTime')
      .onFirstCall()
      .returns(6000);
    timeStub.onSecondCall().returns(8000);
    testResultData.summary.orgId = mockConnection.getAuthInfoFields().orgId;
    testResultData.summary.username = mockConnection.getUsername();
    toolingRequestStub = sandboxStub.stub(mockConnection.tooling, 'request');
    singleRecordQueryStub = sandboxStub.stub(
      mockConnection,
      'singleRecordQuery'
    );
    formatSpy = sandboxStub.spy(diagnosticUtil, 'formatTestErrors');
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should run a successful test', async () => {
    const asyncResult = {
      runId: testRunId,
      queueItem: pollResponse
    } as AsyncTestRun;
    const requestOptions: AsyncTestConfiguration = {
      classNames: 'TestSample',
      testLevel: TestLevel.RunSpecifiedTests
    };

    const testAsyncRequest = {
      method: 'POST',
      url: `${mockConnection.tooling._baseUrl()}/runTestsAsynchronous`,
      body: JSON.stringify(requestOptions),
      headers: { 'content-type': 'application/json' }
    };

    toolingRequestStub.withArgs(testAsyncRequest).returns(testRunId);
    sandboxStub
      .stub(StreamingClient.prototype, 'subscribe')
      .resolves(asyncResult);
    sandboxStub.stub(AsyncTests.prototype, 'checkRunStatus').resolves({
      testsComplete: true,
      testRunSummary: {} as ApexTestRunResult
    });
    const testSrv = new TestService(mockConnection);
    const mockTestResultData = sandboxStub
      .stub(AsyncTests.prototype, 'formatAsyncResults')
      .resolves(testResultData);
    sandboxStub.stub(StreamingClient.prototype, 'handshake').resolves();
    const testResult = await testSrv.runTestAsynchronous(requestOptions);
    expect(testResult).to.be.a('object');
    expect(mockTestResultData.calledOnce).to.equal(true);
    expect(mockTestResultData.getCall(0).args[0]).to.equal(asyncResult);
    expect(testResult).to.equal(testResultData);
  });

  it('should throw an error on refresh token issue', async () => {
    const requestOptions: AsyncTestConfiguration = {
      classNames: 'TestSample',
      testLevel: TestLevel.RunSpecifiedTests
    };

    sandboxStub
      .stub(StreamingClient.prototype, 'init')
      .throwsException('No access token');
    const testSrv = new TestService(mockConnection);
    try {
      await testSrv.runTestAsynchronous(requestOptions);
      fail('Test should have thrown an error');
    } catch (e) {
      expect(e.name).to.equal('No access token');
    }
  });

  it('should return flow test formatted test results', async () => {
    flowTestResultData.summary.orgId = mockConnection.getAuthInfoFields().orgId;
    flowTestResultData.summary.username = mockConnection.getUsername();
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });
    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: null
        }
      ]
    });
    mockToolingQuery.onSecondCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          ApexTestQueueItemId: '7092M000000Vt94QAC',
          Result: ApexTestResultOutcome.Pass,
          TestStartDateTime: '3',
          TestEndDateTime: '5',
          FlowTest: {
            DeveloperName: 'FlowName_FlowTestName'
          },
          FlowDefinition: {
            DeveloperName: 'FlowName',
            NamespacePrefix: ''
          }
        }
      ]
    } as FlowTestResult);
    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      undefined,
      runResult.testRunSummary
    );

    let summaryQuery =
      'SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, ';
    summaryQuery +=
      'MethodsEnqueued, StartTime, EndTime, TestTime, TestSetupTime, UserId ';
    summaryQuery += `FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
    expect(singleRecordQueryStub.getCall(0).args[0]).to.equal(summaryQuery);

    let testResultQuery =
      'SELECT Id, ApexTestQueueItemId, Result, TestStartDateTime,TestEndDateTime, FlowTest.DeveloperName, ';
    testResultQuery +=
      'FlowDefinition.DeveloperName, FlowDefinition.NamespacePrefix ';
    testResultQuery += `FROM FlowTestResult WHERE ApexTestQueueItemId IN ('${pollResponse.records[0].Id}')`;
    expect(mockToolingQuery.getCall(1).args[0]).to.equal(testResultQuery);
    expect(getTestResultData).to.deep.equals(flowTestResultData);
  });

  it('should return formatted test results', async () => {
    missingTimeTestData.summary.orgId =
      mockConnection.getAuthInfoFields().orgId;
    missingTimeTestData.summary.username = mockConnection.getUsername();
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });
    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });
    mockToolingQuery.onSecondCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          QueueItemId: '7092M000000Vt94QAC',
          StackTrace: null,
          Message: null,
          AsyncApexJobId: testRunId,
          MethodName: 'testLoggerLog',
          Outcome: ApexTestResultOutcome.Pass,
          ApexLogId: null,
          ApexClass: {
            Id: '01pxx00000O6tXZQAZ',
            Name: 'TestLogger',
            NamespacePrefix: 't3st',
            FullName: 't3st__TestLogger'
          },
          RunTime: null,
          TestTimestamp: '3'
        }
      ]
    } as ApexTestResult);
    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      undefined,
      runResult.testRunSummary
    );

    let summaryQuery =
      'SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, ';
    summaryQuery +=
      'MethodsEnqueued, StartTime, EndTime, TestTime, TestSetupTime, UserId ';
    summaryQuery += `FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
    expect(singleRecordQueryStub.getCall(0).args[0]).to.equal(summaryQuery);

    let testResultQuery = 'SELECT Id, QueueItemId, StackTrace, Message, ';
    testResultQuery +=
      'RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, IsTestSetup, ';
    testResultQuery +=
      'ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix ';
    testResultQuery += `FROM ApexTestResult WHERE QueueItemId IN ('${pollResponse.records[0].Id}')`;
    expect(mockToolingQuery.getCall(1).args[0]).to.equal(testResultQuery);
    expect(getTestResultData).to.deep.equals(missingTimeTestData);
  });

  it('should report progress when checking test summary for run', async () => {
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });
    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          QueueItemId: '7092M000000Vt94QAC',
          StackTrace: null,
          Message: null,
          AsyncApexJobId: testRunId,
          MethodName: 'testLoggerLog',
          Outcome: ApexTestResultOutcome.Pass,
          ApexLogId: null,
          ApexClass: {
            Id: '01pxx00000O6tXZQAZ',
            Name: 'TestLogger',
            NamespacePrefix: 't3st',
            FullName: 't3st__TestLogger'
          },
          RunTime: null,
          TestTimestamp: '3'
        }
      ]
    } as ApexTestResult);
    const reportStub = sandboxStub.stub();
    const progressReporter: Progress<ApexTestProgressValue> = {
      report: reportStub
    };

    await asyncTestSrv.checkRunStatus(testRunId, progressReporter);

    sinonAssert.calledOnce(reportStub);
    sinonAssert.calledWith(reportStub, {
      type: 'FormatTestResultProgress',
      value: 'retrievingTestRunSummary',
      message: nls.localize('retrievingTestRunSummary')
    });
  });

  it('should return correct summary outcome for single skipped test', async () => {
    skippedTestData.summary.orgId = mockConnection.getAuthInfoFields().orgId;
    skippedTestData.summary.username = mockConnection.getUsername();
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });
    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });
    mockToolingQuery.onSecondCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          QueueItemId: '7092M000000Vt94QAC',
          StackTrace: null,
          Message: null,
          AsyncApexJobId: testRunId,
          MethodName: 'testLoggerLog',
          Outcome: ApexTestResultOutcome.Skip,
          ApexLogId: null,
          ApexClass: {
            Id: '7092M000000Vt94QAC',
            Name: 'TestLogger',
            NamespacePrefix: 't3st',
            FullName: 't3st__TestLogger'
          },
          RunTime: null,
          TestTimestamp: '3'
        }
      ]
    } as ApexTestResult);

    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      false,
      runResult.testRunSummary
    );

    let summaryQuery =
      'SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, ';
    summaryQuery +=
      'MethodsEnqueued, StartTime, EndTime, TestTime, TestSetupTime, UserId ';
    summaryQuery += `FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
    expect(singleRecordQueryStub.getCall(0).args[0]).to.equal(summaryQuery);

    let testResultQuery = 'SELECT Id, QueueItemId, StackTrace, Message, ';
    testResultQuery +=
      'RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, IsTestSetup, ';
    testResultQuery +=
      'ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix ';
    testResultQuery += `FROM ApexTestResult WHERE QueueItemId IN ('${pollResponse.records[0].Id}')`;
    expect(mockToolingQuery.getCall(1).args[0]).to.equal(testResultQuery);
    expect(getTestResultData).to.deep.equals(skippedTestData);
  });

  it('should return formatted test results with diagnostics', async () => {
    diagnosticResult.summary.orgId = mockConnection.getAuthInfoFields().orgId;
    diagnosticResult.summary.username = mockConnection.getUsername();
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });
    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });
    mockToolingQuery.onSecondCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          QueueItemId: '7092M000000Vt94QAC',
          StackTrace: 'Class.LIFXControllerTest.makeData: line 6, column 1',
          Message: 'System.AssertException: Assertion Failed',
          AsyncApexJobId: testRunId,
          MethodName: 'testLoggerLog',
          Outcome: ApexTestResultOutcome.Fail,
          ApexLogId: null,
          ApexClass: {
            Id: '01pxx00000O6tXZQAZ',
            Name: 'TestLogger',
            NamespacePrefix: 't3st',
            FullName: 't3st__TestLogger'
          },
          RunTime: null,
          TestTimestamp: '3'
        }
      ]
    } as ApexTestResult);

    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      false,
      runResult.testRunSummary
    );

    expect(getTestResultData).to.deep.equals(diagnosticResult);
  });

  it('should return failed test results with missing error info', async () => {
    diagnosticFailure.summary.orgId = mockConnection.getAuthInfoFields().orgId;
    diagnosticFailure.summary.username = mockConnection.getUsername();
    diagnosticFailure.tests[0].diagnostic.className = undefined;
    diagnosticFailure.tests[0].diagnostic.exceptionStackTrace = undefined;
    diagnosticFailure.tests[0].stackTrace = undefined;
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: testStartTime,
      TestTime: null,
      UserId: '005xx000000abcDAAU'
    });

    mockToolingQuery.onFirstCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });
    mockToolingQuery.onSecondCall().resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '07Mxx00000F2Xx6UAF',
          QueueItemId: '7092M000000Vt94QAC',
          StackTrace: undefined,
          Message: 'System.AssertException: Assertion Failed',
          AsyncApexJobId: testRunId,
          MethodName: 'testLoggerLog',
          Outcome: ApexTestResultOutcome.Fail,
          ApexLogId: null,
          ApexClass: {
            Id: '01pxx00000O6tXZQAZ',
            Name: 'TestLogger',
            NamespacePrefix: 't3st',
            FullName: 't3st__TestLogger'
          },
          RunTime: null,
          TestTimestamp: '3'
        }
      ]
    } as ApexTestResult);

    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      false,
      runResult.testRunSummary
    );

    expect(getTestResultData).to.deep.equals(diagnosticFailure);
  });

  it('should return an error if no test results are found', async () => {
    const asyncTestSrv = new AsyncTests(mockConnection);
    singleRecordQueryStub.onFirstCall().throwsException('No records found');

    try {
      const runResult = await asyncTestSrv.checkRunStatus(testRunId);
      await asyncTestSrv.formatAsyncResults(
        { queueItem: pollResponse, runId: testRunId },
        new Date().getTime(),
        false,
        runResult.testRunSummary
      );
      fail('Test should have thrown an error');
    } catch (e) {
      expect(e.message).to.equal(
        nls.localize('noTestResultSummary', testRunId)
      );
    }
  });

  it('should return an error if invalid test run id was provided', async () => {
    const invalidId = '000000xxxxx';
    const asyncTestSrv = new AsyncTests(mockConnection);
    singleRecordQueryStub.onFirstCall().resolves(undefined);

    try {
      await asyncTestSrv.checkRunStatus(invalidId);
      fail('Test should have thrown an error');
    } catch (e) {
      expect(e.message).to.equal(
        nls.localize('invalidTestRunIdErr', invalidId)
      );
      expect(singleRecordQueryStub.notCalled).to.be.true;
    }
  });

  it('should return an error if invalid test run id prefix was provided', async () => {
    const invalidId = '708000000xxxxxx';
    const asyncTestSrv = new AsyncTests(mockConnection);
    singleRecordQueryStub.onFirstCall().resolves(undefined);

    try {
      await asyncTestSrv.checkRunStatus(invalidId);
      fail('Test should have thrown an error');
    } catch (e) {
      expect(e.message).to.equal(
        nls.localize('invalidTestRunIdErr', invalidId)
      );
      expect(singleRecordQueryStub.notCalled).to.be.true;
    }
  });

  it('should return formatted test results with code coverage', async () => {
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingAutoQuery = sandboxStub.stub(
      mockConnection.tooling,
      'query'
    );

    singleRecordQueryStub.onFirstCall().resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: '2020-07-12T02:54:47.000+0000',
      TestTime: 1765,
      UserId: '005xx000000abcDAAU'
    });

    mockToolingAutoQuery.onCall(0).resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });

    mockToolingAutoQuery.onCall(1).resolves({
      done: true,
      totalSize: 6,
      records: mixedTestResults
    } as ApexTestResult);

    mockToolingAutoQuery.onCall(2).resolves({
      done: true,
      totalSize: 3,
      records: mixedPerClassCodeCoverage
    } as ApexCodeCoverage);

    mockToolingAutoQuery.onCall(3).resolves({
      done: true,
      totalSize: 3,
      records: codeCoverageQueryResult
    } as ApexCodeCoverageAggregate);

    mockToolingAutoQuery.onCall(4).resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          PercentCovered: '57'
        }
      ]
    } as ApexOrgWideCoverage);

    const runResult = await asyncTestSrv.checkRunStatus(testRunId);
    const getTestResultData = await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      true,
      runResult.testRunSummary
    );

    // verify summary data
    expect(getTestResultData.summary.failRate).to.equal('33%');
    expect(getTestResultData.summary.testsRan).to.equal(6);
    expect(getTestResultData.summary.orgId).to.equal(
      mockConnection.getAuthInfoFields().orgId
    );
    expect(getTestResultData.summary.outcome).to.equal('Failed');
    expect(getTestResultData.summary.passRate).to.equal('50%');
    expect(getTestResultData.summary.skipRate).to.equal('17%');
    expect(getTestResultData.summary.username).to.equal(
      mockConnection.getUsername()
    );
    expect(getTestResultData.summary.orgWideCoverage).to.equal('57%');
    expect(getTestResultData.summary.testRunCoverage).to.equal('66%');
    expect(getTestResultData.tests.length).to.equal(6);
    expect(getTestResultData.codecoverage.length).to.equal(3);
  });

  it('should report progress for aggregating code coverage', async () => {
    const asyncTestSrv = new AsyncTests(mockConnection);
    const mockToolingQuery = sandboxStub.stub(mockConnection.tooling, 'query');
    singleRecordQueryStub.onCall(0).resolves({
      AsyncApexJobId: testRunId,
      Status: ApexTestRunResultStatus.Completed,
      StartTime: '2020-07-12T02:54:47.000+0000',
      TestTime: 1765,
      UserId: '005xx000000abcDAAU'
    });

    mockToolingQuery.onCall(0).resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          ApexClassId: 'xxxx'
        }
      ]
    });

    mockToolingQuery.onCall(1).resolves({
      done: true,
      totalSize: 6,
      records: mixedTestResults
    } as ApexTestResult);

    mockToolingQuery.onCall(2).resolves({
      done: true,
      totalSize: 3,
      records: mixedPerClassCodeCoverage
    } as ApexCodeCoverage);

    mockToolingQuery.onCall(3).resolves({
      done: true,
      totalSize: 3,
      records: codeCoverageQueryResult
    } as ApexCodeCoverageAggregate);

    mockToolingQuery.onCall(4).resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          PercentCovered: '57'
        }
      ]
    } as ApexOrgWideCoverage);

    const reportStub = sandboxStub.stub();
    const progressReporter: Progress<ApexTestProgressValue> = {
      report: reportStub
    };

    const runResult = await asyncTestSrv.checkRunStatus(
      testRunId,
      progressReporter
    );
    await asyncTestSrv.formatAsyncResults(
      { queueItem: pollResponse, runId: testRunId },
      new Date().getTime(),
      true,
      runResult.testRunSummary,
      progressReporter
    );

    sinonAssert.calledTwice(reportStub);
    sinonAssert.calledWith(reportStub, {
      type: 'FormatTestResultProgress',
      value: 'retrievingTestRunSummary',
      message: nls.localize('retrievingTestRunSummary')
    });
    sinonAssert.calledWith(reportStub, {
      type: 'FormatTestResultProgress',
      value: 'queryingForAggregateCodeCoverage',
      message: nls.localize('queryingForAggregateCodeCoverage')
    });
  });

  describe('Check Query Limits', async () => {
    const queryStart =
      'SELECT Id, QueueItemId, StackTrace, Message, RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, IsTestSetup, ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix FROM ApexTestResult WHERE QueueItemId IN ';

    const queueItemRecords: ApexTestQueueItemRecord[] = [];
    const queryIds: string[] = [];
    const maxRecordCount = 700;

    for (let i = 0; i < maxRecordCount; i++) {
      const record = {
        Id: `7092M000000Vt94QAC-${i}`,
        Status: ApexTestQueueItemStatus.Completed,
        ApexClassId: '01p2M00000O6tXZQAZ',
        TestRunResultId: '05m2M000000TgYuQAK'
      };
      queueItemRecords.push(record);
      queryIds.push(record.Id);
    }

    const testQueueItems: ApexTestQueueItem = {
      done: true,
      totalSize: maxRecordCount,
      records: queueItemRecords
    };

    it('should split into multiple queries if query is longer than char limit', async () => {
      const mockToolingQuery = sandboxStub
        .stub(mockConnection.tooling, 'query')
        .resolves({ done: true, totalSize: 1, records: [] });

      const asyncTestSrv = new AsyncTests(mockConnection);
      const result = await asyncTestSrv.getAsyncTestResults(testQueueItems);

      expect(mockToolingQuery.calledThrice).to.be.true;
      expect(result.length).to.eql(2);
    });

    it('should make a single api call if query is under char limit', async () => {
      const mockToolingQuery = sandboxStub
        .stub(mockConnection.tooling, 'query')
        .resolves({ done: true, totalSize: 1, records: [] });

      const asyncTestSrv = new AsyncTests(mockConnection);
      const result = await asyncTestSrv.getAsyncTestResults(pollResponse);

      expect(mockToolingQuery.calledTwice).to.be.true;
      expect(result.length).to.eql(1);
    });

    it('should format multiple queries correctly', async () => {
      const queryOneIds = queryIds.slice(0, QUERY_RECORD_LIMIT).join("','");
      const queryOne = `${queryStart}('${queryOneIds}')`;
      const queryTwoIds = queryIds.slice(QUERY_RECORD_LIMIT).join("','");
      const queryTwo = `${queryStart}('${queryTwoIds}')`;

      const testQueueItems: ApexTestQueueItem = {
        done: true,
        totalSize: maxRecordCount,
        records: queueItemRecords
      };

      const mockToolingQuery = sandboxStub
        .stub(mockConnection.tooling, 'query')
        .resolves({ done: true, totalSize: 1, records: [] });

      const asyncTestSrv = new AsyncTests(mockConnection);
      const result = await asyncTestSrv.getAsyncTestResults(testQueueItems);

      expect(mockToolingQuery.calledThrice).to.be.true;
      expect(result.length).to.eql(2);
      expect(mockToolingQuery.calledWith(queryOne)).to.be.true;
      expect(mockToolingQuery.calledWith(queryTwo)).to.be.true;
    });

    it('should format query at query limit correctly', async () => {
      const queryOneIds = queryIds.slice(0, QUERY_RECORD_LIMIT).join("','");
      const queryOne = `${queryStart}('${queryOneIds}')`;

      const testQueueItems: ApexTestQueueItem = {
        done: true,
        totalSize: maxRecordCount,
        records: queueItemRecords
      };

      const mockToolingQuery = sandboxStub
        .stub(mockConnection.tooling, 'query')
        .resolves({ done: true, totalSize: 1, records: [] });

      const asyncTestSrv = new AsyncTests(mockConnection);
      const result = await asyncTestSrv.getAsyncTestResults(testQueueItems);

      expect(mockToolingQuery.calledThrice).to.be.true;
      expect(result.length).to.eql(2);
      expect(mockToolingQuery.calledWith(queryOne)).to.be.true;
      expect(
        mockToolingQuery.calledWith(`${queryStart}('7092M000000Vt94QAC-0')`)
      );
    });

    it('should split the queue into chunks of 500 records', async () => {
      const queryStart =
        'SELECT Id, QueueItemId, StackTrace, Message, RunTime, TestTimestamp, AsyncApexJobId, MethodName, Outcome, ApexLogId, IsTestSetup, ApexClass.Id, ApexClass.Name, ApexClass.NamespacePrefix FROM ApexTestResult WHERE QueueItemId IN ';
      const queryStartSeparatorCount = queryStart.split(',').length - 1;

      const mockToolingQuery = sandboxStub
        .stub(mockConnection.tooling, 'query')
        .resolves({ done: true, totalSize: 1, records: [] });

      const queueItemRecord: ApexTestQueueItemRecord[] = [];

      let count = 0;
      while (count < 1800) {
        const record = {
          Id: `7092M000000Vt94QAC-${count}`,
          Status: ApexTestQueueItemStatus.Completed,
          ApexClassId: '01p2M00000O6tXZQAZ',
          TestRunResultId: '05m2M000000TgYuQAK'
        };
        queueItemRecord.push(record);
        count++;
      }

      const testQueueItems: ApexTestQueueItem = {
        done: true,
        totalSize: 1800,
        records: queueItemRecord
      };

      const asyncTestSrv = new AsyncTests(mockConnection);
      await asyncTestSrv.getAsyncTestResults(testQueueItems);

      expect(mockToolingQuery.args.length).to.equal(5);

      const callOneIdCount =
        mockToolingQuery.getCall(1).args[0].split(',').length -
        queryStartSeparatorCount;
      expect(callOneIdCount).to.equal(QUERY_RECORD_LIMIT);

      const callTwoIdCount =
        mockToolingQuery.getCall(2).args[0].split(',').length -
        queryStartSeparatorCount;
      expect(callTwoIdCount).to.equal(QUERY_RECORD_LIMIT);

      const callThreeIdCount =
        mockToolingQuery.getCall(3).args[0].split(',').length -
        queryStartSeparatorCount;
      expect(callThreeIdCount).to.equal(QUERY_RECORD_LIMIT);

      const callFourIdCount =
        mockToolingQuery.getCall(4).args[0].split(',').length -
        queryStartSeparatorCount;
      expect(callFourIdCount).to.equal(300);

      expect(
        callOneIdCount + callTwoIdCount + callThreeIdCount + callFourIdCount
      ).to.equal(1800);
    });

    it('should format single query correctly', async () => {
      const mockToolingQuery = sandboxStub.stub(
        mockConnection.tooling,
        'query'
      );
      const id = '7092M000000Vt94QAC';
      mockToolingQuery.onFirstCall().resolves({
        done: true,
        totalSize: 1,
        records: [
          {
            ApexClassId: 'xxxx'
          }
        ]
      });
      mockToolingQuery.onSecondCall().resolves({
        done: true,
        totalSize: 1,
        records: [
          {
            Id: '07Mxx00000F2Xx6UAF',
            QueueItemId: id,
            StackTrace: null,
            Message: null,
            AsyncApexJobId: testRunId,
            MethodName: 'testLoggerLog',
            Outcome: ApexTestResultOutcome.Pass,
            ApexLogId: null,
            ApexClass: {
              Id: '01pxx00000O6tXZQAZ',
              Name: 'TestLogger',
              NamespacePrefix: 't3st',
              FullName: 't3st__TestLogger'
            },
            RunTime: 8,
            TestTimestamp: '3'
          }
        ]
      } as ApexTestResult);
      const singleQuery = `${queryStart}('${id}')`;

      const asyncTestSrv = new AsyncTests(mockConnection);
      const result = await asyncTestSrv.getAsyncTestResults(pollResponse);

      expect(mockToolingQuery.calledTwice).to.be.true;
      expect(mockToolingQuery.calledWith(singleQuery)).to.be.true;
      expect(result.length).to.eql(1);
    });
  });

  describe('Abort Test Runs', () => {
    it('should send requests to abort test run', async () => {
      const mockTestQueueItemRecord: ApexTestQueueItem = {
        size: 2,
        totalSize: 2,
        done: true,
        queryLocator: null,
        entityTypeName: 'ApexTestQueueItem',
        records: [
          {
            attributes: {
              type: 'ApexTestQueueItem',
              url: '/services/data/v51.0/tooling/sobjects/ApexTestQueueItem/7095w000000JR5mAAG'
            },
            Id: testRunId,
            Status: ApexTestQueueItemStatus.Processing
          },
          {
            attributes: {
              type: 'ApexTestQueueItem',
              url: '/services/data/v51.0/tooling/sobjects/ApexTestQueueItem/7095w000000JR5nAAG'
            },
            Id: testRunId,
            Status: ApexTestQueueItemStatus.Processing
          }
        ]
      } as unknown as ApexTestQueueItem;
      sandboxStub
        .stub(mockConnection.tooling, 'query')
        //@ts-ignore
        .resolves<ApexTestQueueItemRecord>(mockTestQueueItemRecord);
      const toolingUpdateStub = sandboxStub.stub(
        mockConnection.tooling,
        'update'
      );

      const asyncTestSrv = new AsyncTests(mockConnection);
      await asyncTestSrv.abortTestRun(testRunId);

      sinonAssert.calledOnce(toolingUpdateStub);
      sinonAssert.calledWith(toolingUpdateStub, 'ApexTestQueueItem', [
        {
          attributes: {
            type: 'ApexTestQueueItem',
            url: '/services/data/v51.0/tooling/sobjects/ApexTestQueueItem/7095w000000JR5mAAG'
          },
          Id: testRunId,
          Status: ApexTestQueueItemStatus.Aborted
        },
        {
          attributes: {
            type: 'ApexTestQueueItem',
            url: '/services/data/v51.0/tooling/sobjects/ApexTestQueueItem/7095w000000JR5nAAG'
          },
          Id: testRunId,
          Status: ApexTestQueueItemStatus.Aborted
        }
      ] as unknown as ApexTestQueueItemRecord[]);
    });

    it('should abort test run on cancellation requested', async () => {
      const requestOptions: AsyncTestConfiguration = {
        classNames: 'TestSample',
        testLevel: TestLevel.RunSpecifiedTests
      };
      const testAsyncRequest = {
        method: 'POST',
        url: `${mockConnection.tooling._baseUrl()}/runTestsAsynchronous`,
        body: JSON.stringify(requestOptions),
        headers: {
          'content-type': 'application/json'
        }
      };
      toolingRequestStub.withArgs(testAsyncRequest).returns(testRunId);
      const actionf: () => Promise<{ runId: string }> = () =>
        Promise.resolve({ runId: testRunId });

      sandboxStub
        .stub(StreamingClient.prototype, 'subscribe')
        .callsFake(function () {
          // eslint-disable-next-line
          const that = this;
          return new Promise(function () {
            actionf().then(function (id) {
              that.subscribedTestRunId = id;
              that.subscribedTestRunIdDeferred.resolve(id);
            });
          });
        });
      const diconnectStub = sandboxStub.stub(
        StreamingClient.prototype,
        'disconnect'
      );
      sandboxStub.stub(StreamingClient.prototype, 'handshake').resolves();
      const abortTestRunStub = sandboxStub
        .stub(AsyncTests.prototype, 'abortTestRun')
        .resolves();

      const cancellationTokenSource = new CancellationTokenSource();
      const testSrv = new TestService(mockConnection);
      testSrv.runTestAsynchronous(
        requestOptions,
        false,
        undefined,
        undefined,
        cancellationTokenSource.token
      );

      return new Promise((resolve) => {
        // wait for task queue
        setTimeout(async () => {
          await cancellationTokenSource.asyncCancel();
          sinonAssert.calledOnce(abortTestRunStub);
          sinonAssert.calledOnce(diconnectStub);
          resolve();
        }, 100);
      });
    });
  });

  describe('Format Test Errors', async () => {
    it('should format test error when running asynchronous tests', async () => {
      const testSrv = new TestService(mockConnection);
      const errMsg = `sObject type 'ApexClass' is not supported.`;
      sandboxStub
        .stub(StreamingClient.prototype, 'handshake')
        .throws(new Error(errMsg));
      try {
        await testSrv.runTestAsynchronous({
          testLevel: TestLevel.RunLocalTests
        });
        fail('Should have failed');
      } catch (e) {
        expect(formatSpy.calledOnce).to.be.true;
        expect(e.message).to.contain(
          nls.localize('invalidsObjectErr', ['ApexClass', errMsg])
        );
      }
    });

    it('should format test error when building asynchronous payload', async () => {
      const errMsg = `sObject type 'PackageLicense' is not supported.`;
      sandboxStub.stub(utils, 'queryNamespaces').throws(new Error(errMsg));
      const testSrv = new TestService(mockConnection);
      try {
        await testSrv.buildAsyncPayload(
          TestLevel.RunSpecifiedTests,
          'MyApexClass.MyTest'
        );
        fail('Should have failed');
      } catch (e) {
        expect(formatSpy.calledOnce).to.be.true;
        expect(e.message).to.contain(
          nls.localize('invalidsObjectErr', ['PackageLicense', errMsg])
        );
      }
    });
  });

  describe('Report Test Run Status', async () => {
    it('should subscribe to test run for run still in progress', async () => {
      const asyncTestSrv = new AsyncTests(mockConnection);
      sandboxStub.stub(mockConnection.tooling, 'query');
      singleRecordQueryStub
        .onFirstCall()
        .resolves({
          AsyncApexJobId: testRunId,
          Status: ApexTestRunResultStatus.Queued,
          StartTime: testStartTime,
          TestTime: null,
          UserId: '005xx000000abcDAAU'
        })
        .onSecondCall()
        .resolves({
          AsyncApexJobId: testRunId,
          Status: ApexTestRunResultStatus.Completed,
          StartTime: testStartTime,
          TestTime: null,
          UserId: '005xx000000abcDAAU'
        });
      const formatResultsStub = sandboxStub.stub(
        asyncTestSrv,
        'formatAsyncResults'
      );
      const subscribeStub = sandboxStub
        .stub(StreamingClient.prototype, 'subscribe')
        .resolves({
          queueItem: {
            done: true,
            totalSize: 1,
            records: [
              {
                Status: ApexTestQueueItemStatus.Completed,
                Id: 'xxx',
                ApexClassId: 'xxxx',
                TestRunResultId: 'xxx'
              }
            ]
          } as ApexTestQueueItem,
          runId: testRunId
        });
      const handlerStub = sandboxStub.stub(
        StreamingClient.prototype,
        'handler'
      );
      sandboxStub.stub(StreamingClient.prototype, 'init');
      sandboxStub.stub(StreamingClient.prototype, 'handshake');

      await asyncTestSrv.reportAsyncResults(testRunId);

      expect(singleRecordQueryStub.calledTwice).to.be.true;
      expect(formatResultsStub.calledOnce).to.be.true;
      expect(subscribeStub.calledOnce).to.be.true;
      expect(handlerStub.notCalled).to.be.true;
    });

    it('should query for test run results if run is complete', async () => {
      const asyncTestSrv = new AsyncTests(mockConnection);
      sandboxStub.stub(mockConnection.tooling, 'query');
      singleRecordQueryStub.onFirstCall().resolves({
        AsyncApexJobId: testRunId,
        Status: ApexTestRunResultStatus.Completed,
        StartTime: testStartTime,
        TestTime: null,
        UserId: '005xx000000abcDAAU'
      });
      const formatResultsStub = sandboxStub.stub(
        asyncTestSrv,
        'formatAsyncResults'
      );
      const subscribeStub = sandboxStub
        .stub(StreamingClient.prototype, 'subscribe')
        .resolves({
          queueItem: {
            done: true,
            totalSize: 1,
            records: [
              {
                Status: ApexTestQueueItemStatus.Completed,
                Id: 'xxx',
                ApexClassId: 'xxxx',
                TestRunResultId: 'xxx'
              }
            ]
          } as ApexTestQueueItem,
          runId: testRunId
        });
      const handlerStub = sandboxStub.stub(
        StreamingClient.prototype,
        'handler'
      );
      sandboxStub.stub(StreamingClient.prototype, 'init');
      sandboxStub.stub(StreamingClient.prototype, 'handshake');

      await asyncTestSrv.reportAsyncResults(testRunId);

      expect(singleRecordQueryStub.calledOnce).to.be.true;
      expect(formatResultsStub.calledOnce).to.be.true;
      expect(subscribeStub.notCalled).to.be.true;
      expect(handlerStub.calledOnce).to.be.true;
    });

    it('should format results with retrieved test run summary', async () => {
      const asyncTestSrv = new AsyncTests(mockConnection);
      sandboxStub.stub(mockConnection.tooling, 'query');
      singleRecordQueryStub.onFirstCall().resolves({
        AsyncApexJobId: testRunId,
        Status: ApexTestRunResultStatus.Completed,
        StartTime: testStartTime,
        TestTime: null,
        UserId: '005xx000000abcDAAU'
      });
      const formatResultsStub = sandboxStub.stub(
        asyncTestSrv,
        'formatAsyncResults'
      );
      sandboxStub.stub(StreamingClient.prototype, 'subscribe').resolves({
        queueItem: {
          done: true,
          totalSize: 1,
          records: [
            {
              Status: ApexTestQueueItemStatus.Completed,
              Id: 'xxx',
              ApexClassId: 'xxxx',
              TestRunResultId: 'xxx'
            }
          ]
        } as ApexTestQueueItem,
        runId: testRunId
      });
      const handlerStub = sandboxStub.stub(
        StreamingClient.prototype,
        'handler'
      );
      sandboxStub.stub(StreamingClient.prototype, 'init');
      sandboxStub.stub(StreamingClient.prototype, 'handshake');

      await asyncTestSrv.reportAsyncResults(testRunId);

      expect(formatResultsStub.calledOnce).to.be.true;
      expect(handlerStub.calledOnce).to.be.true;
    });
  });

  describe('Supports Test Setup Feature', async () => {
    it(`should verify org's api version supports test setup feature`, async () => {
      const asyncTests = new AsyncTests(mockConnection);

      const fieldExists = await asyncTests.supportsTestSetupFeature();
      expect(fieldExists).to.be.true;
      expect(retrieveMaxApiVersionStub.calledOnce).to.be.true;

      const mockQueryResult = {
        Status: 'Completed',
        ClassesCompleted: 5,
        ClassesEnqueued: 5,
        MethodsEnqueued: 5,
        StartTime: '2021-01-01T00:00:00Z',
        EndTime: '2021-01-01T00:10:00Z',
        TestTime: 600000,
        UserId: 'someUserId'
      };

      singleRecordQueryStub.resolves(mockQueryResult);

      const runStatusResult = await asyncTests.checkRunStatus(testRunId);

      expect(runStatusResult.testsComplete).to.be.true;
      expect(runStatusResult.testRunSummary).to.deep.equal(mockQueryResult);
      expect(singleRecordQueryStub.calledOnce).to.be.true;

      const expectedQueryWithTestSetupTime = `SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, MethodsEnqueued, StartTime, EndTime, TestTime, TestSetupTime, UserId FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
      expect(singleRecordQueryStub.getCall(0).args[0]).to.equal(
        expectedQueryWithTestSetupTime
      );
    });
    it('should handle absence of TestSetupTime field and modify query accordingly', async () => {
      retrieveMaxApiVersionStub.resolves('60.0');
      const asyncTests = new AsyncTests(mockConnection);

      const fieldExists = await asyncTests.supportsTestSetupFeature();

      expect(fieldExists).to.be.false;
      expect(retrieveMaxApiVersionStub.calledOnce).to.be.true;

      const mockQueryResult = {
        Status: 'Completed',
        ClassesCompleted: 5,
        ClassesEnqueued: 5,
        MethodsEnqueued: 5,
        StartTime: '2021-01-01T00:00:00Z',
        EndTime: '2021-01-01T00:10:00Z',
        TestTime: 600000,
        UserId: 'someUserId'
      };

      singleRecordQueryStub.resolves(mockQueryResult);

      const runStatusResult = await asyncTests.checkRunStatus(testRunId);

      expect(runStatusResult.testsComplete).to.be.true;
      expect(runStatusResult.testRunSummary).to.deep.equal(mockQueryResult);
      expect(singleRecordQueryStub.calledOnce).to.be.true;

      const expectedQueryWithoutTestSetupTime = `SELECT AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, MethodsEnqueued, StartTime, EndTime, TestTime, UserId FROM ApexTestRunResult WHERE AsyncApexJobId = '${testRunId}'`;
      expect(singleRecordQueryStub.getCall(0).args[0]).to.equal(
        expectedQueryWithoutTestSetupTime
      );
    });
  });
});

describe('elapsedTime', () => {
  let sandbox: sinon.SinonSandbox;
  let loggerStub: sinon.SinonStubbedInstance<Logger>;
  let loggerChildStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerStub = sandbox.stub(Logger.prototype);
    loggerChildStub = sandbox.stub(Logger, 'childFromRoot').returns(loggerStub);
    loggerStub.shouldLog.returns(true);
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env.SF_LOG_LEVEL;
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
    sinon.assert.callOrder(loggerStub.debug, loggerStub.debug);
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

describe('Create Result Files', () => {
  let testServiceSpy: SinonSpy;
  let junitSpy: SinonSpy;
  let tapSpy: SinonSpy;
  let writeFileSpy: SinonSpy;
  let sandboxStub1: SinonSandbox;

  beforeEach(async () => {
    sandboxStub1 = createSandbox();
    sandboxStub1.stub(fs, 'stat');
    sandboxStub1.stub(fs, 'mkdir');
    writeFileSpy = sandboxStub1.stub(fs, 'writeFile');
    // sandboxStub1.stub(fs, 'close');
    sandboxStub1.stub(fs, 'open');
    testServiceSpy = sandboxStub1
      .stub(TestService.prototype, 'createStream')
      .returns(
        new Writable({
          write(chunk: unknown, encoding, callback) {
            callback();
          }
        })
      );
    junitSpy = sandboxStub1.spy(JUnitFormatTransformer.prototype, 'format');
    tapSpy = sandboxStub1.spy(TapFormatTransformer.prototype, 'format');
  });

  afterEach(() => {
    sandboxStub1.restore();
  });

  it('should only create test-run-id.txt if no result format nor fileInfos are specified', async () => {
    const config = {
      dirPath: 'path/to/directory'
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config);

    expect(writeFileSpy.calledWith(join(config.dirPath, 'test-run-id.txt'))).to
      .be.true;
    expect(testServiceSpy.callCount).to.eql(0);
  });

  it('should throw an error if result format is specified with TestRunId result', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: [ResultFormat.tap]
    };
    const testSrv = new TestService(mockConnection);
    try {
      await testSrv.writeResultFiles(
        { testRunId } as TestRunIdResult,
        config,
        false
      );
      assert.fail();
    } catch (e) {
      expect(e.message).to.equal(
        'Cannot specify a result format with a TestRunId result'
      );
    }
  });

  it('should throw an error if code coverage is specified with TestRunId result', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: [ResultFormat.tap]
    };
    const testSrv = new TestService(mockConnection);
    try {
      await testSrv.writeResultFiles(
        { testRunId } as TestRunIdResult,
        config,
        true
      );
      assert.fail();
    } catch (e) {
      expect(e.message).to.equal(
        'Cannot specify a result format with a TestRunId result'
      );
    }
  });

  it('should create the json files if json result format is specified', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: [ResultFormat.json]
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config);

    expect(
      testServiceSpy.calledWith(
        join(config.dirPath, `test-result-${testRunId}.json`)
      )
    ).to.be.true;
    expect(testServiceSpy.callCount).to.eql(1);
  });

  it('should create the junit result files if junit result format is specified', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: [ResultFormat.junit]
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config);

    expect(
      testServiceSpy.calledWith(
        join(config.dirPath, `test-result-${testRunId}-junit.xml`)
      )
    ).to.be.true;
    expect(junitSpy.calledOnce).to.be.true;
    expect(testServiceSpy.callCount).to.eql(1);
  });

  it('should create the tap result files if result format is specified', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: [ResultFormat.tap]
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config);

    expect(
      testServiceSpy.calledWith(
        join(config.dirPath, `test-result-${testRunId}-tap.txt`)
      )
    ).to.be.true;
    expect(tapSpy.calledOnce).to.be.true;
    expect(testServiceSpy.callCount).to.eql(1);
  });

  it('should throw an error if unexpected type is specified for result format', async () => {
    const config = {
      dirPath: 'path/to/directory',
      resultFormats: ['rando']
    };
    const testSrv = new TestService(mockConnection);
    try {
      // @ts-ignore
      await testSrv.writeResultFiles(testResultData, config, true);
      assert.fail();
    } catch (e) {
      expect(e.message).to.equal(
        'Specified result formats must be of type json, junit, or tap'
      );
    }
  });

  it('should create code coverage files if set to true', async () => {
    const config = {
      dirPath: 'path/to/directory'
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config, true);

    expect(
      testServiceSpy.calledWith(
        join(config.dirPath, `test-result-${testRunId}-codecoverage.json`)
      )
    ).to.be.true;
    expect(testServiceSpy.callCount).to.eql(1);
  });

  it('should create any files provided in fileInfos', async () => {
    const config = {
      dirPath: 'path/to/directory',
      fileInfos: [
        { filename: `test-result-myFile.json`, content: { summary: {} } }
      ]
    } as OutputDirConfig;
    const testSrv = new TestService(mockConnection);
    await testSrv.writeResultFiles(testResultData, config);

    expect(
      testServiceSpy.calledWith(join(config.dirPath, `test-result-myFile.json`))
    ).to.be.true;
    expect(testServiceSpy.callCount).to.eql(1);
  });
});
