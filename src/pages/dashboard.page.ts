import type { Locator } from '@playwright/test';

import { LabPage } from './base.page';

/** `/visual/dashboard.html`: fixed-data dashboard used for visual baselines. */
export class DashboardPage extends LabPage {
  readonly path = '/visual/dashboard.html';

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Quality overview' });
  }

  get kpiCards(): Locator {
    return this.page.getByTestId('kpi-card');
  }

  /** The named KPI's value, e.g. "98.4%". */
  kpiValue(label: string): Locator {
    return this.page.getByTestId('kpi-card').filter({ hasText: label }).locator('.kpi-value');
  }

  get chart(): Locator {
    return this.page.locator('svg.chart');
  }

  get failingSuites(): Locator {
    return this.page.locator('.failure-row');
  }

  get recentRunsTable(): Locator {
    return this.page.locator('table.table');
  }
}
