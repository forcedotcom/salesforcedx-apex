/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { nls } from '../../src/i18n';
import { formatTestErrors } from '../../src/tests/diagnosticUtil';

describe('Format Test Errors', async () => {
  it('should add formatted text to all invalid permissions errors', async () => {
    const invalidApexMsg = `nestedException:\n\t sObject type 'ApexClass' is not supported.`;
    const invalidApexErr = new Error(invalidApexMsg);
    const formattedApex = formatTestErrors(invalidApexErr);
    expect(formattedApex.message).to.include(
      nls.localize('invalidsObjectErr', ['ApexClass', invalidApexMsg])
    );
  });

  it('should return unchanged error if not of type invalid permissions', async () => {
    const accessTokenErr = new Error();
    accessTokenErr.name = 'Access Token Error';
    const unchangedTokenErr = formatTestErrors(accessTokenErr);
    expect(unchangedTokenErr.message).to.equal(accessTokenErr.message);
    expect(unchangedTokenErr.name).to.equal(accessTokenErr.name);
    expect(unchangedTokenErr.stack).to.equal(accessTokenErr.stack);
  });

  it('should preserve original name and stack values after formatting error', async () => {
    const invalidPkgMsg = `nestedException:\n\t sObject type 'PackageLicense' is not supported.`;
    const invalidPkgErr = new Error(invalidPkgMsg);
    invalidPkgErr.name = 'INVALIDTYPE';
    invalidPkgErr.stack = 'STACKTRACE';
    const formattedPkg = formatTestErrors(invalidPkgErr);
    expect(formattedPkg.message).to.include(
      nls.localize('invalidsObjectErr', ['PackageLicense', invalidPkgMsg])
    );
    expect(formattedPkg.name).to.equal(invalidPkgErr.name);
    expect(formattedPkg.stack).to.equal(invalidPkgErr.stack);
  });

  it('should map UNKNOWN_EXCEPTION to user-friendly message', async () => {
    const err = formatTestErrors(new Error('UNKNOWN_EXCEPTION'));
    expect(err.message).to.equal(nls.localize('test_error_unknown_exception'));
  });

  it('should map auth-related errors to user-friendly message', async () => {
    const err = formatTestErrors(new Error('401 Unauthorized'));
    expect(err.message).to.equal(nls.localize('test_error_auth'));
  });

  it('should map connection/network errors to user-friendly message', async () => {
    const err = formatTestErrors(new Error('ECONNREFUSED'));
    expect(err.message).to.equal(nls.localize('test_error_connection'));
  });

  it('should map resource not found to user-friendly message', async () => {
    const err = formatTestErrors(
      new Error('The requested resource does not exist')
    );
    expect(err.message).to.equal(nls.localize('test_error_resource_not_found'));
  });

  it('should accept non-Error and map UNKNOWN_EXCEPTION', async () => {
    const err = formatTestErrors('UNKNOWN_EXCEPTION');
    expect(err).to.be.instanceOf(Error);
    expect(err.message).to.equal(nls.localize('test_error_unknown_exception'));
  });
});
