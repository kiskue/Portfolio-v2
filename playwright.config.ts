import { defineConfig } from '@playwright/test';

/**
 * The production server's port: 3100 by default. E2E_PORT lets parallel runs (one worktree per
 * builder) use their own port, so `reuseExistingServer` never tests someone else's server.
 */
function port(): number {
  const raw = process.env.E2E_PORT?.trim();
  if (!raw) return 3100;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`E2E_PORT must be a port number (1024-65535), got "${raw}"`);
  return value;
}

const PORT = port();
const baseURL = `http://localhost:${PORT}`;

/* Unit tests (tests/unit/*.test.ts) belong to Vitest; the visual captures have their own project. */
const DEVICE_IGNORE = ['unit/**', '**/visual.spec.ts'];

export default defineConfig({
  testDir: 'tests',
  // Playwright runs *.spec.ts only.
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
      testIgnore: DEVICE_IGNORE,
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
      testIgnore: DEVICE_IGNORE,
      use: { browserName: 'chromium', viewport: { width: 834, height: 1194 } },
    },
    {
      name: 'desktop',
      testIgnore: DEVICE_IGNORE,
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      // npm run visual: captures at 1447×722, 390, 1024 and 1920 in light and dark (the spec sets
      // each viewport). Baselines (toHaveScreenshot) are added under tests/visual after sign-off.
      name: 'visual',
      testMatch: '**/visual.spec.ts',
      snapshotPathTemplate: '{testDir}/visual/{arg}{ext}',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    env: { CONTACT_TRANSPORT: 'log', NEXT_TELEMETRY_DISABLED: '1' },
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
