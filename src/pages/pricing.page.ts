import type { Locator } from '@playwright/test';

import { LabPage } from './base.page';

/** `/visual/pricing.html`: three plans plus a comparison table. */
export class PricingPage extends LabPage {
  readonly path = '/visual/pricing.html';

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get plans(): Locator {
    return this.page.locator('.plan');
  }

  plan(name: string): Locator {
    return this.page
      .locator('.plan')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  get featuredPlan(): Locator {
    return this.page.locator('.plan--featured');
  }

  get compareTable(): Locator {
    return this.page.locator('.compare-wrap table');
  }

  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }
}
