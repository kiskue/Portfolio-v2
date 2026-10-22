/**
 * npm run lhci: Lighthouse CI on the PLAN's four URLs (/, /projects/defensys-citizen, /showcase,
 * /contact), on mobile and then desktop (PLAN "Verification → Lighthouse CI").
 *
 * lighthouserc.json is the single source: the URLs, the server, and the assertions, which are
 * the mobile ones, so a plain `npx @lhci/cli@0.15.1 autorun` works on its own. LHCI groups runs
 * by URL and cannot vary a threshold by form factor, so the file's `formFactors` block (ignored
 * by LHCI) says what each form factor changes, and this script runs LHCI once per form factor
 * with a complete config derived from it:
 *   Performance ≥ 0.95 desktop, ≥ 0.90 mobile; Best practices ≥ 0.95; LCP ≤ 2.5 s;
 *   CLS ≤ 0.05; TBT ≤ 150 ms; Home scripts ≤ 180,000 B as served (gzip; .planning/measurements.md);
 *   Accessibility and SEO recorded as warnings (replica contrast may cap accessibility, and label
 *   mode is noindex by design), with the mode-independent SEO audits as errors.
 * --seo-strict makes SEO 1.0 an error: use it on a hide-mode build.
 * --seo-only implies --seo-strict and turns every other error into a warning, so only SEO decides
 *   the exit code. CI's hide-mode job uses it: the check job already asserts performance, best
 *   practices, the vitals and Home's scripts, over three runs, and a one-run copy of those
 *   assertions would fail the SEO job for reasons that are not SEO. The warnings and the reports
 *   still show every number.
 *
 * The CLI runs through npx at an exact version (no dependency). Build first (`npm run build`);
 * LHCI starts `next start` itself. Reports land in .lighthouseci/reports/<form factor>/.
 *
 * Usage: node scripts/measure-lighthouse.mjs [--form-factor=mobile|desktop|all] [--seo-strict]
 *          [--seo-only] [--port=3100] [--runs=3]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LHCI = '@lhci/cli@0.15.1';
export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_PORT = 3100;
const USAGE =
  'Usage: node scripts/measure-lighthouse.mjs [--form-factor=mobile|desktop|all] [--seo-strict] [--seo-only] [--port=3100] [--runs=3]';

/** The audits in Lighthouse 12's SEO category (the LHR's categories.seo.auditRefs). */
export const SEO_AUDITS = Object.freeze([
  'is-crawlable',
  'document-title',
  'meta-description',
  'http-status-code',
  'link-text',
  'crawlable-anchors',
  'robots-txt',
  'image-alt',
  'hreflang',
  'canonical',
  'structured-data',
]);

/** Whether an assertion key belongs to SEO: the category itself or one of its audits. */
export const isSeoAssertion = (key) => key === 'categories:seo' || SEO_AUDITS.includes(key);

/** The same assertion at warning level: "error" → "warn", ["error", options] → ["warn", options]. */
function asWarning(assertion) {
  const [level, ...options] = Array.isArray(assertion) ? assertion : [assertion];
  if (level !== 'error') return assertion;
  return options.length > 0 ? ['warn', ...options] : 'warn';
}

/** Parses `--name=value` and `--flag` arguments. */
export function parseArgs(argv) {
  const options = { formFactor: 'all', seoStrict: false, seoOnly: false, port: DEFAULT_PORT, runs: null };
  for (const arg of argv) {
    const [name, value] = arg.split('=', 2);
    if (name === '--form-factor' && ['mobile', 'desktop', 'all'].includes(value ?? '')) options.formFactor = value;
    else if (name === '--seo-strict' && value === undefined) options.seoStrict = true;
    else if (name === '--seo-only' && value === undefined) options.seoOnly = true;
    else if (name === '--port' && /^\d+$/.test(value ?? '')) options.port = Number(value);
    else if (name === '--runs' && /^[1-9]\d*$/.test(value ?? '')) options.runs = Number(value);
    else throw new Error(`unknown or invalid option ${arg}`);
  }
  return options;
}

/**
 * The complete LHCI config for one form factor, from lighthouserc.json: the form factor's
 * settings and performance threshold, SEO 1.0 when strict (or SEO only), the port, the run
 * count, and a report folder of its own.
 */
export function formFactorConfig(rc, formFactor, { seoStrict = false, seoOnly = false, port = DEFAULT_PORT, runs = null } = {}) {
  const variant = rc.formFactors?.[formFactor];
  if (!variant) throw new Error(`lighthouserc.json has no formFactors.${formFactor}`);
  const ci = structuredClone(rc.ci);
  const onPort = (text) => text.replaceAll(`:${DEFAULT_PORT}`, `:${port}`).replace(/(-p\s+)\d+/, `$1${port}`);
  ci.collect = {
    ...ci.collect,
    url: ci.collect.url.map(onPort),
    startServerCommand: onPort(ci.collect.startServerCommand),
    settings: { ...ci.collect.settings, ...variant.settings },
    ...(runs ? { numberOfRuns: runs } : {}),
  };
  for (const entry of ci.assert.assertMatrix) {
    if (entry.assertions['categories:performance']) entry.assertions['categories:performance'] = ['error', { minScore: variant.performance }];
    if ((seoStrict || seoOnly) && entry.assertions['categories:seo']) entry.assertions['categories:seo'] = ['error', { minScore: 1 }];
    if (seoOnly) {
      for (const [key, assertion] of Object.entries(entry.assertions)) {
        if (!isSeoAssertion(key)) entry.assertions[key] = asWarning(assertion);
      }
    }
  }
  ci.upload = { ...ci.upload, outputDir: `${ci.upload.outputDir}/${formFactor}` };
  return { ci };
}

function quote(arg) {
  return /^[\w@./:=-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`;
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`lhci: ${error.message}\n${USAGE}`);
    return 2;
  }
  const rc = JSON.parse(readFileSync(path.join(ROOT, 'lighthouserc.json'), 'utf8'));
  const formFactors = options.formFactor === 'all' ? Object.keys(rc.formFactors) : [options.formFactor];
  const configDir = path.join(ROOT, '.lighthouseci');
  mkdirSync(configDir, { recursive: true });
  const failed = [];
  for (const formFactor of formFactors) {
    const file = path.join(configDir, `lighthouserc.${formFactor}.json`);
    writeFileSync(file, `${JSON.stringify(formFactorConfig(rc, formFactor, options), null, 2)}\n`);
    console.log(`\nlhci: ${formFactor} (${LHCI}, config ${path.relative(ROOT, file)})`);
    // npx is a .cmd file on Windows, which Node only spawns through a shell.
    const args = ['--yes', LHCI, 'autorun', `--config=${file}`];
    const result = spawnSync('npx', args.map(quote), { cwd: ROOT, stdio: 'inherit', shell: true });
    if (result.status !== 0) failed.push(`${formFactor} (exit ${result.status ?? result.signal})`);
  }
  if (failed.length > 0) {
    console.error(`\nlhci: assertions failed for ${failed.join(', ')}. Reports: .lighthouseci/reports/`);
    return 1;
  }
  console.log('\nlhci: all assertions passed. Reports: .lighthouseci/reports/');
  return 0;
}

function invokedDirectly() {
  try {
    return realpathSync.native(process.argv[1] ?? '') === realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) process.exitCode = main();
