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

/**
 * Which tests this run takes. `npm run e2e` (scripts/e2e.mjs) runs the suite in two passes, so the
 * wall-clock vitals (LCP time, CLS, INP; tagged @vitals in tests/e2e/budgets.spec.ts) run after
 * everything else, one at a time: lab timings measure the machine as much as the page (ledger
 * "Rulings (integration)", 2026-10-23: the shell INP read 912 ms in a 4-worker run, 120–136 ms
 * alone). These filters combine with Playwright's own (files, -g, --project).
 * - E2E_PASS unset: every test, as a plain `playwright test` runs them.
 * - E2E_PASS=main: every test but the @vitals ones.
 * - E2E_PASS=vitals: only the @vitals tests, one worker, writing to test-results/vitals and
 *   playwright-report/vitals so the main pass's results (and test-results/visual) stay.
 */
function e2ePass(): 'all' | 'main' | 'vitals' {
  const raw = process.env.E2E_PASS?.trim();
  if (!raw) return 'all';
  if (raw === 'main' || raw === 'vitals') return raw;
  throw new Error(`E2E_PASS must be "main" or "vitals", got "${raw}"`);
}

const PASS = e2ePass();
const VITALS = /@vitals\b/;

/* Unit tests (tests/unit/*.test.ts) belong to Vitest; the visual captures have their own project. */
const DEVICE_IGNORE = ['unit/**', '**/visual.spec.ts'];

export default defineConfig({
  testDir: 'tests',
  // Playwright runs *.spec.ts only.
  testMatch: '**/*.spec.ts',
  testIgnore: 'unit/**',
  grep: PASS === 'vitals' ? VITALS : undefined,
  grepInvert: PASS === 'main' ? VITALS : undefined,
  workers: PASS === 'vitals' ? 1 : undefined,
  outputDir: PASS === 'vitals' ? 'test-results/vitals' : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: PASS === 'vitals' ? 'playwright-report/vitals' : 'playwright-report' }]]
    : [['list']],
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
    // E2E_SKIP_BUILD=1 serves the existing build (CI runs `npm run check`, which builds, first).
    command: process.env.E2E_SKIP_BUILD === '1' ? `npm run start -- -p ${PORT}` : `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    env: { CONTACT_TRANSPORT: 'log', NEXT_TELEMETRY_DISABLED: '1' },
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
