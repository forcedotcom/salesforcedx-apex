/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { CLASS_ID_PREFIX, TEST_RUN_ID_PREFIX } from './constants';
import { NamespaceInfo, NamespaceQueryResult } from './types';

export function isValidTestRunID(testRunId: string): boolean {
  return (
    (testRunId.length === 15 || testRunId.length === 18) &&
    testRunId.startsWith(TEST_RUN_ID_PREFIX)
  );
}

export function isValidApexClassID(apexClassId: string): boolean {
  return (
    (apexClassId.length === 15 || apexClassId.length === 18) &&
    apexClassId.startsWith(CLASS_ID_PREFIX)
  );
}

export async function queryNamespaces(
  connection: Connection
): Promise<NamespaceInfo[]> {
  const installedNsQuery = 'SELECT NamespacePrefix FROM PackageLicense';
  const installedNsPromise = connection.query(installedNsQuery) as Promise<
    NamespaceQueryResult
  >;
  const orgNsQuery = 'SELECT NamespacePrefix FROM Organization';
  const orgNsPromise = connection.query(orgNsQuery) as Promise<
    NamespaceQueryResult
  >;

  const allNamespaces = await Promise.all([installedNsPromise, orgNsPromise]);
  const installedNamespaces = allNamespaces[0].records.map(record => {
    return { installedNs: true, namespace: record.NamespacePrefix };
  });
  const orgNamespaces = allNamespaces[1].records.map(record => {
    return { installedNs: false, namespace: record.NamespacePrefix };
  });

  return [...orgNamespaces, ...installedNamespaces];
}
