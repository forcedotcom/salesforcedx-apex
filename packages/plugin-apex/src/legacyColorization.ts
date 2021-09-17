/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { Logger } from '@salesforce/core';

const DEFAULT_COLOR_MAP = {
  CONSTRUCTOR_: 'magenta',
  EXCEPTION_: 'red',
  FATAL_: 'red',
  METHOD_: 'blue',
  SOQL_: 'yellow',
  USER_: 'green',
  VARIABLE_: 'cyan'
};

/**
 * @description this is a holdover from the toolbelt API, which allows for custom colorization of the logs.
 * @param log - full debug log retrieved from an org.
 * @returns colorized log
 */
export async function colorizeLog(log: string): Promise<string> {
  const logger = await Logger.child('apexLogApi', { tag: 'tail' });
  // default color registry
  let colorMap = DEFAULT_COLOR_MAP;

  // allow for color overrides
  const colorMapFile = process.env.SFDX_APEX_LOG_COLOR_MAP;
  if (colorMapFile) {
    try {
      colorMap = require(colorMapFile);
    } catch (err) {
      // fallback to default color registry
      logger.warn(`Color registry not found: ${colorMapFile}`);
    }
  }

  // split logs to colorize each logline
  const logLines = log.split(/\n/g);

  // return as-is if split fails
  if (!logLines || logLines.length < 1) {
    logger.warn('colorizeLog unable to split logLines');
    return log;
  }

  // bold first line to highlight separation between subsequent loglines
  const line1 = chalk.bold(logLines.shift());

  return [
    line1,
    // for each logline, loop thru seeing if there's an event match
    ...(logLines.map(logLine => {
      for (const [key, color] of Object.entries(colorMap)) {
        if (logLine.includes(`|${key}`)) {
          const colorFn = chalk.keyword(color);

          // check for valid color
          if (typeof colorFn !== 'function') {
            logger.warn(`Color ${color} is not supported`);
            return logLine;
          }

          // parse line to colorize event
          const cnt = (logLine.match(/\|/g) || []).length;
          if (cnt === 1) {
            // no trailing log
            return colorFn(logLine);
          }
          // colorize event (event up to 2nd '|')
          const first = logLine.indexOf('|', logLine.indexOf('|') + 1);
          return `${colorFn(
            logLine.substring(0, first)
          ) as string}${logLine.substring(first)}`;
        }
      }
      return logLine;
    }) as string[])
  ].join('\n');
}
