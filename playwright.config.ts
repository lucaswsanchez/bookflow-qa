import { defineConfig, devices } from '@playwright/test';
import { BUSINESS_TZ } from './tests/support/dates';
import { env } from './tests/support/env';

const CI = !!process.env.CI;

/**
 * Projects
 * - setup          logs in once per pooled session (see tests/support/session-pool.ts)
 * - api            API tests with the request fixture (no browser)
 * - chromium       full E2E + accessibility suite
 * - firefox        cross-browser subset (@cross-browser)
 * - mobile-chrome  phone viewport subset (@mobile, @mobile-only)
 *
 * The suite runs against the public demo on Render's free tier, so it keeps a small number of
 * workers: enough to be quick, not enough to overload the API.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 3 : 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/playwright/results.json' }],
    ...(CI ? [['github'] as ['github']] : []),
  ],
  use: {
    baseURL: env.webUrl,
    timezoneId: BUSINESS_TZ,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      testMatch: /(e2e|a11y)\/.*\.spec\.ts/,
      grepInvert: /@mobile-only/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testMatch: /e2e\/.*\.spec\.ts/,
      grep: /@cross-browser/,
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testMatch: /e2e\/.*\.spec\.ts/,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
});
