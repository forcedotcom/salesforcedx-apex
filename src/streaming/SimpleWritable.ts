/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Writable, WritableOptions } from 'stream';

export class SimpleWritable extends Writable {
  constructor(options?: WritableOptions) {
    super(options);
  }

  _write(
    chunk: unknown,
    encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    // Implement your logic here
    console.log(chunk.toString());
    callback();
  }
}
