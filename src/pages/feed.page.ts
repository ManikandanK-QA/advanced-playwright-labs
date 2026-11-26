import type { Locator } from '@playwright/test';

import { LabPage } from './base.page';

/** `/network/feed.html`: a fetch-driven list with explicit async states. */
export class FeedPage extends LabPage {
  readonly path = '/network/feed.html';

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Engineering feed' });
  }

  get loading(): Locator {
    return this.page.getByTestId('loading');
  }

  get error(): Locator {
    return this.page.getByTestId('error');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('error-message');
  }

  get empty(): Locator {
    return this.page.getByTestId('empty');
  }

  get articles(): Locator {
    return this.page.getByTestId('article');
  }

  get reloadButton(): Locator {
    return this.page.getByTestId('reload');
  }

  async titles(): Promise<string[]> {
    return this.articles.locator('.article-title').allTextContents();
  }

  async reload(): Promise<void> {
    await this.reloadButton.click();
  }

  /** Waits for the nth article without asserting anything about its content. */
  async waitForArticles(count: number): Promise<void> {
    await this.articles.nth(count - 1).waitFor({ state: 'visible' });
  }
}
