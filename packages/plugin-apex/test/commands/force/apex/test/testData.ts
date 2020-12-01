/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export const testRunSimple = {
  summary: {
    failRate: '0%',
    testsRan: 1,
    orgId: '00D4xx00000FH4IEAW',
    outcome: 'Completed',
    passRate: '100%',
    skipRate: '0%',
    testStartTime: '2020-08-25T00:48:02.000+0000',
    testExecutionTime: '53 ms',
    testRunId: '707xx0000AUS2gH',
    userId: '005xx000000uEgSAAU',
    username: 'test@example.com'
  },
  tests: [
    {
      id: '07Mxx00000ErgiHUAR',
      queueItemId: '709xx000001IlUMQA0',
      stackTrace: null,
      message: null,
      asyncApexJobId: '707xx0000AUS2gHQQT',
      methodName: 'testConfig',
      outcome: 'Pass',
      apexLogId: null,
      apexClass: {
        id: '01pxx00000NWwb3AAD',
        name: 'MyApexTests',
        namespacePrefix: null,
        fullName: 'MyApexTests'
      },
      runTime: 53,
      testTimestamp: '2020-08-25T00:48:02.000+0000',
      fullName: 'MyApexTests.testConfig'
    }
  ]
};

export const runWithCoverage = {
  summary: {
    failRate: '0%',
    numTestsRan: 1,
    orgId: '00D4xx00000FH4IEAW',
    outcome: 'Completed',
    passRate: '100%',
    skipRate: '0%',
    testStartTime: '2020-08-25T00:48:02.000+0000',
    testExecutionTime: 53,
    testRunId: '707xx0000AUS2gH',
    userId: '005xx000000uEgSAAU',
    username: 'test@example.com',
    orgWideCoverage: '50%'
  },
  tests: [
    {
      id: '07Mxx00000ErgiHUAR',
      queueItemId: '709xx000001IlUMQA0',
      stackTrace: null,
      message: null,
      asyncApexJobId: '707xx0000AUS2gHQQT',
      methodName: 'testConfig',
      outcome: 'Pass',
      apexLogId: null,
      apexClass: {
        id: '01pxx00000NWwb3AAD',
        name: 'MyApexTests',
        namespacePrefix: null,
        fullName: 'MyApexTests'
      },
      runTime: 53,
      testTimestamp: '2020-08-25T00:48:02.000+0000',
      fullName: 'MyApexTests.testConfig',
      perTestCoverage: {
        apexTestClassId: '01pxx00000NnP2KQAV',
        apexClassOrTriggerName: 'ApexClassExample',
        apexClassOrTriggerId: '01pxx00000avcNeAAL',
        apexTestMethodName: 'testAssignContains',
        numLinesCovered: 1,
        numLinesUncovered: 4,
        percentage: '20%',
        coverage: { coveredLines: [1], uncoveredLines: [2, 3, 4, 5] }
      }
    }
  ],
  codecoverage: [
    {
      apexId: '01pxx00000NWwb3AAF',
      name: 'testClass',
      type: 'ApexClass',
      numLinesCovered: 1,
      numLinesUncovered: 4,
      percentage: '20%',
      coveredLines: [1],
      uncoveredLines: [2, 3, 4, 5]
    }
  ]
};

export const jsonResult = {
  status: 0,
  result: {
    summary: {
      failRate: '0%',
      testsRan: 1,
      orgId: '00D4xx00000FH4IEAW',
      outcome: 'Completed',
      passRate: '100%',
      skipRate: '0%',
      testStartTime: '2020-08-25T00:48:02.000+0000',
      testExecutionTime: '53 ms',
      testRunId: '707xx0000AUS2gH',
      userId: '005xx000000uEgSAAU',
      username: 'test@example.com'
    },
    tests: [
      {
        Id: '07Mxx00000ErgiHUAR',
        QueueItemId: '709xx000001IlUMQA0',
        StackTrace: null,
        Message: null,
        AsyncApexJobId: '707xx0000AUS2gHQQT',
        MethodName: 'testConfig',
        Outcome: 'Pass',
        ApexClass: {
          Id: '01pxx00000NWwb3AAD',
          Name: 'MyApexTests',
          NamespacePrefix: null
        },
        RunTime: 53,
        FullName: 'MyApexTests.testConfig'
      }
    ]
  }
};

export const jsonWithCoverage = {
  result: {
    coverage: {
      coverage: [
        {
          coveredPercent: 20,
          id: '01pxx00000NWwb3AAF',
          lines: {
            0: 1
          },
          name: 'testClass',
          totalCovered: 1,
          totalLines: 5
        }
      ],
      records: [
        {
          ApexClassOrTrigger: {
            Id: '01pxx00000avcNeAAL',
            Name: 'ApexClassExample'
          },
          ApexTestClass: {
            Id: '07Mxx00000ErgiHUAR',
            Name: 'MyApexTests'
          },
          Coverage: {
            coveredLines: [1],
            uncoveredLines: [2, 3, 4, 5]
          },
          NumLinesCovered: 1,
          NumLinesUncovered: 4,
          TestMethodName: 'testConfig'
        }
      ],
      summary: {
        orgWideCoverage: '50%'
      }
    },
    summary: {
      failRate: '0%',
      numTestsRan: 1,
      orgId: '00D4xx00000FH4IEAW',
      orgWideCoverage: '50%',
      outcome: 'Completed',
      passRate: '100%',
      skipRate: '0%',
      testExecutionTime: 53,
      testRunId: '707xx0000AUS2gH',
      testStartTime: '2020-08-25T00:48:02.000+0000',
      userId: '005xx000000uEgSAAU',
      username: 'test@example.com'
    },
    tests: [
      {
        ApexClass: {
          Id: '01pxx00000NWwb3AAD',
          Name: 'MyApexTests',
          NamespacePrefix: null
        },
        AsyncApexJobId: '707xx0000AUS2gHQQT',
        FullName: 'MyApexTests.testConfig',
        Id: '07Mxx00000ErgiHUAR',
        Message: null,
        MethodName: 'testConfig',
        Outcome: 'Pass',
        QueueItemId: '709xx000001IlUMQA0',
        RunTime: 53,
        StackTrace: null
      }
    ]
  },
  status: 0
};
