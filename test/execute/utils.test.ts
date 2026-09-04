/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { encodeBody } from '../../src/execute/utils';
import { expect } from 'chai';

describe('encodeBody for execute request', () => {
  const accessToken = '0000000000x189';
  let actionBody = `System.assert(true);`;
  const debugHeader =
    '<apex:DebuggingHeader><apex:debugLevel>DEBUGONLY</apex:debugLevel></apex:DebuggingHeader>';
  const action = 'executeAnonymous';
  const expectedBody = `<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:cmd="http://soap.sforce.com/2006/08/apex"
xmlns:apex="http://soap.sforce.com/2006/08/apex">
    <env:Header>
        <cmd:SessionHeader>
            <cmd:sessionId>${accessToken}</cmd:sessionId>
        </cmd:SessionHeader>
        ${debugHeader}
    </env:Header>
    <env:Body>
        <${action} xmlns="http://soap.sforce.com/2006/08/apex">
            <apexcode>${actionBody}</apexcode>
        </${action}>
    </env:Body>
</env:Envelope>`;
  it('should correctly return encoded body given the parameters', () => {
    const encodedBody = encodeBody(accessToken, actionBody);
    expect(encodedBody).to.eql(expectedBody);
  });

  it('should correctly return encoded body given parameters with characters that must be escaped', () => {
    actionBody = `System.assert(true);\n// > & < & '"' "'"`;
    const expectedResponse = `<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:cmd="http://soap.sforce.com/2006/08/apex"
xmlns:apex="http://soap.sforce.com/2006/08/apex">
    <env:Header>
        <cmd:SessionHeader>
            <cmd:sessionId>${accessToken}</cmd:sessionId>
        </cmd:SessionHeader>
        ${debugHeader}
    </env:Header>
    <env:Body>
        <${action} xmlns="http://soap.sforce.com/2006/08/apex">
            <apexcode>System.assert(true);\n// &gt; &amp; &lt; &amp; &apos;&quot;&apos; &quot;&apos;&quot;</apexcode>
        </${action}>
    </env:Body>
</env:Envelope>`;
    const encodedBody = encodeBody(accessToken, actionBody);
    expect(encodedBody).to.eql(expectedResponse);
  });

  it('should use a custom debugLevel when provided', () => {
    const encodedBody = encodeBody(
      accessToken,
      'System.assert(true);',
      'DETAIL'
    );
    expect(encodedBody).to.include(
      '<apex:DebuggingHeader><apex:debugLevel>DETAIL</apex:debugLevel></apex:DebuggingHeader>'
    );
  });

  it('should use categories when debugCategories are provided', () => {
    const encodedBody = encodeBody(
      accessToken,
      'System.assert(true);',
      undefined,
      [
        { category: 'Apex_code', level: 'FINEST' },
        { category: 'Db', level: 'FINE' }
      ]
    );
    expect(encodedBody).to.include(
      '<apex:DebuggingHeader>' +
        '<apex:categories><apex:category>Apex_code</apex:category><apex:level>FINEST</apex:level></apex:categories>' +
        '<apex:categories><apex:category>Db</apex:category><apex:level>FINE</apex:level></apex:categories>' +
        '</apex:DebuggingHeader>'
    );
    expect(encodedBody).not.to.include('<apex:debugLevel>');
  });

  it('should prefer categories over debugLevel when both are provided', () => {
    const encodedBody = encodeBody(
      accessToken,
      'System.assert(true);',
      'DETAIL',
      [{ category: 'Apex_code', level: 'FINEST' }]
    );
    expect(encodedBody).to.include('<apex:category>Apex_code</apex:category>');
    expect(encodedBody).not.to.include('<apex:debugLevel>');
  });
});
