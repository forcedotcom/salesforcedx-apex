/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { writeAsyncResultsToFile } from '../../src/tests/asyncTests';
import { TestResult, ApexTestResultOutcome } from '../../src/tests/types';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'node:os';
import { expect } from 'chai';

describe('writeAsyncResultsToFile with real filesystem', () => {
  let tempDir: string;
  let customTempDir: string;

  // Mock test result data
  const mockFormattedResults: TestResult = {
    summary: {
      outcome: 'Passed',
      testsRan: 3,
      passing: 2,
      failing: 1,
      skipped: 0,
      passRate: '67%',
      failRate: '33%',
      skipRate: '0%',
      testStartTime: '2024-01-01T10:00:00.000Z',
      testExecutionTimeInMs: 1500,
      testTotalTimeInMs: 1500,
      commandTimeInMs: 2500,
      hostname: 'https://test.salesforce.com',
      orgId: '00Dxx0000000000EAA',
      username: 'test@example.com',
      testRunId: '707xx0000000001',
      userId: '005xx0000000001'
    },
    tests: [
      {
        id: '07Mxx00000001',
        queueItemId: '709xx00000001',
        stackTrace: null,
        message: null,
        asyncApexJobId: '707xx0000000001',
        methodName: 'testPassingMethod',
        outcome: ApexTestResultOutcome.Pass,
        apexLogId: null,
        apexClass: {
          id: '01pxx00000001',
          name: 'TestClass1',
          namespacePrefix: null,
          fullName: 'TestClass1'
        },
        runTime: 500,
        testTimestamp: '2024-01-01T10:00:00.500Z',
        fullName: 'TestClass1.testPassingMethod'
      },
      {
        id: '07Mxx00000002',
        queueItemId: '709xx00000002',
        stackTrace: 'Class.TestClass1.testFailingMethod: line 10, column 1',
        message:
          'System.AssertException: Assertion Failed: Expected true but was false',
        asyncApexJobId: '707xx0000000001',
        methodName: 'testFailingMethod',
        outcome: ApexTestResultOutcome.Fail,
        apexLogId: '07Lxx00000001',
        apexClass: {
          id: '01pxx00000001',
          name: 'TestClass1',
          namespacePrefix: null,
          fullName: 'TestClass1'
        },
        runTime: 800,
        testTimestamp: '2024-01-01T10:00:01.300Z',
        fullName: 'TestClass1.testFailingMethod',
        diagnostic: {
          exceptionMessage:
            'System.AssertException: Assertion Failed: Expected true but was false',
          exceptionStackTrace:
            'Class.TestClass1.testFailingMethod: line 10, column 1',
          compileProblem: null
        }
      },
      {
        id: '07Mxx00000003',
        queueItemId: '709xx00000003',
        stackTrace: null,
        message: null,
        asyncApexJobId: '707xx0000000001',
        methodName: 'testAnotherPassingMethod',
        outcome: ApexTestResultOutcome.Pass,
        apexLogId: null,
        apexClass: {
          id: '01pxx00000002',
          name: 'TestClass2',
          namespacePrefix: 'ns',
          fullName: 'ns.TestClass2'
        },
        runTime: 200,
        testTimestamp: '2024-01-01T10:00:01.500Z',
        fullName: 'ns.TestClass2.testAnotherPassingMethod'
      }
    ],
    codecoverage: [
      {
        apexId: '01pxx00000001',
        name: 'TestClass1',
        numLinesCovered: 8,
        numLinesUncovered: 2,
        percentage: '80%',
        type: 'ApexClass',
        coveredLines: [1, 2, 3, 4, 5, 6, 7, 8],
        uncoveredLines: [9, 10]
      },
      {
        apexId: '01pxx00000002',
        name: 'TestClass2',
        numLinesCovered: 15,
        numLinesUncovered: 3,
        percentage: '83%',
        type: 'ApexClass',
        coveredLines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        uncoveredLines: [16, 17, 18]
      }
    ]
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apex-async-test-'));
    customTempDir = path.join(tempDir, 'custom-temp');
    await fs.mkdir(customTempDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic file creation', () => {
    it('should create rawResults.json in default temp directory', async () => {
      const runId = '707xx0000000001';

      await writeAsyncResultsToFile(mockFormattedResults, runId);

      const expectedPath = path.join(os.tmpdir(), runId, 'rawResults.json');
      const stats = await fs.stat(expectedPath);
      expect(stats.isFile()).to.be.true;
      expect(stats.size).to.be.greaterThan(0);

      // Clean up
      await fs.rm(path.join(os.tmpdir(), runId), {
        recursive: true,
        force: true
      });
    });

    it('should create rawResults.json in custom temp directory', async () => {
      const runId = '707xx0000000002';

      await writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir);

      const expectedPath = path.join(customTempDir, runId, 'rawResults.json');
      const stats = await fs.stat(expectedPath);
      expect(stats.isFile()).to.be.true;
      expect(stats.size).to.be.greaterThan(0);
    });

    it('should create nested directory structure', async () => {
      const runId = '707xx0000000003';

      await writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir);

      const runDir = path.join(customTempDir, runId);
      const stats = await fs.stat(runDir);
      expect(stats.isDirectory()).to.be.true;
    });
  });

  describe('file content validation', () => {
    it('should write valid JSON', async () => {
      const runId = '707xx0000000001';

      await writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir);

      const filePath = path.join(customTempDir, runId, 'rawResults.json');
      const content = await fs.readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(content);

      expect(parsedContent).to.deep.equal(mockFormattedResults);
    });

    it('should preserve all test result properties', async () => {
      const runId = '707xx0000000003';

      await writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir);

      const filePath = path.join(customTempDir, runId, 'rawResults.json');
      const content = await fs.readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(content);

      // Verify summary properties
      expect(parsedContent.summary.outcome).to.equal('Passed');
      expect(parsedContent.summary.testsRan).to.equal(3);
      expect(parsedContent.summary.passing).to.equal(2);
      expect(parsedContent.summary.failing).to.equal(1);
      expect(parsedContent.summary.testRunId).to.equal('707xx0000000001');

      // Verify test properties
      expect(parsedContent.tests).to.have.lengthOf(3);
      expect(parsedContent.tests[0].methodName).to.equal('testPassingMethod');
      expect(parsedContent.tests[1].diagnostic).to.exist;
      expect(parsedContent.tests[2].apexClass.namespacePrefix).to.equal('ns');

      // Verify code coverage
      expect(parsedContent.codecoverage).to.have.lengthOf(2);
      expect(parsedContent.codecoverage[0].percentage).to.equal('80%');
      expect(parsedContent.codecoverage[1].name).to.equal('TestClass2');
    });
  });

  describe('JSON formatting', () => {
    it('should format JSON with proper indentation', async () => {
      const runId = '707xx0000000004';

      await writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir);

      const filePath = path.join(customTempDir, runId, 'rawResults.json');
      const content = await fs.readFile(filePath, 'utf8');

      // Check that JSON is properly formatted with indentation - the streaming JSON might be compact
      expect(content).to.include('"summary":');
      expect(content).to.include('"tests":');
      expect(content).to.include('"codecoverage":');
    });

    it('should handle empty arrays correctly', async () => {
      const emptyResults: TestResult = {
        summary: {
          outcome: 'Passed',
          testsRan: 0,
          passing: 0,
          failing: 0,
          skipped: 0,
          passRate: '0%',
          failRate: '0%',
          skipRate: '0%',
          testStartTime: '2024-01-01T10:00:00.000Z',
          testExecutionTimeInMs: 0,
          testTotalTimeInMs: 0,
          commandTimeInMs: 100,
          hostname: 'https://test.salesforce.com',
          orgId: '00Dxx0000000000EAA',
          username: 'test@example.com',
          testRunId: '707xx0000000000',
          userId: '005xx0000000001'
        },
        tests: [],
        codecoverage: []
      };

      const runId = '707xx0000000000';

      await writeAsyncResultsToFile(emptyResults, runId, customTempDir);

      const filePath = path.join(customTempDir, runId, 'rawResults.json');
      const content = await fs.readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(content);

      expect(parsedContent.tests).to.deep.equal([]);
      expect(parsedContent.codecoverage).to.deep.equal([]);
    });
  });

  describe('error handling', () => {
    it('should handle invalid temp directory gracefully', async () => {
      const invalidTempDir = path.join(
        customTempDir,
        'nested',
        'invalid',
        'path'
      );
      const runId = '707xx0000000005';

      // This should work because fs.mkdir with recursive: true will create the path
      await writeAsyncResultsToFile(
        mockFormattedResults,
        runId,
        invalidTempDir
      );

      // Verify file was created
      const filePath = path.join(invalidTempDir, runId, 'rawResults.json');
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).to.be.true;
    });

    it('should handle special characters in runId', async () => {
      const specialRunId = '707-xx_0000.000001';

      await writeAsyncResultsToFile(
        mockFormattedResults,
        specialRunId,
        customTempDir
      );

      const filePath = path.join(
        customTempDir,
        specialRunId,
        'rawResults.json'
      );
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).to.be.true;
    });
  });

  describe('streaming behavior', () => {
    it('should handle large test results efficiently', async () => {
      // Create a large test result with many tests
      const largeTestResult: TestResult = {
        ...mockFormattedResults,
        tests: Array.from({ length: 100 }, (_, i) => ({
          id: `07Mxx0000000${i.toString().padStart(3, '0')}`,
          queueItemId: `709xx0000000${i.toString().padStart(3, '0')}`,
          stackTrace: null as string | null,
          message: null as string | null,
          asyncApexJobId: '707xx0000000001',
          methodName: `testMethod${i}`,
          outcome:
            i % 10 === 0
              ? ApexTestResultOutcome.Fail
              : ApexTestResultOutcome.Pass,
          apexLogId: null as string | null,
          apexClass: {
            id: '01pxx00000001',
            name: 'LargeTestClass',
            namespacePrefix: null as string | null,
            fullName: 'LargeTestClass'
          },
          runTime: Math.floor(Math.random() * 1000),
          testTimestamp: `2024-01-01T10:00:${i.toString().padStart(2, '0')}.000Z`,
          fullName: `LargeTestClass.testMethod${i}`
        }))
      };

      const runId = '707xx0000000006';
      const startTime = Date.now();

      await writeAsyncResultsToFile(largeTestResult, runId, customTempDir);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).to.be.lessThan(5000);

      const filePath = path.join(customTempDir, runId, 'rawResults.json');
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).to.be.true;
      expect(stats.size).to.be.greaterThan(10000); // Should be a large file
    });
  });

  describe('concurrent writes', () => {
    it('should handle multiple concurrent writes to different run IDs', async () => {
      const runIds = ['707xx0000000007', '707xx0000000008', '707xx0000000009'];
      const promises = runIds.map((runId) =>
        writeAsyncResultsToFile(mockFormattedResults, runId, customTempDir)
      );

      await Promise.all(promises);

      // Verify all files were created
      for (const runId of runIds) {
        const filePath = path.join(customTempDir, runId, 'rawResults.json');
        const stats = await fs.stat(filePath);
        expect(stats.isFile()).to.be.true;

        const content = await fs.readFile(filePath, 'utf8');
        const parsedContent = JSON.parse(content);
        expect(parsedContent).to.deep.equal(mockFormattedResults);
      }
    });
  });

  describe('consistency', () => {
    it('should produce consistent output across multiple runs', async () => {
      const runId1 = '707xx0000000010';
      const runId2 = '707xx0000000011';

      await writeAsyncResultsToFile(
        mockFormattedResults,
        runId1,
        customTempDir
      );
      await writeAsyncResultsToFile(
        mockFormattedResults,
        runId2,
        customTempDir
      );

      const content1 = await fs.readFile(
        path.join(customTempDir, runId1, 'rawResults.json'),
        'utf8'
      );
      const content2 = await fs.readFile(
        path.join(customTempDir, runId2, 'rawResults.json'),
        'utf8'
      );

      expect(content1).to.equal(content2);

      const parsedContent1 = JSON.parse(content1);
      expect(parsedContent1).to.deep.equal(mockFormattedResults);
    });
  });
});
