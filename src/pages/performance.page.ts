import type { Locator, Page } from '@playwright/test';

export type PerformanceVariant = 'stable' | 'heavy';

/** Performance lab pages. Deliberately not a `LabPage`: each variant is a path. */
export class PerformancePage {
  constructor(
    private readonly page: Page,
    private readonly variant: PerformanceVariant,
  ) {}

  get path(): string {
    return `/performance/${this.variant}.html`;
  }

  get heading(): Locator {
    return this.page.getByTestId('perf-header').getByRole('heading', { level: 1 });
  }

  get heroImage(): Locator {
    return this.page.locator('img.hero-media');
  }

  get lateBanner(): Locator {
    return this.page.getByTestId('late-banner');
  }

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }
}
