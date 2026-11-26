import { visualComparisonEnabled } from '../../src/config';
import { expect, test } from '../../src/fixtures';
import { DashboardPage, PricingPage } from '../../src/pages';

/**
 * Visual baselines.
 *
 * Each test asserts real content before it compares pixels. A screenshot-only
 * test passes happily against a blank page as long as the baseline is also
 * blank, which is how visual suites become useless without anyone noticing.
 *
 * Baselines are produced inside the Playwright Linux image. Anywhere else the
 * run is reported as skipped, not passed: a screenshot assertion that did not
 * compare anything must never look green.
 */
test.skip(
  !visualComparisonEnabled,
  `visual baselines are generated on Linux; this is ${process.platform}`,
);

test.describe('dashboard', () => {
  test('matches the committed full-page baseline', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();

    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.kpiCards).toHaveCount(4);
    await expect(dashboard.kpiValue('Pass rate')).toHaveText('98.4%');
    await expect(dashboard.recentRunsTable.getByRole('row')).toHaveCount(6);

    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('matches the KPI card component baseline', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();

    await expect(dashboard.kpiCards.first()).toBeVisible();
    await expect(dashboard.kpiCards.first()).toContainText('Pass rate');

    await expect(dashboard.kpiCards.first()).toHaveScreenshot('kpi-card.png');
  });

  test('matches the pass-rate chart baseline', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.open();

    await expect(dashboard.chart).toBeVisible();
    await expect(dashboard.chart).toHaveAttribute('aria-label', /pass rate trend/i);

    await expect(dashboard.chart).toHaveScreenshot('pass-rate-chart.png');
  });
});

test.describe('pricing', () => {
  test('matches the committed full-page baseline', async ({ page }) => {
    const pricing = new PricingPage(page);
    await pricing.open();

    await expect(pricing.heading).toHaveText('Test signal, not test noise');
    await expect(pricing.plans).toHaveCount(3);
    await expect(pricing.featuredPlan).toContainText('Team');
    await expect(pricing.compareTable.getByRole('row')).toHaveCount(6);

    await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
  });

  test('captures the featured plan in its hover state', async ({ page }) => {
    const pricing = new PricingPage(page);
    await pricing.open();

    const callToAction = pricing.featuredPlan.getByRole('button');
    await callToAction.scrollIntoViewIfNeeded();
    await callToAction.hover();

    await expect(pricing.featuredPlan).toHaveScreenshot('featured-plan-hover.png');
  });
});
