/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexCodeCoverageAggregateRecord,
  ApexCodeCoverageRecord,
  ApexTestResultOutcome,
  ApexTestResultRecord,
  ApexTestRunResultStatus,
  SyncTestResult,
  TestResult
} from '../src/tests/types';

export const syncTestResultSimple: SyncTestResult = {
  apexLogId: '07Lxx00000cxy6YUAQ',
  failures: [],
  numFailures: 0,
  numTestsRun: 1,
  successes: [
    {
      id: '01pxx00000NWwb3AAD',
      methodName: 'testOne',
      name: 'TestSample',
      namespace: null,
      seeAllData: false,
      time: 107
    }
  ],
  totalTime: 270
};

export const syncTestResultWithFailures: SyncTestResult = {
  apexLogId: '07Lxx00000cxy6YUAQ',
  successes: [],
  numFailures: 0,
  numTestsRun: 4,
  failures: [
    {
      id: '01pxx00000NWwb3AAD',
      message:
        'System.AssertException: Assertion Failed: Expected: false, Actual: true',
      methodName: 'testOne',
      name: 'TestSample',
      namespace: 'tr',
      seeAllData: false,
      stackTrace: 'Class.TestSample.testOne: line 27, column 1',
      time: 68,
      type: 'Class'
    },
    {
      id: '01pxx00000NWwb4AAD',
      message:
        'System.AssertException: Assertion Failed: Expected: false, Actual: true',
      methodName: 'testOne',
      name: 'TestSample2',
      namespace: 'tr',
      seeAllData: false,
      stackTrace: undefined,
      time: 68,
      type: 'Class'
    },
    {
      id: '01pxx00000NWwb5AAD',
      message: undefined,
      methodName: 'testOne',
      name: 'TestSample3',
      namespace: 'tr',
      seeAllData: false,
      stackTrace: 'Class.TestSample3.testOne: line 27, column 1',
      time: 68,
      type: 'Class'
    },
    {
      id: '01pxx00000NWwb6AAD',
      message: undefined,
      methodName: 'testOne',
      name: 'TestSample4',
      namespace: 'tr',
      seeAllData: false,
      stackTrace: 'TestSample4: line 30',
      time: 68,
      type: 'Class'
    }
  ],
  totalTime: 87
};

export const testStartTime = '2020-11-09T18:02:50.000+0000';
const localStartTime = new Date(testStartTime).toISOString();
export const testRunId = '707xx0000AGQ3jbQQD';

export const syncResult: TestResult = {
  // @ts-ignore
  summary: {
    outcome: ApexTestRunResultStatus.Passed,
    testsRan: 1,
    passing: 1,
    failing: 0,
    skipped: 0,
    passRate: '100%',
    failRate: '0%',
    skipRate: '0%',
    testStartTime: localStartTime,
    testExecutionTimeInMs: 1765,
    testTotalTimeInMs: 1765,
    commandTimeInMs: 2000,
    testRunId: '',
    userId: '005xx000000abcDAAU'
  },
  tests: [
    {
      id: '',
      queueItemId: '',
      stackTrace: '',
      message: '',
      asyncApexJobId: '',
      methodName: 'testMethod',
      outcome: ApexTestResultOutcome.Pass,
      apexLogId: null,
      apexClass: {
        id: '01pxx00000O6tXZQAZ',
        name: 'TestApexClass',
        namespacePrefix: 't3st',
        fullName: 't3st.TestApexClass'
      },
      runTime: 8,
      testTimestamp: '',
      fullName: `t3st.TestApexClass.testMethod`
    }
  ],
  setup: []
};

export const testResultData: TestResult = {
  // @ts-ignore
  summary: {
    failRate: '0%',
    failing: 0,
    hostname: 'https://na139.salesforce.com',
    testsRan: 1,
    outcome: 'Passed',
    passRate: '100%',
    passing: 1,
    skipRate: '0%',
    skipped: 0,
    testStartTime: localStartTime,
    testExecutionTimeInMs: 1765,
    testTotalTimeInMs: 1765,
    commandTimeInMs: 2000,
    testRunId,
    userId: '005xx000000abcDAAU'
  },
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: null,
      message: null,
      asyncApexJobId: testRunId,
      methodName: 'testLoggerLog',
      outcome: ApexTestResultOutcome.Pass,
      apexLogId: null,
      apexClass: {
        id: '01pxx00000O6tXZQAZ',
        name: 'TestLogger',
        namespacePrefix: 't3st',
        fullName: 't3st.TestLogger'
      },
      runTime: 8,
      testTimestamp: '3',
      fullName: 't3st.TestLogger.testLoggerLog'
    }
  ],
  setup: []
};

