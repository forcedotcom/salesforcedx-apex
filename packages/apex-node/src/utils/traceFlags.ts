/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import * as util from 'util';
import { nls } from '../i18n';
import { DEFAULT_DEBUG_LEVEL_NAME, LOG_TYPE } from '../logs/constants';

interface UserRecord {
  Id: string;
}

interface DebugLevelRecord {
  ApexCode: string;
  VisualForce: string;
}

interface TraceFlagRecord {
  Id: string;
  LogType: string;
  DebugLevelId: string;
  StartDate: Date | undefined;
  ExpirationDate: Date | undefined;
  DebugLevel: DebugLevelRecord;
}

interface DataRecordResult {
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: any[];
  success: boolean;
}

interface IdRecord {
  Id: string;
}

interface QueryRecord {
  totalSize: number;
  records: IdRecord[];
}

export class TraceFlags {
  private readonly LOG_TIMER_LENGTH_MINUTES = 30;
  private readonly MILLISECONDS_PER_MINUTE = 60000;
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async ensureTraceFlags(debugLevelName?: string): Promise<boolean> {
    const username = this.connection.getUsername();
    if (!username) {
      throw new Error(nls.localize('error_no_default_username'));
    }

    const userId = (await this.getUserIdOrThrow(username)).Id;
    const traceFlag = await this.getTraceFlagForUser(userId);
    if (traceFlag) {
      // update existing debug level and trace flag
      if (!(await this.updateDebugLevel(traceFlag.DebugLevelId))) {
        return false;
      }

      const expirationDate = this.calculateExpirationDate(
        traceFlag.ExpirationDate
          ? new Date(traceFlag.ExpirationDate)
          : new Date()
      );
      return await this.updateTraceFlag(traceFlag.Id, expirationDate);
    } else {
      // create a debug level
      let debugLevelId;
      if (debugLevelName) {
        debugLevelId = await this.findDebugLevel(debugLevelName);
        if (!debugLevelId) {
          throw new Error(
            nls.localize(
              'trace_flags_failed_to_find_debug_level',
              debugLevelName
            )
          );
        }
      } else {
        debugLevelId = await this.createDebugLevel(DEFAULT_DEBUG_LEVEL_NAME);
        if (!debugLevelId) {
          throw new Error(
            nls.localize('trace_flags_failed_to_create_debug_level')
          );
        }
      }

      // create a trace flag
      const expirationDate = this.calculateExpirationDate(new Date());
      if (!(await this.createTraceFlag(userId, debugLevelId, expirationDate))) {
        return false;
      }
    }

    return true;
  }

  private async findDebugLevel(
    debugLevelName: string
  ): Promise<string | undefined> {
    const query = util.format(
      "SELECT Id FROM DebugLevel WHERE DeveloperName = '%s'",
      debugLevelName
    );
    const result = (await this.connection.tooling.query(query)) as QueryRecord;
    return result.totalSize && result.totalSize > 0 && result.records
      ? result.records[0].Id
      : undefined;
  }

  private async updateDebugLevel(id: string): Promise<boolean> {
    const debugLevel = {
      Id: id,
      ApexCode: 'FINEST',
      Visualforce: 'FINER'
    };
    const result = (await this.connection.tooling.update(
      'DebugLevel',
      debugLevel
    )) as DataRecordResult;
    return result.success;
  }

  private async createDebugLevel(
    debugLevelName: string
  ): Promise<string | undefined> {
    const developerName = debugLevelName;
    const debugLevel = {
      developerName,
      MasterLabel: developerName,
      ApexCode: 'FINEST',
      Visualforce: 'FINER'
    };
    const result = (await this.connection.tooling.create(
      'DebugLevel',
      debugLevel
    )) as DataRecordResult;
    return result.success && result.id ? result.id : undefined;
  }

  private async updateTraceFlag(
    id: string,
    expirationDate: Date
  ): Promise<boolean> {
    const traceFlag = {
      Id: id,
      StartDate: '',
      ExpirationDate: expirationDate.toUTCString()
    };
    const result = (await this.connection.tooling.update(
      'TraceFlag',
      traceFlag
    )) as DataRecordResult;
    return result.success;
  }

  private async createTraceFlag(
    userId: string,
    debugLevelId: string,
    expirationDate: Date
  ): Promise<string | undefined> {
    const traceFlag = {
      tracedentityid: userId,
      logtype: LOG_TYPE,
      debuglevelid: debugLevelId,
      StartDate: '',
      ExpirationDate: expirationDate.toUTCString()
    };

    const result = (await this.connection.tooling.create(
      'TraceFlag',
      traceFlag
    )) as DataRecordResult;
    return result.success && result.id ? result.id : undefined;
  }

  private isValidDateLength(expirationDate: Date): boolean {
    const currDate = new Date().valueOf();
    return (
      expirationDate.getTime() - currDate >
      this.LOG_TIMER_LENGTH_MINUTES * this.MILLISECONDS_PER_MINUTE
    );
  }

  private calculateExpirationDate(expirationDate: Date): Date {
    if (!this.isValidDateLength(expirationDate)) {
      expirationDate = new Date(
        Date.now() +
          this.LOG_TIMER_LENGTH_MINUTES * this.MILLISECONDS_PER_MINUTE
      );
    }
    return expirationDate;
  }

  private async getUserIdOrThrow(username: string): Promise<UserRecord> {
    const userQuery = `SELECT id FROM User WHERE username='${username}'`;
    const userResult = await this.connection.query<UserRecord>(userQuery);

    if (userResult.totalSize === 0) {
      throw new Error(nls.localize('trace_flags_unknown_user'));
    }
    return userResult.records[0];
  }

  private async getTraceFlagForUser(
    userId: string
  ): Promise<TraceFlagRecord | undefined> {
    const traceFlagQuery = `
      SELECT id, logtype, startdate, expirationdate, debuglevelid, debuglevel.apexcode, debuglevel.visualforce
      FROM TraceFlag
      WHERE logtype='${LOG_TYPE}' AND TracedEntityId='${userId}'
      ORDER BY CreatedDate DESC
      LIMIT 1
    `;
    const traceFlagResult = await this.connection.tooling.query<
      TraceFlagRecord
    >(traceFlagQuery);

    if (traceFlagResult.totalSize > 0) {
      return traceFlagResult.records[0];
    }
    return undefined;
  }
}
