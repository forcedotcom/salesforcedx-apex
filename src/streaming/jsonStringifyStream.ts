/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Readable, ReadableOptions } from 'stream';
import { isArray, isObject, isPrimitive } from '../tests';

interface JSONStringifyStreamOptions extends ReadableOptions {
  object: unknown;
}

let lastYielded: unknown | undefined;

function* stringify(obj: unknown): Generator<string> {
  if (isObject(obj)) {
    yield* handleObject(obj, true);
  } else if (isArray(obj)) {
    yield* handleArray(obj as unknown[], true);
  } else if (isPrimitive(obj)) {
    yield JSON.stringify(obj);
  }
}

function* yieldWithTracking(value: string): Generator<string> {
  lastYielded = value;
  yield value;
}

function* handleObject(obj: object, isLast: boolean): Generator<string> {
  yield* yieldWithTracking('{');
  const entries = Object.entries(obj);
  for (let index = 0; index < entries.length; index++) {
    const [key, value] = entries[index];
    yield* yieldWithTracking(`"${key}":`);
    if (isObject(value)) {
      yield* handleObject(value, index === entries.length - 1);
    } else if (isArray(value)) {
      yield* handleArray(value, index === entries.length - 1);
    } else {
      yield* yieldWithTracking(JSON.stringify(value));
    }
    if (index !== entries.length - 1 && lastYielded !== ',') {
      yield* yieldWithTracking(',');
    }
  }
  yield* yieldWithTracking('}');
  if (!isLast && lastYielded !== ',') {
    yield* yieldWithTracking(',');
  }
}

function* handleArray(
  unknownArray: unknown[],
  isLast: boolean
): Generator<string> {
  yield* yieldWithTracking('[');
  for (let index = 0; index < unknownArray.length; index++) {
    const entry = unknownArray[index];
    if (isObject(entry)) {
      yield* handleObject(entry, index === unknownArray.length - 1);
    } else if (isArray(entry)) {
      yield* handleArray(entry, index === unknownArray.length - 1);
    } else {
      yield* yieldWithTracking(JSON.stringify(entry));
    }
    if (index !== unknownArray.length - 1 && lastYielded !== ',') {
      yield* yieldWithTracking(',');
    }
  }
  yield* yieldWithTracking(']');
  if (!isLast && lastYielded !== ',') {
    yield* yieldWithTracking(',');
  }
}
/**
 * Utility class that accepts a JSON object that will be transformed into a
 * string representation suitable to be written to a file
 *
 * The class accepts an options object to set stream properties,
 * except for objectNode, which is forced to false.
 *
 * This class will serialize very large json objects, but must be able to work
 * within the current max heap size of the node process since this class uses
 * recursion via generator functions
 */
export class JSONStringifyStream extends Readable {
  private sent: boolean = false;
  private readonly object: unknown;

  constructor(options: JSONStringifyStreamOptions) {
    super({ ...options, objectMode: false });
    this.object = options.object;
  }

  _read(): void {
    if (!this.sent) {
      const generator = stringify(this.object);
      for (const chunk of generator) {
        this.push(chunk);
      }
      this.sent = true;
    } else {
      this.push(null);
    }
  }

  static from(json: unknown): JSONStringifyStream {
    return new JSONStringifyStream({ object: json });
  }
}
