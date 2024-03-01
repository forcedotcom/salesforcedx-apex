/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { OutputDirConfig, ResultFormat, TestService } from '../src';
import { Connection } from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'node:path';
import { generateTestResult } from './makeAMess';

// Create a new TestService instance
const testService = new TestService({} as Connection);

// const testResult = generateTestResult(2, 2);
const testResult = generateTestResult(500_000, 500_000);

// Create an OutputDirConfig object
console.log(
  `v8 heapTotal: ${process.memoryUsage().heapTotal} heapUsed: ${
    process.memoryUsage().heapUsed
  }`
);
const outputDirConfig = {
  dirPath: path.join(__dirname, '..', '..', 'test-results'),
  resultFormats: [ResultFormat.json],
  fileInfos: [
    // {
    //   filename: 'file1.txt',
    //   content: 'This is a string content'
    // },
    // {
    //   filename: 'file2.json',
    //   content: { key1: 'value1', key2: 'value2' } // JSON map
    // },
    // {
    //   filename: 'file3.json',
    //   content: ['item1', 'item2', 'item3'] // Array
    // }
  ]
} as OutputDirConfig;

fs.mkdirSync(outputDirConfig.dirPath, {
  recursive: true
});

// Call the writeResultFilesNew method
testService
  .writeResultFilesNew(testResult, outputDirConfig)
  .then((filesWritten) => console.log('Files written:', filesWritten))
  .catch((err) => console.error('An error occurred:', err));