export const flowTestResultData: TestResult = {
  // @ts-ignore
  summary: {
    failRate: '0%',
    failing: 0,
    hostname: 'https://na139.salesforce.com',
    testsRan: 1,
    outcome: 'Passed',
    passRate: '100%',
    passing: 1,
    skipRate: '0%',
    skipped: 0,
    testStartTime: localStartTime,
    testSetupTimeInMs: undefined,
    testExecutionTimeInMs: 0,
    testTotalTimeInMs: 0,
    commandTimeInMs: 2000,
    testRunId,
    userId: '005xx000000abcDAAU'
  },
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: '',
      message: '',
      asyncApexJobId: '7092M000000Vt94QAC',
      methodName: 'FlowName_FlowTestName',
      outcome: ApexTestResultOutcome.Pass,
      apexLogId: '',
      apexClass: {
        id: '7092M000000Vt94QAC',
        name: 'FlowName',
        namespacePrefix: '',
        fullName: 'FlowName'
      },
      runTime: 0,
      testTimestamp: '3',
      fullName: 'FlowName.FlowName_FlowTestName'
    }
  ],
  setup: [],
  codecoverage: undefined
};

export const missingTimeTestData: TestResult = {
  // @ts-ignore
  summary: {
    failRate: '0%',
    failing: 0,
    hostname: 'https://na139.salesforce.com',
    testsRan: 1,
    outcome: 'Passed',
    passRate: '100%',
    passing: 1,
    skipRate: '0%',
    skipped: 0,
    testStartTime: localStartTime,
    testSetupTimeInMs: undefined,
    testExecutionTimeInMs: 0,
    testTotalTimeInMs: 0,
    commandTimeInMs: 2000,
    testRunId,
    userId: '005xx000000abcDAAU'
  },
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: null,
      message: null,
      asyncApexJobId: testRunId,
      methodName: 'testLoggerLog',
      outcome: ApexTestResultOutcome.Pass,
      apexLogId: null,
      apexClass: {
        id: '01pxx00000O6tXZQAZ',
        name: 'TestLogger',
        namespacePrefix: 't3st',
        fullName: 't3st.TestLogger'
      },
      runTime: 0,
      testTimestamp: '3',
      fullName: 't3st.TestLogger.testLoggerLog'
    }
  ],
  setup: [],
  codecoverage: undefined
};

export const skippedTestData: TestResult = {
  // @ts-ignore
  summary: {
    failRate: '0%',
    failing: 0,
    hostname: 'https://na139.salesforce.com',
    testsRan: 1,
    outcome: 'Skipped',
    passRate: '0%',
    passing: 0,
    skipRate: '100%',
    skipped: 1,
    testStartTime: localStartTime,
    testSetupTimeInMs: undefined,
    testExecutionTimeInMs: 0,
    testTotalTimeInMs: 0,
    commandTimeInMs: 2000,
    testRunId,
    userId: '005xx000000abcDAAU'
  },
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: null,
      message: null,
      asyncApexJobId: testRunId,
      methodName: 'testLoggerLog',
      outcome: ApexTestResultOutcome.Skip,
      apexLogId: null,
      apexClass: {
        id: '7092M000000Vt94QAC',
        name: 'TestLogger',
        namespacePrefix: 't3st',
        fullName: 't3st.TestLogger'
      },
      runTime: 0,
      testTimestamp: '3',
      fullName: 't3st.TestLogger.testLoggerLog'
    }
  ],
  setup: [],
  codecoverage: undefined
};

const failureSummary = {
  failRate: '100%',
  failing: 1,
  hostname: 'https://na139.salesforce.com',
  testsRan: 1,
  outcome: 'Failed',
  passRate: '0%',
  passing: 0,
  skipRate: '0%',
  skipped: 0,
  testStartTime: localStartTime,
  testSetupTimeInMs: undefined,
  testExecutionTimeInMs: 0,
  testTotalTimeInMs: 0,
  commandTimeInMs: 2000,
  testRunId,
  userId: '005xx000000abcDAAU'
} as unknown;

