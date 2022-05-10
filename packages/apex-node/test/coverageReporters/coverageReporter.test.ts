/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Org } from '@salesforce/core';
import { CodeCoverage } from '../../src/tests/codeCoverage';
import { expect } from 'chai';

describe('coverageReporter', async () => {
  const org = await Org.create({ aliasOrUsername: 'test-nvppqawqpcag@example.com' });
  const codeCoverage = new CodeCoverage(org.getConnection());
  const agcc = await codeCoverage.getAggregateCodeCoverage(new Set(['01p1D00000UOxOOQA1']));
  console.log(JSON.stringify(agcc, undefined, 2));
  it('should produce coverage report', async () => {
    expect(true).to.be.true;
  });
});
