/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { action, LogType, DebugCategory } from './types';

const xmlCharMap: { [key: string]: string } = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;'
};

const escapeXml = (data: string): string =>
  data.replace(/[<>&'\"]/g, (char: string) => xmlCharMap[char]);

function buildDebuggingHeader(
  debugLevel?: LogType,
  debugCategories?: DebugCategory[]
): string {
  if (debugCategories?.length) {
    const categories = debugCategories
      .map(
        (c) =>
          `<apex:categories><apex:category>${c.category}</apex:category><apex:level>${c.level}</apex:level></apex:categories>`
      )
      .join('');
    return `<apex:DebuggingHeader>${categories}</apex:DebuggingHeader>`;
  }
  return `<apex:DebuggingHeader><apex:debugLevel>${debugLevel ?? 'DEBUGONLY'}</apex:debugLevel></apex:DebuggingHeader>`;
}

export function encodeBody(
  accessToken: string,
  data: string,
  debugLevel?: LogType,
  debugCategories?: DebugCategory[]
): string {
  const escapedData = escapeXml(data);
  const debuggingHeader = buildDebuggingHeader(debugLevel, debugCategories);

  return `<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:cmd="http://soap.sforce.com/2006/08/apex"
xmlns:apex="http://soap.sforce.com/2006/08/apex">
    <env:Header>
        <cmd:SessionHeader>
            <cmd:sessionId>${accessToken}</cmd:sessionId>
        </cmd:SessionHeader>
        ${debuggingHeader}
    </env:Header>
    <env:Body>
        <${action} xmlns="http://soap.sforce.com/2006/08/apex">
            <apexcode>${escapedData}</apexcode>
        </${action}>
    </env:Body>
</env:Envelope>`;
}
