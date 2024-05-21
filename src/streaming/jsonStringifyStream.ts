/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Logger, LoggerLevel } from '@salesforce/core';
import { Readable, ReadableOptions } from 'stream';
import { elapsedTime } from '../utils';
import { isArray, isObject, isPrimitive } from '../narrowing';
import * as os from 'os';

type JSONStringifyStreamOptions = ReadableOptions & {
  object: unknown;
  bufferSize?: number;
  indent?: undefined | 2 | 4;
};

export class JSONStringifyStream extends Readable {
  private sent: boolean = false;
  private buffer: string = '';
  private bufferSize: number;
  private readonly object: unknown;
  private readonly logger: Logger;
  private readonly indent?: undefined | 2 | 4;
  private currentIndent: number = 0;
  private streamEnded: boolean = false;

  constructor(options: JSONStringifyStreamOptions) {
    super({ ...options, objectMode: false });
    this.object = options.object;
    this.bufferSize = options.bufferSize ?? 32_768;
    this.indent = options.indent;
    this.logger = Logger.childFromRoot('JSONStringifyStream');
  }

  @elapsedTime('elapsedTime', LoggerLevel.TRACE)
  private async *stringify(obj: unknown): AsyncGenerator<string, void, void> {
    if (isObject(obj)) {
      yield* this.handleObject(obj);
    } else if (isArray(obj)) {
      yield* this.handleArray(obj as unknown[]);
    } else if (isPrimitive(obj)) {
      yield JSON.stringify(obj);
    }
  }

  @elapsedTime('elapsedTime', LoggerLevel.TRACE)
  private async *handleObject(obj: object): AsyncGenerator<string, void, void> {
    yield '{';
    this.increaseIndent();
    const entries = Object.entries(obj);
    if (entries.length > 0) {
      if (this.indent !== undefined) {
        yield os.EOL;
      }
      for (let index = 0; index < entries.length; index++) {
        yield this.getCurrentIndentation();
        const [key, value] = entries[index];
        yield `"${key}": `;
        if (isObject(value)) {
          yield* this.handleObject(value);
        } else if (isArray(value)) {
          yield* this.handleArray(value);
        } else {
          yield JSON.stringify(value);
        }
        if (index < entries.length - 1) {
          yield ',';
          if (this.indent !== undefined) {
            yield os.EOL;
          }
        }
      }
    }
    this.decreaseIndent();
    if (this.indent !== undefined) {
      yield os.EOL;
    }
    yield this.getCurrentIndentation() + '}';
  }

  @elapsedTime('elapsedTime', LoggerLevel.TRACE)
  private async *handleArray(
    arr: unknown[]
  ): AsyncGenerator<string, void, void> {
    yield '[';
    this.increaseIndent();
    if (arr.length > 0) {
      if (this.indent !== undefined) {
        yield os.EOL;
      }
      for (let index = 0; index < arr.length; index++) {
        yield this.getCurrentIndentation();
        const value = arr[index];
        if (isObject(value)) {
          yield* this.handleObject(value);
        } else if (isArray(value)) {
          yield* this.handleArray(value);
        } else {
          yield JSON.stringify(value);
        }
        if (index < arr.length - 1) {
          yield ',';
          if (this.indent !== undefined) {
            yield os.EOL;
          }
        }
      }
    }
    this.decreaseIndent();
    if (this.indent !== undefined) {
      yield os.EOL;
    }
    yield this.getCurrentIndentation() + ']';
  }

  private getCurrentIndentation(): string {
    return this.indent !== undefined ? ' '.repeat(this.currentIndent) : '';
  }

  private increaseIndent(): void {
    if (this.indent !== undefined) {
      this.currentIndent += this.indent;
    }
  }

  private decreaseIndent(): void {
    if (this.indent !== undefined) {
      this.currentIndent -= this.indent;
    }
  }

  private pushBuffer(): void {
    if (this.buffer.length > 0 && !this.streamEnded) {
      this.push(this.buffer);
      this.buffer = '';
      (async () => await new Promise(setImmediate))();
    }
  }

  private bufferedPush(chunk: string): void {
    if (!this.streamEnded) {
      this.buffer += chunk;
      if (this.buffer.length >= this.bufferSize) {
        this.pushBuffer();
      }
    }
  }

  _read(): void {
    this.logger.trace('starting _read');
    if (!this.sent) {
      (async () => {
        const generator = this.stringify(this.object);
        for await (const chunk of generator) {
          this.bufferedPush(chunk);
        }
        this.pushBuffer(); // Push any remaining data in the buffer
        if (!this.streamEnded) {
          this.push(null); // Signal the end of the stream
          this.streamEnded = true; // Mark stream as ended
        }
        this.sent = true;
      })();
    } else {
      if (!this.streamEnded) {
        this.push(null);
        this.streamEnded = true;
      }
    }
    this.logger.trace('finishing _read');
  }

  static from(
    json: unknown,
    options?: Omit<JSONStringifyStreamOptions, 'object'>
  ): JSONStringifyStream {
    return new JSONStringifyStream({ object: json, ...options });
  }
}
