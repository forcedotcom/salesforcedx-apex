/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Readable, ReadableOptions } from 'stream';

interface JSONReadableOptions extends ReadableOptions {
  object: object;
}

export class JSONReadable extends Readable {
  private sent: boolean = false;
  private readonly object: object;

  constructor(options: JSONReadableOptions) {
    super({ ...options, objectMode: true });
    this.object = options.object;
  }

  _read(): void {
    if (!this.sent) {
      this.stringify(this.object);
      this.sent = true;
    } else {
      this.push(null);
    }
  }

  stringify(obj: object): void {
    const stack: unknown[][] = [[null, obj]];
    const visited = new Set();

    try {
      while (stack.length > 0) {
        const [key, current] = stack.pop();

        if (visited.has(current)) {
          continue;
        }

        if (
          key === null &&
          !(typeof current === 'string' && /^[\[\]{},]$/.test(current))
        ) {
          visited.add(current);
        }

        if (key !== null) {
          this.push(`"${key}":`);
        }

        if (typeof current === 'string') {
          if (/^[\[\]{},]$/.test(current)) {
            this.push(current);
          } else {
            this.push(`"${current}"`);
          }
        } else if (
          typeof current === 'number' ||
          typeof current === 'boolean' ||
          current === null
        ) {
          this.push(String(current));
        } else if (Array.isArray(current)) {
          this.push('[');
          stack.push([null, ']']);
          for (let i = current.length - 1; i >= 0; i--) {
            stack.push([null, current[i]]);
            if (i > 0) {
              stack.push([null, ',']);
            }
          }
        } else if (typeof current === 'object') {
          this.push('{');
          stack.push([null, '}']);
          const keys = Object.keys(current);
          for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            stack.push([key, Reflect.get(current, key)]);
            if (i > 0) {
              stack.push([null, ',']);
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  static fromJSON(json: object): JSONReadable {
    return new JSONReadable({ object: json });
  }
}
