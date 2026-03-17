/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { nls } from '../i18n';
import { ApexDiagnostic } from '../utils';
import { ApexTestResultRecord, SyncTestFailure } from './types';

const UNKNOWN_EXCEPTION = 'UNKNOWN_EXCEPTION';
const AUTH_PATTERNS = [
  '401',
  'Unauthorized',
  'authentication',
  'auth',
  'token',
  'session',
  'expired',
  'invalid_grant',
  'invalid session',
  'INVALID_SESSION_ID',
  'invalid_session_id'
];
const CONNECTION_NETWORK_PATTERNS = [
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'network',
  'getaddrinfo',
  'socket hang up',
  'connection refused',
  'timeout'
];
const ORG_RESOURCE_PATTERNS = [
  'requested resource does not exist',
  '404',
  'not found'
];

const getMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    const body = obj.body;
    if (Array.isArray(body) && body.length > 0) {
      const first = body[0] as { message?: string };
      if (typeof first.message === 'string') {
        return first.message;
      }
    }
  }
  return String(error);
};

/**
 * Maps connection, auth, and API errors to user-friendly messages.
 * Ensures UNKNOWN_EXCEPTION and similar generic errors are never surfaced raw.
 */
export const formatTestErrors = (error: unknown): Error => {
  const err = error instanceof Error ? error : new Error(getMessage(error));
  const raw = getMessage(error);
  const lower = raw.trim().toLowerCase();

  if (raw === UNKNOWN_EXCEPTION || lower === 'unknown_exception') {
    err.message = nls.localize('test_error_unknown_exception');
    return err;
  }

  if (AUTH_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
    err.message = nls.localize('test_error_auth');
    return err;
  }

  if (
    CONNECTION_NETWORK_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
  ) {
    err.message = nls.localize('test_error_connection');
    return err;
  }

  if (ORG_RESOURCE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
    err.message = nls.localize('test_error_resource_not_found');
    return err;
  }

  const sObjectMatches = err.message?.match(
    /\bsObject type ["'](.*?)["'] is not supported\b/
  );
  if (sObjectMatches?.[0] && sObjectMatches?.[1]) {
    err.message = nls.localize('invalidsObjectErr', [
      sObjectMatches[1],
      err.message
    ]);
    return err;
  }

  return err;
};

export function getDiagnostic(
  record: SyncTestFailure | ApexTestResultRecord
): ApexDiagnostic {
  const { message, stackTrace } =
    'message' in record
      ? record
      : {
          message: record.Message,
          stackTrace: record.StackTrace
        };

  const matches = stackTrace?.match(/(line (\d+), column (\d+))/);

  return {
    exceptionMessage: message,
    exceptionStackTrace: stackTrace,
    className: stackTrace ? stackTrace.split('.')[1] : undefined,
    compileProblem: '',
    ...(matches && matches[2] && { lineNumber: Number(matches[2]) }),
    ...(matches && matches[3] && { columnNumber: Number(matches[3]) })
  };
}
