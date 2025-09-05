/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { writeAsyncResultsToFile } from '../../src/tests/asyncTests';

describe('writeAsyncResultsToFile with real filesystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'apex-async-test-'));
  });

  afterEach(async () => {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  const createMockFormattedResults = () => ({
    summary: {
      testRunId: '7071234567890123',
      outcome: 'Pass',
      testsRan: 3,
      passing: 2,
      failing: 1,
      skipped: 0,
      passRate: '67%',
      failRate: '33%',
      testStartTime: '2023-01-01T00:00:00.000Z',
      testExecutionTimeInMs: 2500,
      testTotalTimeInMs: 2500,
      commandTimeInMs: 3000,
      hostname: 'test-hostname',
      orgId: '00D123456789012',
      username: 'test@example.com'
    },
    tests: [
      {
        id: '01p123456789012',
        queueItemId: '7091234567890123',
        stackTrace: null,
        message: null,
        asyncApexJobId: '7071234567890123',
        methodName: 'testMethod1',
        outcome: 'Pass',
        apexLogId: null,
        apexClass: {
          id: '01p123456789012',
          name: 'TestClass1',
          namespacePrefix: '',
          fullName: 'TestClass1'
        },
        runTime: 1000,
        testTimestamp: '2023-01-01T00:00:01.000Z',
        fullName: 'TestClass1.testMethod1'
      },
      {
        id: '01p123456789013',
        queueItemId: '7091234567890124',
        stackTrace: 'System.AssertException: Assertion Failed',
        message: 'Test failed assertion',
        asyncApexJobId: '7071234567890123',
        methodName: 'testMethod2',
        outcome: 'Fail',
        apexLogId: '07L123456789012',
        apexClass: {
          id: '01p123456789013',
          name: 'TestClass2',
          namespacePrefix: '',
          fullName: 'TestClass2'
        },
        runTime: 1500,
        testTimestamp: '2023-01-01T00:00:02.500Z',
        fullName: 'TestClass2.testMethod2'
      },
      {
        id: '01p123456789014',
        queueItemId: '7091234567890125',
        stackTrace: null,
        message: null,
        asyncApexJobId: '7071234567890123',
        methodName: 'testMethod3',
        outcome: 'Pass',
        apexLogId: null,
        apexClass: {
          id: '01p123456789014',
          name: 'TestClass3',
          namespacePrefix: '',
          fullName: 'TestClass3'
        },
        runTime: 800,
        testTimestamp: '2023-01-01T00:00:03.300Z',
        fullName: 'TestClass3.testMethod3'
      }
    ],
    setup: []
  });

  describe('basic functionality', () => {
    it('should write formatted results to rawResults.json', async () => {
      const formattedResults = createMockFormattedResults();
      const runId = '7071234567890123';

      await writeAsyncResultsToFile(formattedResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      expect(existsSync(expectedPath)).to.be.true;

      const content = readFileSync(expectedPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.summary.testRunId).to.equal(runId);
      expect(parsed.tests).to.have.length(3);
      expect(parsed.summary.testsRan).to.equal(3);
      expect(parsed.summary.passing).to.equal(2);
      expect(parsed.summary.failing).to.equal(1);
    });

    it('should create directory structure if it does not exist', async () => {
      const formattedResults = createMockFormattedResults();
      const runId = 'new-test-run-id';

      await writeAsyncResultsToFile(formattedResults, runId, tempDir);

      const expectedDir = join(tempDir, runId);
      const expectedPath = join(expectedDir, 'rawResults.json');

      expect(existsSync(expectedDir)).to.be.true;
      expect(existsSync(expectedPath)).to.be.true;
    });

    it('should handle complex nested data structures', async () => {
      const complexResults = {
        ...createMockFormattedResults(),
        metadata: {
          version: '1.0.0',
          tags: ['integration', 'unit'],
          config: {
            timeout: 30000,
            retries: 3,
            environments: ['dev', 'staging', 'prod']
          }
        },
        diagnostics: [
          {
            level: 'INFO',
            message: 'Test execution started',
            timestamp: '2023-01-01T00:00:00.000Z'
          },
          {
            level: 'ERROR',
            message: 'Test assertion failed in TestClass2.testMethod2',
            timestamp: '2023-01-01T00:00:02.500Z',
            details: {
              expected: 'success',
              actual: 'failure',
              stackTrace: 'System.AssertException: Assertion Failed'
            }
          }
        ]
      };

      const runId = 'complex-test-run';
      await writeAsyncResultsToFile(complexResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      const content = readFileSync(expectedPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.metadata.version).to.equal('1.0.0');
      expect(parsed.metadata.tags).to.deep.equal(['integration', 'unit']);
      expect(parsed.metadata.config.environments).to.have.length(3);
      expect(parsed.diagnostics).to.have.length(2);
      expect(parsed.diagnostics[1].details.expected).to.equal('success');
    });
  });

  describe('JSON formatting', () => {
    it('should format JSON with proper indentation when SF_APEX_RESULTS_JSON_INDENT is set', async () => {
      // Set environment variable for consistent formatting
      process.env.SF_APEX_RESULTS_JSON_INDENT = '2';

      const formattedResults = createMockFormattedResults();
      const runId = 'formatted-test-run';

      await writeAsyncResultsToFile(formattedResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      const content = readFileSync(expectedPath, 'utf8');

      // Verify it's still valid JSON and has the expected structure
      const parsed = JSON.parse(content);
      expect(parsed.summary.testRunId).to.equal('7071234567890123'); // From mock data
      expect(parsed.tests).to.have.length(3);
      expect(parsed.summary.testsRan).to.equal(3);

      // Clean up
      delete process.env.SF_APEX_RESULTS_JSON_INDENT;
    });

    it('should handle undefined indentation gracefully', async () => {
      // Ensure no indentation env var is set
      delete process.env.SF_APEX_RESULTS_JSON_INDENT;

      const formattedResults = { simple: 'data', array: [1, 2, 3] };
      const runId = 'no-indent-test';

      await writeAsyncResultsToFile(formattedResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      const content = readFileSync(expectedPath, 'utf8');

      // Should still be valid JSON
      const parsed = JSON.parse(content);
      expect(parsed.simple).to.equal('data');
      expect(parsed.array).to.deep.equal([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty results object', async () => {
      const emptyResults = {};
      const runId = 'empty-test-run';

      await writeAsyncResultsToFile(emptyResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      const content = readFileSync(expectedPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed).to.deep.equal({});
    });

    it('should handle results with null values', async () => {
      const resultsWithNulls = {
        summary: {
          testRunId: 'null-test-run',
          outcome: null,
          testsRan: 0,
          failing: null
        },
        tests: null,
        setup: null
      };
      const runId = 'null-values-test';

      await writeAsyncResultsToFile(resultsWithNulls, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      const content = readFileSync(expectedPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.summary.outcome).to.be.null;
      expect(parsed.tests).to.be.null;
      expect(parsed.setup).to.be.null;
    });

    it('should handle very large data structures', async () => {
      // Create a larger dataset to test streaming behavior
      const largeResults = {
        summary: createMockFormattedResults().summary,
        tests: Array(1000)
          .fill(null)
          .map((_, index) => ({
            id: `01p${String(index).padStart(12, '0')}`,
            queueItemId: `709${String(index).padStart(12, '0')}`,
            methodName: `testMethod${index}`,
            outcome: index % 10 === 0 ? 'Fail' : 'Pass',
            fullName: `TestClass${Math.floor(index / 10)}.testMethod${index}`,
            runTime: Math.floor(Math.random() * 2000) + 100
          })),
        setup: []
      };

      const runId = 'large-dataset-test';
      await writeAsyncResultsToFile(largeResults, runId, tempDir);

      const expectedPath = join(tempDir, runId, 'rawResults.json');
      expect(existsSync(expectedPath)).to.be.true;

      const content = readFileSync(expectedPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.tests).to.have.length(1000);
      expect(parsed.tests[0].methodName).to.equal('testMethod0');
      expect(parsed.tests[999].methodName).to.equal('testMethod999');
    });
  });

  describe('file system consistency', () => {
    it('should produce identical output for identical input', async () => {
      const formattedResults = createMockFormattedResults();
      const runId1 = 'consistency-test-1';
      const runId2 = 'consistency-test-2';

      // Write the same data twice
      await writeAsyncResultsToFile(formattedResults, runId1, tempDir);
      await writeAsyncResultsToFile(formattedResults, runId2, tempDir);

      const content1 = readFileSync(
        join(tempDir, runId1, 'rawResults.json'),
        'utf8'
      );
      const content2 = readFileSync(
        join(tempDir, runId2, 'rawResults.json'),
        'utf8'
      );

      // Content should be identical
      expect(content1).to.equal(content2);

      // Both should parse to the same object
      const parsed1 = JSON.parse(content1);
      const parsed2 = JSON.parse(content2);
      expect(parsed1).to.deep.equal(parsed2);
    });
  });
});
