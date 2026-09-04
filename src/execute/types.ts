/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexDiagnostic, CommonOptions } from '../utils';

export const LOG_TYPES = [
  'NONE',
  'DEBUGONLY',
  'DB',
  'PROFILING',
  'CALLOUT',
  'DETAIL'
] as const;
export type LogType = (typeof LOG_TYPES)[number];

export const LOG_CATEGORIES = [
  'Db',
  'Workflow',
  'Validation',
  'Callout',
  'Apex_code',
  'Apex_profiling',
  'Visualforce',
  'System',
  'Wave',
  'Nba'
] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

export const LOG_CATEGORY_LEVELS = [
  'NONE',
  'ERROR',
  'WARN',
  'INFO',
  'DEBUG',
  'FINE',
  'FINER',
  'FINEST'
] as const;
export type LogCategoryLevel = (typeof LOG_CATEGORY_LEVELS)[number];

export type DebugCategory = {
  category: LogCategory;
  level: LogCategoryLevel;
};

export type ApexExecuteOptions = CommonOptions & {
  targetUsername?: string;
  apexFilePath?: string;
  apexCode?: string | Buffer;
  userInput?: boolean;
  debugLevel?: LogType;
  debugCategories?: DebugCategory[];
};

export const soapEnv = 'soapenv:Envelope';
export const soapBody = 'soapenv:Body';
export const soapHeader = 'soapenv:Header';
export const action = 'executeAnonymous';

export interface SoapResponse {
  [soapEnv]?: {
    [soapHeader]?: { DebuggingInfo: DebuggingInfo };
    [soapBody]: {
      executeAnonymousResponse: { result: ExecAnonApiResponse };
    };
  };
}

interface DebuggingInfo {
  debugLog: string;
}

export type ExecuteAnonymousResponse = {
  compiled: boolean;
  success: boolean;
  logs?: string;
  diagnostic?: ApexDiagnostic[];
};

export type ExecAnonApiResponse = {
  column: number;
  compiled: string;
  compileProblem: string | object;
  exceptionMessage: string | object;
  exceptionStackTrace: string | object;
  line: number;
  success: string;
};