export const diagnosticResult: TestResult = {
  // @ts-ignore
  summary: failureSummary,
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: 'Class.LIFXControllerTest.makeData: line 6, column 1',
      message: 'System.AssertException: Assertion Failed',
      asyncApexJobId: testRunId,
      methodName: 'testLoggerLog',
      outcome: ApexTestResultOutcome.Fail,
      apexLogId: null,
      apexClass: {
        id: '01pxx00000O6tXZQAZ',
        name: 'TestLogger',
        namespacePrefix: 't3st',
        fullName: 't3st.TestLogger'
      },
      runTime: 0,
      testTimestamp: '3',
      fullName: 't3st.TestLogger.testLoggerLog',
      diagnostic: {
        className: 'LIFXControllerTest',
        columnNumber: 1,
        compileProblem: '',
        exceptionMessage: 'System.AssertException: Assertion Failed',
        exceptionStackTrace:
          'Class.LIFXControllerTest.makeData: line 6, column 1',
        lineNumber: 6
      }
    }
  ],
  setup: [],
  codecoverage: undefined
};

export const diagnosticFailure: TestResult = {
  // @ts-ignore
  summary: failureSummary,
  tests: [
    {
      id: '07Mxx00000F2Xx6UAF',
      queueItemId: '7092M000000Vt94QAC',
      stackTrace: 'Class.LIFXControllerTest.makeData',
      message: 'System.AssertException: Assertion Failed',
      asyncApexJobId: testRunId,
      methodName: 'testLoggerLog',
      outcome: ApexTestResultOutcome.Fail,
      apexLogId: null,
      apexClass: {
        id: '01pxx00000O6tXZQAZ',
        name: 'TestLogger',
        namespacePrefix: 't3st',
        fullName: 't3st.TestLogger'
      },
      runTime: 0,
      testTimestamp: '3',
      fullName: 't3st.TestLogger.testLoggerLog',
      diagnostic: {
        className: 'LIFXControllerTest',
        compileProblem: '',
        exceptionMessage: 'System.AssertException: Assertion Failed',
        exceptionStackTrace: 'Class.LIFXControllerTest.makeData'
      }
    }
  ],
  setup: [],
  codecoverage: undefined
};

export const perClassCodeCoverage: ApexCodeCoverageRecord[] = [
  {
    ApexTestClassId: '01pxx00000NWwb3AAD',
    ApexClassOrTrigger: {
      Id: '01pxx00000avcNeAAL',
      Name: 'ApexClassExample'
    },
    TestMethodName: 'testOne',
    NumLinesCovered: 1,
    NumLinesUncovered: 62
  },
  {
    ApexTestClassId: '01pxx00000NWwb3AAD',
    ApexClassOrTrigger: {
      Id: '01pxx00000avc00AAL',
      Name: 'ApexSampleV2'
    },
    TestMethodName: 'testOne',
    NumLinesCovered: 45,
    NumLinesUncovered: 2
  },
  {
    ApexTestClassId: '01pxx00000NWwb3AAD',
    ApexClassOrTrigger: {
      Id: '01qxp00000av340AAL',
      Name: 'MyTestTrigger'
    },
    TestMethodName: 'testOne',
    NumLinesCovered: 5,
    NumLinesUncovered: 2
  }
];

export const codeCoverageQueryResult: ApexCodeCoverageAggregateRecord[] = [
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
        3, 4, 6, 7, 8, 9, 15, 18, 19, 22, 23, 24, 27, 28, 29, 30, 31, 33, 34
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
];

