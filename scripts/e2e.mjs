/**
 * npm run e2e: the whole Playwright suite in two passes (ledger "Rulings (integration)",
 * 2026-10-23: the wall-clock vitals tests run in their own serial pass after the parallel run,
 * with the same tests and thresholds).
 *   1. main    every test but the @vitals ones, in parallel (E2E_PASS=main);
 *   2. vitals  the @vitals tests (LCP time, CLS and INP in tests/e2e/budgets.spec.ts), one worker,
 *              with nothing else running (E2E_PASS=vitals, --workers=1).
 * playwright.config.ts turns E2E_PASS into each pass's filters. They combine with Playwright's
 * own, so arguments go to both passes: `npm run e2e -- tests/e2e/smoke.spec.ts`, `-g …`,
 * `--project=mobile`, `--workers=2` (the vitals pass keeps one worker).
 *
 * The suite builds once: the main pass's web server runs `npm run build` (unless E2E_SKIP_BUILD=1,
 * as in CI), and the vitals pass serves that build (E2E_SKIP_BUILD=1). A pass that selects no
 * tests is skipped, so a targeted run starts only the server it needs; a run that selects nothing
 * at all fails, as a plain `playwright test` does. The exit code is the worst of the passes.
 * Interactive runs (--ui, --debug) take one plain Playwright invocation.
 *
 * Usage: node scripts/e2e.mjs [playwright test arguments]
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

/** Playwright's CLI, run with this Node and no shell, so arguments pass through as they are. */
const PLAYWRIGHT = createRequire(import.meta.url).resolve('@playwright/test/cli');

export const PASSES = Object.freeze([
  { name: 'main', describe: 'every test but @vitals, in parallel', args: [] },
  // After the caller's arguments, so a --workers=N meant for the main pass never reaches this one.
  { name: 'vitals', describe: 'the @vitals tests, one at a time', args: ['--workers=1'] },
]);

const INTERACTIVE = /^--(ui|ui-host|ui-port|debug)(=|$)/;

function playwright(args, env, capture = false) {
  return spawnSync(process.execPath, [PLAYWRIGHT, 'test', ...args], { env, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
}

/** The test count in `playwright test --list` output, or null when it has none (--help, --version). */
export function listedCount(stdout) {
  const match = /^Total: (\d+) tests? in \d+ files?$/m.exec(stdout);
  return match ? Number(match[1]) : null;
}

/** The exit status of a finished Playwright run: a spawn error or a signal counts as a failure. */
function statusOf(result) {
  if (result.error) console.error(`e2e: could not run Playwright: ${result.error.message}`);
  return result.status ?? 1;
}

/**
 * Runs the passes. Returns the exit code: 0, Playwright's worst status (1 failed, 130
 * interrupted), or 1 when the arguments select no test.
 */
export function main(args = process.argv.slice(2), env = process.env) {
  if (args.some((arg) => INTERACTIVE.test(arg))) return statusOf(playwright(args, env));

  const planned = [];
  for (const pass of PASSES) {
    const listing = playwright(['--list', '--pass-with-no-tests', ...args, '--reporter=list'], { ...env, E2E_PASS: pass.name }, true);
    if (listing.status !== 0 || listing.error) {
      process.stdout.write(listing.stdout ?? '');
      process.stderr.write(listing.stderr ?? '');
      return statusOf(listing);
    }
    const count = listedCount(listing.stdout ?? '');
    if (count === null) {
      process.stdout.write(listing.stdout ?? '');
      return 0;
    }
    planned.push({ ...pass, count });
  }
  if (planned.every((pass) => pass.count === 0)) {
    console.error(`e2e: no tests found${args.length > 0 ? ` for: ${args.join(' ')}` : ''}`);
    return 1;
  }

  const results = [];
  let built = false;
  for (const pass of planned) {
    if (pass.count === 0) {
      console.log(`\ne2e: ${pass.name} pass skipped: no tests selected`);
      continue;
    }
    console.log(`\ne2e: ${pass.name} pass, ${pass.describe}: ${pass.count} test${pass.count === 1 ? '' : 's'}`);
    // The first pass's server built the site (or the caller already had): later passes serve it.
    const status = statusOf(playwright([...args, ...pass.args], { ...env, E2E_PASS: pass.name, ...(built ? { E2E_SKIP_BUILD: '1' } : {}) }));
    built = true;
    results.push({ name: pass.name, status });
    if (status === 130) break;
  }
  const summary = results.map(({ name, status }) => `${name} ${status === 0 ? 'passed' : `failed (exit ${status})`}`).join(', ');
  console.log(`\ne2e: ${summary}`);
  return Math.max(0, ...results.map((result) => result.status));
}

function invokedDirectly() {
  try {
    return realpathSync.native(process.argv[1] ?? '') === realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) process.exitCode = main();
