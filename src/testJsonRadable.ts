/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { JSONReadable } from './streaming';
import { SimpleWritable } from './streaming/SimpleWritable';
import { pipeline } from 'node:stream/promises';

const json = {
  a: 'b',
  c: 'd',
  e: {
    f: 'g',
    h: Array.from({ length: 1000 }, (_, index) => `element${index + 1}`)
  }
};
// const json = ['i', 'j', { f: 'g' }];

const readable = JSONReadable.fromJSON(json);
const writable = new SimpleWritable();

void pipeline(readable, writable);
