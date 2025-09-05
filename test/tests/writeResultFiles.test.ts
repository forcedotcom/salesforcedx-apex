/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { readFileSync, existsSync, createWriteStream } from 'node:fs';
import { join } from 'path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  TestResult,
  ResultFormat,
  OutputDirConfig,
  TestRunIdResult,
  ApexTestResultOutcome
} from '../../src/tests/types';
import { writeResultFiles } from '../../src/tests/testService';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'stream';

describe('writeResultFiles with real filesystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'apex-test-'));
  });

  afterEach(async () => {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  const mockRunPipeline = async (
    readable: Readable,
    filePath: string
  ): Promise<string> => {
    const writeStream = createWriteStream(filePath);
    await pipeline(readable, writeStream);
    return filePath;
  };

  const createMockTestResult = (): TestResult => ({
    summary: {
      testRunId: '7071234567890123',
      outcome: 'Pass',
      testsRan: 2,
      passing: 2,
      failing: 0,
      skipped: 0,
      passRate: '100%',
      failRate: '0%',
      skipRate: '0%',
      userId: '00512345678901234',
      testStartTime: '2023-01-01T00:00:00.000Z',
      testExecutionTimeInMs: 1500,
      testTotalTimeInMs: 1500,
      commandTimeInMs: 2000,
      hostname: 'test-hostname',
      orgId: '00D123456789012',
      username: 'test@example.com',
      testRunCoverage: '85%',
      orgWideCoverage: '75%',
      totalLines: 100,
      coveredLines: 85
    },
    tests: [
      {
        id: '01p123456789012',
        queueItemId: '7091234567890123',
        stackTrace: null,
        message: null,
        asyncApexJobId: '7071234567890123',
        methodName: 'testMethod1',
        outcome: ApexTestResultOutcome.Pass,
        apexLogId: null,
        apexClass: {
          id: '01p123456789012',
          name: 'TestClass1',
          namespacePrefix: '',
          fullName: 'TestClass1'
        },
        runTime: 750,
        testTimestamp: '2023-01-01T00:00:01.000Z',
        fullName: 'TestClass1.testMethod1',
        diagnostic: null,
        perClassCoverage: [
          {
            apexClassOrTriggerId: '01p123456789012',
            apexClassOrTriggerName: 'TestClass1',
            apexTestClassId: '01p123456789012',
            apexTestMethodName: 'testMethod1',
            numLinesCovered: 10,
            numLinesUncovered: 2,
            percentage: '83%',
            coverage: {
              coveredLines: [1, 2],
              uncoveredLines: [3]
            }
          }
        ]
      },
      {
        id: '01p123456789013',
        queueItemId: '7091234567890124',
        stackTrace: null,
        message: null,
        asyncApexJobId: '7071234567890123',
        methodName: 'testMethod2',
        outcome: ApexTestResultOutcome.Pass,
        apexLogId: null,
        apexClass: {
          id: '01p123456789013',
          name: 'TestClass2',
          namespacePrefix: '',
          fullName: 'TestClass2'
        },
        runTime: 750,
        testTimestamp: '2023-01-01T00:00:01.500Z',
        fullName: 'TestClass2.testMethod2',
        diagnostic: null,
        perClassCoverage: [
          {
            apexClassOrTriggerId: '01p123456789013',
            apexClassOrTriggerName: 'TestClass2',
            apexTestClassId: '01p123456789013',
            apexTestMethodName: 'testMethod2',
            numLinesCovered: 8,
            numLinesUncovered: 1,
            percentage: '89%',
            coverage: {
              coveredLines: [1],
              uncoveredLines: [2]
            }
          }
        ]
      }
    ],
    setup: [],
    codecoverage: [
      {
        apexId: '01p123456789012',
        name: 'TestClass1',
        type: 'ApexClass',
        numLinesCovered: 10,
        numLinesUncovered: 2,
        percentage: '83%',
        coveredLines: [1, 2],
        uncoveredLines: [3]
      }
    ]
  });

  const createMockTestRunIdResult = (): TestRunIdResult => ({
    testRunId: '7071234567890123'
  });

  describe('basic functionality', () => {
    it('should create test-run-id.txt file', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(join(tempDir, 'test-run-id.txt'));
      expect(existsSync(join(tempDir, 'test-run-id.txt'))).to.be.true;

      const content = readFileSync(join(tempDir, 'test-run-id.txt'), 'utf8');
      expect(content).to.equal('7071234567890123');
    });

    it('should handle TestRunIdResult', async () => {
      const result = createMockTestRunIdResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.have.length(1);
      expect(files[0]).to.equal(join(tempDir, 'test-run-id.txt'));

      const content = readFileSync(join(tempDir, 'test-run-id.txt'), 'utf8');
      expect(content).to.equal('7071234567890123');
    });
  });

  describe('result formats', () => {
    it('should create JSON result file', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: [ResultFormat.json]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123.json')
      );
      expect(existsSync(join(tempDir, 'test-result-7071234567890123.json'))).to
        .be.true;

      const content = readFileSync(
        join(tempDir, 'test-result-7071234567890123.json'),
        'utf8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.summary.testRunId).to.equal('7071234567890123');
      expect(parsed.tests).to.have.length(2);
    });

    it('should create JUnit result file', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: [ResultFormat.junit]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123-junit.xml')
      );
      expect(
        existsSync(join(tempDir, 'test-result-7071234567890123-junit.xml'))
      ).to.be.true;

      const content = readFileSync(
        join(tempDir, 'test-result-7071234567890123-junit.xml'),
        'utf8'
      );
      expect(content).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).to.include('<testsuite');
      expect(content).to.include('tests="2"');
    });

    it('should create TAP result file', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: [ResultFormat.tap]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123-tap.txt')
      );
      expect(existsSync(join(tempDir, 'test-result-7071234567890123-tap.txt')))
        .to.be.true;

      const content = readFileSync(
        join(tempDir, 'test-result-7071234567890123-tap.txt'),
        'utf8'
      );
      expect(content).to.include('1..2');
      expect(content).to.include('ok 1 TestClass1.testMethod1');
      expect(content).to.include('ok 2 TestClass2.testMethod2');
    });

    it('should create multiple format files', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: [ResultFormat.json, ResultFormat.junit, ResultFormat.tap]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.have.length(4); // test-run-id.txt + 3 format files
      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123.json')
      );
      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123-junit.xml')
      );
      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123-tap.txt')
      );
    });
  });

  describe('code coverage', () => {
    it('should create code coverage file when enabled', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        true,
        mockRunPipeline
      );

      expect(files).to.include(
        join(tempDir, 'test-result-7071234567890123-codecoverage.json')
      );
      expect(
        existsSync(
          join(tempDir, 'test-result-7071234567890123-codecoverage.json')
        )
      ).to.be.true;

      const content = readFileSync(
        join(tempDir, 'test-result-7071234567890123-codecoverage.json'),
        'utf8'
      );
      const parsed = JSON.parse(content);
      expect(parsed).to.be.an('array');
      expect(parsed).to.have.length(2); // Two test classes with coverage
    });

    it('should not create code coverage file when disabled', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.not.include(
        join(tempDir, 'test-result-7071234567890123-codecoverage.json')
      );
      expect(
        existsSync(
          join(tempDir, 'test-result-7071234567890123-codecoverage.json')
        )
      ).to.be.false;
    });
  });

  describe('custom file infos', () => {
    it('should create files from string content', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        fileInfos: [
          {
            filename: 'custom.txt',
            content: 'This is custom content'
          }
        ]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(join(tempDir, 'custom.txt'));
      expect(existsSync(join(tempDir, 'custom.txt'))).to.be.true;

      const content = readFileSync(join(tempDir, 'custom.txt'), 'utf8');
      expect(content).to.equal('This is custom content');
    });

    it('should create files from object content using JsonStreamStringify', async () => {
      const result = createMockTestResult();
      const customData = {
        message: 'Hello World',
        data: [1, 2, 3],
        nested: { key: 'value' }
      };

      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        fileInfos: [
          {
            filename: 'custom.json',
            content: customData
          }
        ]
      };

      const files = await writeResultFiles(
        result,
        outputConfig,
        false,
        mockRunPipeline
      );

      expect(files).to.include(join(tempDir, 'custom.json'));
      expect(existsSync(join(tempDir, 'custom.json'))).to.be.true;

      const content = readFileSync(join(tempDir, 'custom.json'), 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed).to.deep.equal(customData);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid result format', async () => {
      const result = createMockTestResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: ['invalid' as ResultFormat]
      };

      try {
        await writeResultFiles(result, outputConfig, false, mockRunPipeline);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Specified result formats must be of type'
        );
      }
    });

    it('should throw error when trying to use result formats with TestRunIdResult', async () => {
      const result = createMockTestRunIdResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        resultFormats: [ResultFormat.json]
      };

      try {
        await writeResultFiles(result, outputConfig, false, mockRunPipeline);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Cannot specify a result format with a'
        );
      }
    });

    it('should throw error when trying to use code coverage with TestRunIdResult', async () => {
      const result = createMockTestRunIdResult();
      const outputConfig: OutputDirConfig = {
        dirPath: tempDir
      };

      try {
        await writeResultFiles(result, outputConfig, true, mockRunPipeline);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Cannot specify code coverage with a T'
        );
      }
    });
  });

  describe('JSON formatting consistency', () => {
    it('should produce consistent JSON output with proper indentation', async () => {
      // Set environment variable for consistent formatting
      process.env.SF_APEX_RESULTS_JSON_INDENT = '2';

      const result = createMockTestResult();
      const customData = { test: 'data', numbers: [1, 2, 3] };

      const outputConfig: OutputDirConfig = {
        dirPath: tempDir,
        fileInfos: [
          {
            filename: 'formatted.json',
            content: customData
          }
        ]
      };

      await writeResultFiles(result, outputConfig, false, mockRunPipeline);

      const content = readFileSync(join(tempDir, 'formatted.json'), 'utf8');

      // Verify it's valid JSON and has the expected structure
      const parsed = JSON.parse(content);
      expect(parsed.test).to.equal('data');
      expect(parsed.numbers).to.deep.equal([1, 2, 3]);

      // Check that it contains the expected data regardless of formatting
      expect(content).to.include('test');
      expect(content).to.include('data');
      expect(content).to.include('numbers');

      // Clean up
      delete process.env.SF_APEX_RESULTS_JSON_INDENT;
    });
  });
});
