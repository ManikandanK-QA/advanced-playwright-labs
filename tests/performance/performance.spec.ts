import {
  baselineAllowance,
  performanceBudgets,
  regressionFloor,
  siteOrigin,
} from '../../src/config';
import { expect, test } from '../../src/fixtures';
import { collectVitals } from '../../src/support/collect-vitals';

test('baseline page stays inside every Core Web Vital budget', async ({ page }) => {
  const vitals = await collectVitals(page, '/performance/stable.html');

  expect(vitals.lcpMs, 'LCP was never observed').not.toBeNull();
  expect(vitals.lcpMs ?? Number.POSITIVE_INFINITY).toBeLessThan(
    performanceBudgets.largestContentfulPaintMs,
  );
  expect(vitals.cls).toBeLessThanOrEqual(baselineAllowance.cumulativeLayoutShift);
  expect(vitals.ttfbMs).toBeGreaterThan(0);
  expect(vitals.ttfbMs).toBeLessThan(performanceBudgets.ttfbMs);
  expect(vitals.domContentLoadedMs).toBeLessThan(performanceBudgets.domContentLoadedMs);
  expect(vitals.longTasks, 'the baseline page must not block the main thread').toBe(0);
});

test('baseline page loads no third-party resources', async ({ page }) => {
  const vitals = await collectVitals(page, '/performance/stable.html');

  const foreign = vitals.resources.filter((resource) => !resource.name.startsWith(siteOrigin));
  expect(foreign, 'the lab must be fully self-hosted').toEqual([]);
  expect(vitals.resources.some((resource) => resource.name.endsWith('/assets/hero.svg'))).toBe(
    true,
  );
});

/**
 * Negative control. If this stops failing, the observer pipeline is broken and
 * every "green" performance result above is meaningless.
 */
test('detects the deliberately injected layout shift and long task', async ({ page }) => {
  const vitals = await collectVitals(page, '/performance/heavy.html');

  await expect(page.getByTestId('late-banner')).toBeVisible();

  expect(vitals.cls, 'injected layout shift was not measured').toBeGreaterThan(
    regressionFloor.cumulativeLayoutShift,
  );
  expect(vitals.longTasks, 'injected long task was not measured').toBeGreaterThanOrEqual(
    regressionFloor.longTasks,
  );
});
