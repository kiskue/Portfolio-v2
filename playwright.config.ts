import { defineConfig } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  // Unit tests (tests/unit/*.test.ts) belong to Vitest; Playwright runs *.spec.ts only.
  testMatch: '**/*.spec.ts',
  testIgnore: 'unit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      use: { browserName: 'chromium', viewport: { width: 834, height: 1194 } },
    },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    env: { CONTACT_TRANSPORT: 'log' },
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
