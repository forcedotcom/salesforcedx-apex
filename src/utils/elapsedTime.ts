/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return */

import { Logger, LoggerLevel } from '@salesforce/core';
import { LoggerLevelValue } from '@salesforce/core/lib/logger/logger';

const logThis = (
  level: LoggerLevelValue,
  logger: Logger,
  msg: string,
  properties: Record<string, any> = {}
): void => {
  if (!logger.shouldLog(level)) {
    return;
  }
  const payload = { msg, ...properties };
  switch (level) {
    case LoggerLevel.TRACE:
      logger.trace(payload);
      break;
    case LoggerLevel.DEBUG:
      logger.debug(payload);
      break;
    case LoggerLevel.INFO:
      logger.info(payload);
      break;
    case LoggerLevel.WARN:
      logger.warn(payload);
      break;
    case LoggerLevel.ERROR:
      logger.error(payload);
      break;
    case LoggerLevel.FATAL:
      logger.fatal(payload);
      break;
  }
};

/**
 * This decorator can be used to annotate functions in a class, so that the elapsed time
 * spent in the class can be sent to telemetry.
 *
 * @returns
 * @param loggerName - name of the child logger, defaults to 'elapsedTime'
 * @param level - log level - defaults to debug
 */
export function elapsedTime(
  loggerName: string = 'elapsedTime',
  level: LoggerLevelValue = LoggerLevel.DEBUG
) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const logger = Logger.childFromRoot(loggerName);
      const start = process.hrtime();
      const className = target.constructor.name;

      // Use conditional statement to call the appropriate logging method
      logThis(level, logger, `${className}.${propertyKey} - enter`);

      let wrappedResult;
      let error: any;

      try {
        wrappedResult = originalMethod.apply(this, args);
      } catch (err) {
        error = err;
      }

      const handleResult = (r: any) => {
        const diff = process.hrtime(start);
        const elapsedTime = diff[0] * 1e3 + diff[1] / 1e6;

        logThis(level, logger, `${className}.${propertyKey} - exit`, {
          elapsedTime
        });

        if (error) {
          throw error;
        }

        return r;
      };

      if (wrappedResult instanceof Promise) {
        return wrappedResult.then(handleResult);
      } else {
        return handleResult(wrappedResult);
      }
    };

    return descriptor;
  };
}
