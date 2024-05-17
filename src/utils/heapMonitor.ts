/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Logger, LoggerLevel } from '@salesforce/core';
import v8 from 'node:v8';

export class HeapMonitor {
  private static instance: HeapMonitor;
  private logger: Logger;
  private intervalId?: NodeJS.Timeout;
  private isMonitoring: boolean;
  private interval: number;

  private constructor() {
    this.logger = Logger.childFromRoot('heap-monitor', {
      tag: 'heap-monitor'
    });
    this.isMonitoring = false;
    // Check for SF_HEAP_MONITOR_INTERVAL environment variable
    this.interval = 500; // default value
    const envInterval = process.env.SF_HEAP_MONITOR_INTERVAL;
    if (envInterval && Number.isInteger(Number(envInterval))) {
      this.interval = Number(envInterval);
    }
  }

  public static getInstance(): HeapMonitor {
    if (!HeapMonitor.instance) {
      HeapMonitor.instance = new HeapMonitor();
    }
    return HeapMonitor.instance;
  }

  public checkHeapSize(applicationArea?: string): void {
    if (!this.logger.shouldLog(LoggerLevel.DEBUG)) {
      return;
    }
    const heapStats = v8.getHeapStatistics();
    const heapSpaceStats = v8.getHeapSpaceStatistics();

    const memoryUsage = process.memoryUsage();

    const logRecord: { [name: string]: string | number } = {
      msg: 'Memory usage',
      applicationArea,
      rss: Number(memoryUsage.rss),
      heapTotal: Number(memoryUsage.heapTotal),
      heapUsed: Number(memoryUsage.heapUsed),
      external: Number(memoryUsage.external)
    };

    // Convert heapStats properties to numbers and add to logRecord
    for (const [key, value] of Object.entries(heapStats)) {
      logRecord[key] = Number(value);
    }

    // Flatten heapSpaces into individual properties
    heapSpaceStats.forEach((space) => {
      logRecord[`${space.space_name}_total`] = Number(space.space_size);
      logRecord[`${space.space_name}_used`] = Number(space.space_used_size);
      logRecord[`${space.space_name}_available`] = Number(
        space.space_available_size
      );
    });

    this.logger.debug(logRecord);
  }

  public startMonitoring(): void {
    if (!this.isMonitoring) {
      this.isMonitoring = true;
      if (!this.logger.shouldLog(LoggerLevel.DEBUG)) {
        return;
      }

      this.checkHeapSize();
      this.intervalId = setInterval(() => this.checkHeapSize(), this.interval);
    }
  }

  public stopMonitoring(): void {
    if (this.isMonitoring) {
      this.isMonitoring = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
    }
  }
}
