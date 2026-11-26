import type { Page } from '@playwright/test';

/**
 * Page objects expose intent and locators. They never assert: an assertion here
 * would report the failure at a helper line instead of at the spec line.
 */
export abstract class LabPage {
  abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  async open(query: Record<string, string> = {}): Promise<void> {
    const search = new URLSearchParams(query).toString();
    await this.page.goto(search ? `${this.path}?${search}` : this.path);
  }
}
