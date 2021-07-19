/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const APEX_LOG_QUERY =
  'Select Id, Application, DurationMilliseconds, Location, LogLength, LogUser.Name, ' +
  'Operation, Request, StartTime, Status from ApexLog Order By StartTime DESC';
export const DEBUG_LEVEL_QUERY =
  "SELECT Id FROM DebugLevel WHERE DeveloperName = '%s'";
export const DEFAULT_DEBUG_LEVEL_NAME = 'SFDC_DevConsole';
export const LOG_TYPE = 'DEVELOPER_LOG';
export const MAX_NUM_LOGS = 25;
export const TAIL_LISTEN_TIMEOUT_MIN = 30;
export const TRACE_FLAG_QUERY =
  'SELECT Id, DebugLevelId, StartDate, ExpirationDate FROM TraceFlag ' +
  "WHERE TracedEntityId = '%s' AND LogType = '%s'" +
  'ORDER BY CreatedDate DESC ' +
  'LIMIT 1';
export const USERNAME_QUERY = "SELECT Id FROM User WHERE Username = '%s'";
