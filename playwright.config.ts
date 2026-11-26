import { defineConfig, devices } from '@playwright/test';

import { siteUrl, visualComparisonEnabled } from './src/config';

const isCI = Boolean(process.env.CI);
const port = new URL(siteUrl).port || '80';

/**
 * One project per lab, not one project per browser.
 *
 *  - `visual`      screenshots, Chromium only, fixed viewport and DPR
 *  - `network`     route interception, Chromium only
 *  - `performance` Core Web Vitals, Chromium only (LCP/CLS/longtask APIs)
 *  - `security`    headers, cookies, CSP — plus two extra engines, because
 *                  browser security behaviour is exactly where engines differ
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  globalTimeout: 10 * 60_000,

  // Baselines are built inside the Playwright Linux image; elsewhere the
  // snapshot assertion is reported as skipped rather than failing on fonts.
  ignoreSnapshots: !visualComparisonEnabled,
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.2,
      // Absolute, not a ratio: a large page must not earn a larger allowance.
      // 100 px is below the size of any real regression and above raster noise
      // inside the pinned Linux image.
      maxDiffPixels: 100,
    },
  },

  reporter: isCI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: siteUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-testid',
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
  },

  webServer: {
    command: 'node apps/lab-site/server.mjs',
    url: `${siteUrl}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 30_000,
    env: { PORT: port },
  },

  projects: [
    {
      name: 'visual',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'network',
      testDir: './tests/network',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance',
      testDir: './tests/performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'security',
      testDir: './tests/security',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security-firefox',
      testDir: './tests/security',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'security-webkit',
      testDir: './tests/security',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
