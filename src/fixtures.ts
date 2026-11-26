import { test as base, expect } from '@playwright/test';

import { siteOrigin } from './config';
import { NetworkLedger } from './support/hermetic';

/** Options a spec can override with `test.use({ ... })`. */
export interface LabOptions {
  /** Fail the test if any `/api/` call was not answered by a mock. */
  requireApiMocks: boolean;
}

export interface LabFixtures {
  /** Automatic request recorder plus mock registration helper. */
  ledger: NetworkLedger;
}

/**
 * Every test gets the ledger, so a stray cross-origin request fails the run even
 * in suites that were not written with the network in mind.
 */
export const test = base.extend<LabOptions & LabFixtures>({
  requireApiMocks: [false, { option: true }],

  ledger: [
    async ({ page, requireApiMocks }, use) => {
      const ledger = new NetworkLedger(page, siteOrigin, requireApiMocks);
      await use(ledger);
      ledger.assertClean();
    },
    { auto: true },
  ],
});

export { expect };
