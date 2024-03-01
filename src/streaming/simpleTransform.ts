/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ReadableOptions, Transform, TransformCallback } from 'stream';

export class SimpleTransform extends Transform {
  constructor(options?: ReadableOptions) {
    super(options);
  }

  _transform(
    chunk: unknown,
    encoding: string,
    callback: TransformCallback
  ): void {
    try {
      // You can inspect the chunk here with a debugger
      console.log(chunk); // or use a debugger statement if you're running this in a debugger
      this.push(chunk);
      callback();
    } catch (err) {
      console.error('Error processing chunk:', `${err}: chunk ${chunk}`);
      callback(err);
    }
  }
}
