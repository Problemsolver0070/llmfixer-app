import { defineConfig } from '@playwright/test';

/**
 * Standalone Playwright config for the post-R4 signup smoke suite.
 *
 * Parameterized by PLAYWRIGHT_BASE_URL so the same suite runs against
 * a local vite dev server (default http://localhost:3000) pre-deploy,
 * and against https://thefixer.in post-deploy. The caller is expected
 * to spin up vite (or hit prod) themselves: no webServer block here.
 */
export default defineConfig({
  testDir: './tests/e2e/signup',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  // No webServer block: callers spin up vite themselves (or hit prod).
});
