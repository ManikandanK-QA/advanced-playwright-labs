import type { Locator, Page } from '@playwright/test';

/**
 * Security lab pages. Each one waits for its own readiness flag rather than a
 * timeout, so assertions never race the script that fills the sink.
 */
export class SecurityPage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get reflected(): Locator {
    return this.page.getByTestId('reflected');
  }

  get safe(): Locator {
    return this.page.getByTestId('safe');
  }

  get inlineStatus(): Locator {
    return this.page.getByTestId('inline-status');
  }

  get documentCookie(): Locator {
    return this.page.getByTestId('document-cookie');
  }

  get storageDump(): Locator {
    return this.page.getByTestId('storage-dump');
  }

  async openCsp(payload: string): Promise<void> {
    await this.page.goto(`/security/csp-lab.html?payload=${encodeURIComponent(payload)}`);
    await this.page.waitForFunction(() => Boolean((window as WindowWithFlags).__cspReady));
  }

  async establishSession(): Promise<void> {
    await this.page.goto('/api/session');
  }

  async clearSession(): Promise<void> {
    await this.page.goto('/api/session/clear');
  }

  async openCookiesLab(): Promise<void> {
    await this.page.goto('/security/cookies-lab.html');
    await this.page.waitForFunction(() => Boolean((window as WindowWithFlags).__cookiesReady));
  }

  async openStorageLab(): Promise<void> {
    await this.page.goto('/security/storage-lab.html');
    await this.page.waitForFunction(() => Boolean((window as WindowWithFlags).__storageReady));
  }
}

interface WindowWithFlags extends Window {
  __cspReady?: boolean;
  __cookiesReady?: boolean;
  __storageReady?: boolean;
}
