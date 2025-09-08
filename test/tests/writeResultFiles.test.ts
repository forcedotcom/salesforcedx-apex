/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { writeResultFiles } from '../../src/tests/testService';
import {
  TestResult,
  TestRunIdResult,
  OutputDirConfig,
  ResultFormat,
  ApexTestResultOutcome
} from '../../src/tests/types';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'node:os';
import { expect } from 'chai';

describe('writeResultFiles with real filesystem', () => {
  let tempDir: string;
  let outputDir: string;

  // Mock test data
  const mockTestResult: TestResult = {
    summary: {
      outcome: 'Passed',
      testsRan: 2,
      passing: 2,
      failing: 0,
      skipped: 0,
      passRate: '100%',
      failRate: '0%',
      skipRate: '0%',
      testStartTime: '2024-01-01T10:00:00.000Z',
      testExecutionTimeInMs: 1000,
      testTotalTimeInMs: 1000,
      commandTimeInMs: 2000,
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
        methodName: 'testMethod1',
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
        fullName: 'TestClass1.testMethod1'
      },
      {
        id: '07Mxx00000002',
        queueItemId: '709xx00000002',
        stackTrace: null,
        message: null,
        asyncApexJobId: '707xx0000000001',
        methodName: 'testMethod2',
        outcome: ApexTestResultOutcome.Pass,
        apexLogId: null,
        apexClass: {
          id: '01pxx00000001',
          name: 'TestClass1',
          namespacePrefix: null,
          fullName: 'TestClass1'
        },
        runTime: 500,
        testTimestamp: '2024-01-01T10:00:01.000Z',
        fullName: 'TestClass1.testMethod2'
      }
    ],
    codecoverage: []
  };

  const mockTestResultWithCoverage: TestResult = {
    ...mockTestResult,
    codecoverage: [
      {
        apexId: '01pxx00000001',
        name: 'TestClass1',
        numLinesCovered: 10,
        numLinesUncovered: 2,
        percentage: '83%',
        type: 'ApexClass',
        coveredLines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        uncoveredLines: [11, 12]
      }
    ]
  };

  const mockTestRunIdResult: TestRunIdResult = {
    testRunId: '707xx0000000001'
  };

  // Pipeline function that writes to filesystem
  const realPipeline = async (
    readable: Readable,
    filePath: string,
    transform?: Transform
  ): Promise<string> => {
    const writable = createWriteStream(filePath, 'utf8');
    if (transform) {
      await pipeline(readable, transform, writable);
    } else {
      await pipeline(readable, writable);
    }
    return filePath;
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apex-test-'));
    outputDir = path.join(tempDir, 'output');
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic file creation', () => {
    it('should create test-run-id.txt file', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(1);
      expect(filesWritten[0]).to.equal(path.join(outputDir, 'test-run-id.txt'));

      const content = await fs.readFile(
        path.join(outputDir, 'test-run-id.txt'),
        'utf8'
      );
      expect(content).to.equal('707xx0000000001');
    });

    it('should create test-run-id.txt for TestRunIdResult', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir
      };

      const filesWritten = await writeResultFiles(
        mockTestRunIdResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(1);
      expect(filesWritten[0]).to.equal(path.join(outputDir, 'test-run-id.txt'));

      const content = await fs.readFile(
        path.join(outputDir, 'test-run-id.txt'),
        'utf8'
      );
      expect(content).to.equal('707xx0000000001');
    });
  });

  describe('result format files', () => {
    it('should create JSON result file', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.json]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(2); // test-run-id.txt + json file
      expect(filesWritten).to.include(path.join(outputDir, 'test-run-id.txt'));
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001.json')
      );

      const jsonContent = await fs.readFile(
        path.join(outputDir, 'test-result-707xx0000000001.json'),
        'utf8'
      );
      const parsedJson = JSON.parse(jsonContent);

      // Verify JSON structure is correct
      expect(parsedJson.summary).to.exist;
      expect(parsedJson.tests).to.be.an('array');
      expect(parsedJson.codecoverage).to.be.an('array');
      expect(parsedJson.summary.testRunId).to.equal('707xx0000000001');
      expect(parsedJson.tests).to.have.lengthOf(2);
    });

    it('should create TAP result file', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.tap]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(2);
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-tap.txt')
      );

      const tapContent = await fs.readFile(
        path.join(outputDir, 'test-result-707xx0000000001-tap.txt'),
        'utf8'
      );

      // Verify TAP format basics
      expect(tapContent).to.include('1..2'); // TAP plan
      expect(tapContent).to.include('ok 1'); // First test
      expect(tapContent).to.include('ok 2'); // Second test
    });

    it('should create JUnit result file', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.junit]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(2);
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-junit.xml')
      );

      const junitContent = await fs.readFile(
        path.join(outputDir, 'test-result-707xx0000000001-junit.xml'),
        'utf8'
      );

      // Verify JUnit XML format basics
      expect(junitContent).to.include('<?xml version="1.0"');
      expect(junitContent).to.include('<testsuites');
      expect(junitContent).to.include('<testsuite');
      expect(junitContent).to.include('<testcase');
    });

    it('should create all result formats simultaneously', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.json, ResultFormat.tap, ResultFormat.junit]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(4); // test-run-id.txt + 3 format files
      expect(filesWritten).to.include(path.join(outputDir, 'test-run-id.txt'));
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001.json')
      );
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-tap.txt')
      );
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-junit.xml')
      );

      // Verify all files exist and have content
      for (const filePath of filesWritten) {
        const stats = await fs.stat(filePath);
        expect(stats.isFile()).to.be.true;
        expect(stats.size).to.be.greaterThan(0);
      }
    });
  });

  describe('code coverage files', () => {
    it('should create code coverage file', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir
      };

      const filesWritten = await writeResultFiles(
        mockTestResultWithCoverage,
        config,
        true,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(2);
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-codecoverage.json')
      );

      const coverageContent = await fs.readFile(
        path.join(outputDir, 'test-result-707xx0000000001-codecoverage.json'),
        'utf8'
      );
      const parsedCoverage = JSON.parse(coverageContent);

      // Verify code coverage structure - should be empty array since tests don't have perClassCoverage
      expect(parsedCoverage).to.be.an('array');
    });

    it('should create code coverage with result formats', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.json]
      };

      const filesWritten = await writeResultFiles(
        mockTestResultWithCoverage,
        config,
        true,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(3); // test-run-id.txt + json + codecoverage
      expect(filesWritten).to.include(
        path.join(outputDir, 'test-result-707xx0000000001-codecoverage.json')
      );
    });
  });

  describe('custom file infos', () => {
    it('should create custom files from fileInfos with string content', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        fileInfos: [
          { filename: 'custom-string.txt', content: 'Hello, World!' },
          { filename: 'custom-data.txt', content: 'Test data content' }
        ]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(3); // test-run-id.txt + 2 custom files
      expect(filesWritten).to.include(
        path.join(outputDir, 'custom-string.txt')
      );
      expect(filesWritten).to.include(path.join(outputDir, 'custom-data.txt'));

      const stringContent = await fs.readFile(
        path.join(outputDir, 'custom-string.txt'),
        'utf8'
      );
      expect(stringContent).to.equal('Hello, World!');

      const dataContent = await fs.readFile(
        path.join(outputDir, 'custom-data.txt'),
        'utf8'
      );
      expect(dataContent).to.equal('Test data content');
    });

    it('should create custom files from fileInfos with object content', async () => {
      const customObject = {
        metadata: {
          version: '1.0',
          created: '2024-01-01'
        },
        data: [1, 2, 3, 4, 5]
      };

      const config: OutputDirConfig = {
        dirPath: outputDir,
        fileInfos: [{ filename: 'custom-object.json', content: customObject }]
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.include(
        path.join(outputDir, 'custom-object.json')
      );

      const objectContent = await fs.readFile(
        path.join(outputDir, 'custom-object.json'),
        'utf8'
      );
      const parsedObject = JSON.parse(objectContent);

      expect(parsedObject).to.deep.equal(customObject);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid result format', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: ['invalid' as ResultFormat]
      };

      try {
        await writeResultFiles(mockTestResult, config, false, realPipeline);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Specified result formats must be of type json, junit, or tap'
        );
      }
    });

    it('should throw error when using result formats with TestRunIdResult', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [ResultFormat.json]
      };

      try {
        await writeResultFiles(
          mockTestRunIdResult,
          config,
          false,
          realPipeline
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Cannot specify a result format with a TestRunId result'
        );
      }
    });

    it('should throw error when using code coverage with TestRunIdResult', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir
      };

      try {
        await writeResultFiles(mockTestRunIdResult, config, true, realPipeline);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include(
          'Cannot specify code coverage with a TestRunId result'
        );
      }
    });
  });

  describe('directory creation', () => {
    it('should create nested directories', async () => {
      const nestedDir = path.join(outputDir, 'nested', 'deep', 'structure');
      const config: OutputDirConfig = {
        dirPath: nestedDir
      };

      const filesWritten = await writeResultFiles(
        mockTestResult,
        config,
        false,
        realPipeline
      );

      expect(filesWritten).to.have.lengthOf(1);
      expect(filesWritten[0]).to.equal(path.join(nestedDir, 'test-run-id.txt'));

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).to.be.true;
    });
  });

  describe('comprehensive integration test', () => {
    it('should create all file types', async () => {
      const config: OutputDirConfig = {
        dirPath: outputDir,
        resultFormats: [
          ResultFormat.json,
          ResultFormat.tap,
          ResultFormat.junit
        ],
        fileInfos: [
          {
            filename: 'metadata.json',
            content: { testRun: 'comprehensive', timestamp: '2024-01-01' }
          },
          {
            filename: 'summary.txt',
            content: 'Comprehensive test run completed successfully'
          }
        ]
      };

      const filesWritten = await writeResultFiles(
        mockTestResultWithCoverage,
        config,
        true,
        realPipeline
      );

      // Should have: test-run-id.txt + json + tap + junit + codecoverage + 2 custom files = 7 files
      expect(filesWritten).to.have.lengthOf(7);

      // Verify all expected files exist
      const expectedFiles = [
        'test-run-id.txt',
        'test-result-707xx0000000001.json',
        'test-result-707xx0000000001-tap.txt',
        'test-result-707xx0000000001-junit.xml',
        'test-result-707xx0000000001-codecoverage.json',
        'metadata.json',
        'summary.txt'
      ];

      for (const expectedFile of expectedFiles) {
        const filePath = path.join(outputDir, expectedFile);
        expect(filesWritten).to.include(filePath);

        const stats = await fs.stat(filePath);
        expect(stats.isFile()).to.be.true;
        expect(stats.size).to.be.greaterThan(0);
      }

      // Verify file contents
      const jsonContent = await fs.readFile(
        path.join(outputDir, 'test-result-707xx0000000001.json'),
        'utf8'
      );
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson.summary.testRunId).to.equal('707xx0000000001');

      const metadataContent = await fs.readFile(
        path.join(outputDir, 'metadata.json'),
        'utf8'
      );
      const parsedMetadata = JSON.parse(metadataContent);
      expect(parsedMetadata.testRun).to.equal('comprehensive');

      const summaryContent = await fs.readFile(
        path.join(outputDir, 'summary.txt'),
        'utf8'
      );
      expect(summaryContent).to.equal(
        'Comprehensive test run completed successfully'
      );
    });
  });
});
