import { expect, test } from '../../src/fixtures';
import { SecurityPage } from '../../src/pages';

/**
 * Browser-enforced security, not policy prose.
 *
 * The payload injects a real handler. If CSP were missing, the handler would run
 * and set a global; the same payload rendered as text proves the sink difference.
 */
const PAYLOAD = '<b>injected</b><img src=x onerror="window.__xssExecuted=1">';

interface CspViolation {
  directive: string;
  blockedURI: string;
}

interface LabWindow extends Window {
  __inlineRan?: boolean;
  __xssExecuted?: number;
  __cspViolations?: CspViolation[];
}

test('blocks the inline script on the page', async ({ page }) => {
  const security = new SecurityPage(page);
  await security.openCsp(PAYLOAD);

  expect(await page.evaluate(() => (window as LabWindow).__inlineRan)).toBeUndefined();
  await expect(security.inlineStatus).toHaveText('blocked');

  const violations = await page.evaluate(() => (window as LabWindow).__cspViolations ?? []);
  expect(violations.length, 'no CSP violation was reported').toBeGreaterThan(0);
  expect(
    violations.some((violation) => violation.directive.startsWith('script-src')),
    `unexpected directives: ${violations.map((violation) => violation.directive).join(', ')}`,
  ).toBe(true);
});

test('renders reflected markup but never executes the injected handler', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });

  const security = new SecurityPage(page);
  await security.openCsp(PAYLOAD);

  // The sink really did parse the markup: this is not a no-op assertion.
  await expect(security.reflected.locator('b')).toHaveText('injected');
  await expect(security.reflected.locator('img')).toHaveCount(1);

  // Wait until the broken image has finished loading, so the error event has
  // definitely fired (or been refused) before we check for execution.
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-testid="reflected"] img');
    return image instanceof HTMLImageElement && image.complete;
  });

  expect(await page.evaluate(() => (window as LabWindow).__xssExecuted)).toBeUndefined();
  expect(dialogs).toEqual([]);
});

test('the safe sink treats the same payload as text', async ({ page }) => {
  const security = new SecurityPage(page);
  await security.openCsp(PAYLOAD);

  await expect(security.safe).toHaveText(PAYLOAD);
  await expect(security.safe.locator('b')).toHaveCount(0);
  await expect(security.safe.locator('img')).toHaveCount(0);
});
