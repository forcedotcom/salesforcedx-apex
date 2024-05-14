/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Logger, LoggerLevel } from '@salesforce/core';
import v8 from 'node:v8';

export class HeapMonitor {
  private logger: Logger;
  private intervalId?: NodeJS.Timeout;

  constructor(loggerName: string) {
    this.logger = Logger.childFromRoot(loggerName, {
      tag: 'heap monitor'
    });
  }

  public checkHeapSize(): void {
    if (!this.logger.shouldLog(LoggerLevel.DEBUG)) {
      return;
    }

    const heapSizeInBytes = v8.getHeapStatistics().total_available_size;
    const heapSizeInGigabytes = heapSizeInBytes / 1024 / 1024 / 1024;

    const memoryUsage = process.memoryUsage();
    const rssInMB = memoryUsage.rss / 1024 / 1024;
    const heapTotalInMB = memoryUsage.heapTotal / 1024 / 1024;
    const heapUsedInMB = memoryUsage.heapUsed / 1024 / 1024;
    const externalInMB = memoryUsage.external / 1024 / 1024;

    this.logger.debug({
      msg: 'Memory usage',
      heapSizeInGB: heapSizeInGigabytes.toFixed(4),
      rssInMB: rssInMB.toFixed(2),
      heapTotalInMB: heapTotalInMB.toFixed(2),
      heapUsedInMB: heapUsedInMB.toFixed(2),
      externalInMB: externalInMB.toFixed(2)
    });
  }

  public startMonitoring(interval: number): void {
    this.intervalId = setInterval(() => this.checkHeapSize(), interval);
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
