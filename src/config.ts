/**
 * Single source of truth for the lab target and its thresholds.
 *
 * Everything the tests compare against lives here, so a budget change is one
 * reviewed edit rather than a number buried inside a spec.
 */

export const siteUrl = (process.env.LAB_SITE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');

export const siteOrigin = new URL(siteUrl).origin;

/**
 * Core Web Vitals budgets.
 *
 * The LCP and CLS numbers are Google's "good" thresholds. TTFB and
 * DOMContentLoaded are tighter because the target is a local server: if either
 * of those is slow, the problem is in the page or the harness, not the network.
 */
export const performanceBudgets = {
  ttfbMs: 800,
  domContentLoadedMs: 2_000,
  largestContentfulPaintMs: 2_500,
  cumulativeLayoutShift: 0.1,
} as const;

/**
 * The negative control on `/performance/heavy.html` must actually register as
 * bad, otherwise the measurement harness is broken.
 */
export const regressionFloor = {
  cumulativeLayoutShift: 0.05,
  longTasks: 1,
} as const;

/**
 * The baseline page must not shift at all; this allowance only absorbs
 * sub-pixel rounding, it is not a budget.
 */
export const baselineAllowance = {
  cumulativeLayoutShift: 0.01,
} as const;

/**
 * Visual baselines are generated in the official Playwright Linux container, so
 * the committed PNGs are only meaningful there. On any other platform snapshot
 * assertions are reported as skipped instead of failing for font reasons.
 *
 * `PW_VISUAL_FORCE=1` opts in, which is how the failure-detection check is run
 * locally.
 */
export const visualComparisonEnabled =
  process.platform === 'linux' || process.env.PW_VISUAL_FORCE === '1';
