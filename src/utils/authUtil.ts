/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { JsonCollection } from '@salesforce/ts-types';
import { xmlCharMap } from './types';
import type { HttpRequest } from '@jsforce/jsforce-node';

export async function refreshAuth(
  connection: Connection
): Promise<JsonCollection> {
  const requestInfo: HttpRequest = { url: connection.baseUrl(), method: 'GET' };
  return await connection.request(requestInfo);
}

export function escapeXml(data: string): string {
  return data.replace(/[<>&'"]/g, (char) => {
    return xmlCharMap[char];
  });
}

/**
 * Checks if an error is a connection-related error
 * @param error The error to check
 * @returns true if the error is connection-related
 */
export function isConnectionError(error: Error): boolean {
  return (
    error.name === 'ERROR_HTTP_500' ||
    error.name === 'ERROR_HTTP_503' ||
    error.name === 'ERROR_HTTP_504' ||
    error.message?.includes('ETIMEDOUT') ||
    error.message?.includes('ECONNRESET') ||
    error.message?.includes('ENOTFOUND') ||
    error.message?.includes('INVALID_SESSION_ID') ||
    error.message?.includes('socket hang up')
  );
}

/**
 * Creates a promise that resolves after the specified number of milliseconds
 * @param ms Number of milliseconds to wait
 * @returns A promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