export const mixedTestResults: ApexTestResultRecord[] = [
  {
    Id: '07Mxx00000ErehvUAB',
    QueueItemId: '709xx000001Il2UQAS',
    StackTrace: null,
    Message: null,
    RunTime: 1397,
    TestTimestamp: testStartTime,
    AsyncApexJobId: '707xx0000ASIPB5QQP',
    MethodName: 'testAssignOnFuture',
    Outcome: ApexTestResultOutcome.Pass,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    }
  },
  {
    Id: '07Mxx00000ErehwUAB',
    QueueItemId: '709xx000001Il2UQAS',
    StackTrace: null,
    Message: null,
    RunTime: 615,
    TestTimestamp: '2020-08-18T02:04:51.000+0000',
    AsyncApexJobId: '707xxM0000ASIPB5QQP',
    MethodName: 'testAssignOnInsert',
    Outcome: ApexTestResultOutcome.Pass,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    }
  },
  {
    Id: '07Mxx00000ErehxUAB',
    QueueItemId: '709xx000001Il2UQAS',
    StackTrace: null,
    Message: null,
    RunTime: 676,
    TestTimestamp: '2020-08-18T02:04:52.000+0000',
    AsyncApexJobId: '707xx0000ASIPB5QQP',
    MethodName: 'testAssignOnUpdate',
    Outcome: ApexTestResultOutcome.Skip,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    }
  },
  {
    Id: '07Mxx00000ErehyUAB',
    QueueItemId: '709xx000001Il2UQAS',
    StackTrace: null,
    Message: null,
    RunTime: 593,
    TestTimestamp: '2020-08-18T02:04:53.000+0000',
    AsyncApexJobId: '707xx0000ASIPB5QQP',
    MethodName: 'testAssignContains',
    Outcome: ApexTestResultOutcome.Pass,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    }
  },
  {
    Id: '07Mxx00000EreiDUAR',
    QueueItemId: '709xx000001Il2ZQAS',
    StackTrace:
      'Class.TestAssignment.testAssignRuleContains: line 196, column 1',
    Message:
      'System.AssertException: Assertion Failed: Expected: 1, Actual: 11',
    AsyncApexJobId: '707xx0000ASIRYXQQ5',
    MethodName: 'testAssignRuleContains',
    Outcome: ApexTestResultOutcome.Fail,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    },
    RunTime: 560,
    TestTimestamp: '2020-08-18T02:21:30.000+0000'
  },
  {
    Id: '07Mxx00000EreiDUAR',
    QueueItemId: '709xx000001Il2ZQAS',
    StackTrace:
      'Class.TestAssignment.testAssignRuleContainsV2: line 16, column 20',
    Message: 'System.AssertException: Assertion Failed: Expected: 1, Actual: 0',
    AsyncApexJobId: '707xx0000ASIRYXQQ5',
    MethodName: 'testAssignRuleContainsV2',
    Outcome: ApexTestResultOutcome.Fail,
    ApexLogId: null,
    ApexClass: {
      Id: '01pxx00000NnP2KQAV',
      Name: 'TestAssignment',
      NamespacePrefix: null,
      FullName: 'TestAssignment'
    },
    RunTime: 56,
    TestTimestamp: '2020-08-18T02:21:30.000+0000'
  }
];

export const mixedPerClassCodeCoverage: ApexCodeCoverageRecord[] = [
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01pxx00000avcNeAAL',
      Name: 'ApexClassExample'
    },
    TestMethodName: 'testAssignContains',
    NumLinesCovered: 1,
    NumLinesUncovered: 62
  },
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01pxx00000avc00AAL',
      Name: 'ApexSampleV2'
    },
    TestMethodName: 'testAssignOnUpdate',
    NumLinesCovered: 45,
    NumLinesUncovered: 2
  },
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01qxp00000av340AAL',
      Name: 'MyTestTrigger'
    },
    TestMethodName: 'testAssignOnInsert',
    NumLinesCovered: 5,
    NumLinesUncovered: 2
  },
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01qxp00000av340AAL',
      Name: 'MyTestTrigger'
    },
    TestMethodName: 'testAssignRuleContainsV2',
    NumLinesCovered: 0,
    NumLinesUncovered: 20
  },
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01qxp00000av340AAL',
      Name: 'MyTestTrigger'
    },
    TestMethodName: 'testAssignRuleContains',
    NumLinesCovered: 0,
    NumLinesUncovered: 14
  },
  {
    ApexTestClassId: '01pxx00000NnP2KQAV',
    ApexClassOrTrigger: {
      Id: '01qxp00000av340AAL',
      Name: 'MyTestTrigger'
    },
    TestMethodName: 'testAssignOnFuture',
    NumLinesCovered: 0,
    NumLinesUncovered: 4
  }
];
