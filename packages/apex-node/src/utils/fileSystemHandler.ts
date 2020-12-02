/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnyJson } from '@salesforce/ts-types';

export function ensureDirectoryExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    return;
  }
  ensureDirectoryExists(path.dirname(filePath));
  fs.mkdirSync(filePath);
}

export function ensureFileExists(filePath: string): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.closeSync(fs.openSync(filePath, 'w'));
}

/**
 * Method to save a file on disk.
 *
 * @param filePath path where to
 * @param fileContent file contents
 */
export function createFile(filePath: string, fileContent: AnyJson): void {
  ensureFileExists(filePath);

  const writeStream = fs.createWriteStream(filePath);
  writeStream.write(fileContent);
}

/**
 * Method to save multiple files on disk
 * @param fileMap key = filePath, value = file contents
 */
export function createFiles(fileMap: Map<string, AnyJson>): void {
  for (const filePath of fileMap.keys()) {
    ensureFileExists(filePath);

    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(fileMap.get(filePath));
    writeStream.end();
  }
}
