import type { Page } from '@playwright/test';

import { installVitalsObserver, readVitals, type Vitals } from '../support/vitals';

/**
 * Navigates, waits for the page's own "settled" signal, flushes two frames and
 * then reads the metrics. No fixed sleeps: the page decides when it is done.
 */
export async function collectVitals(page: Page, path: string): Promise<Vitals> {
  await page.addInitScript(installVitalsObserver);
  await page.goto(path);

  await page.waitForFunction(() => Boolean((window as WindowWithSettled).__labSettled), undefined, {
    timeout: 15_000,
  });

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  return page.evaluate(readVitals);
}

interface WindowWithSettled extends Window {
  __labSettled?: boolean;
}
