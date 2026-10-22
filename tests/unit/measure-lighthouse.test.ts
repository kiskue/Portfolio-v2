import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * npm run lhci (scripts/measure-lighthouse.mjs) and lighthouserc.json decide which Lighthouse
 * numbers fail the build. These tests pin the PLAN's targets (PLAN "Verification → Lighthouse CI",
 * PLAN.md lines 411-421) in the real lighthouserc.json, so loosening a threshold, dropping a URL or
 * easing how runs are measured fails here. They also check what each option does to the config
 * LHCI receives: the form factor's performance target, --seo-strict, --seo-only (CI's hide-mode
 * job, where only SEO decides the exit code), --port and --runs. main() runs with spawnSync and
 * the config writes stubbed, so no npx, Lighthouse or server starts.
 */

// main() writes .lighthouseci/lighthouserc.<form factor>.json and runs `npx @lhci/cli autorun`.
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

type Level = 'off' | 'warn' | 'error';
type Options = Readonly<Record<string, number>>;
type Assertion = Level | readonly [Level, Options];

interface MatrixEntry {
  readonly matchingUrlPattern: string;
  readonly aggregationMethod?: string;
  readonly assertions: Readonly<Record<string, Assertion>>;
}

/** The config LHCI runs on: lighthouserc.json's `ci` block. */
interface LhciConfig {
  readonly ci: {
    readonly collect: {
      readonly url: readonly string[];
      readonly startServerCommand: string;
      readonly numberOfRuns?: number;
      readonly settings?: Readonly<Record<string, unknown>>;
    };
    readonly assert: { readonly assertMatrix: readonly MatrixEntry[] };
    readonly upload: { readonly target: string; readonly outputDir: string };
  };
}

/** lighthouserc.json: the LHCI config, plus what each form factor changes (ignored by LHCI). */
interface LighthouseRc extends LhciConfig {
  readonly formFactors: Readonly<Record<string, { readonly settings: Readonly<Record<string, unknown>>; readonly performance: number }>>;
}

interface LhciOptions {
  readonly formFactor: string;
  readonly seoStrict: boolean;
  readonly seoOnly: boolean;
  readonly port: number;
  readonly runs: number | null;
}

/** What scripts/measure-lighthouse.mjs exports. */
interface MeasureLighthouse {
  readonly LHCI: string;
  readonly ROOT: string;
  readonly SEO_AUDITS: readonly string[];
  isSeoAssertion(key: string): boolean;
  parseArgs(argv: readonly string[]): LhciOptions;
  formFactorConfig(rc: LighthouseRc, formFactor: string, options?: Partial<LhciOptions>): LhciConfig;
  main(argv?: readonly string[]): number;
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/*
 * Loaded by URL and typed above: tsconfig has allowJs off, and a static import of an .mjs needs a
 * .d.mts beside it (as scripts/content-todo.mjs has), which this script does not have.
 */
const lighthouse = (await import(/* @vite-ignore */ pathToFileURL(path.join(ROOT, 'scripts', 'measure-lighthouse.mjs')).href)) as MeasureLighthouse;
const { formFactorConfig, isSeoAssertion, parseArgs } = lighthouse;

/** The real lighthouserc.json. */
const rc = JSON.parse(readFileSync(path.join(ROOT, 'lighthouserc.json'), 'utf8')) as LighthouseRc;

const FORM_FACTORS = ['mobile', 'desktop'] as const;
type FormFactor = (typeof FORM_FACTORS)[number];

/** The four URLs Lighthouse CI audits (PLAN.md line 411). */
const PLAN_PATHS = ['/', '/projects/defensys-citizen', '/showcase', '/contact'];
/** Performance ≥0.95 on desktop, ≥0.90 on mobile (PLAN.md line 415). */
const PERFORMANCE: Readonly<Record<FormFactor, number>> = { mobile: 0.9, desktop: 0.95 };
/** Best practices ≥0.95, LCP ≤2.5 s, CLS ≤0.05 and TBT ≤150 ms, as errors (PLAN.md lines 416-419). */
const PLAN_ERRORS: Readonly<Record<string, readonly ['error', Options]>> = {
  'categories:best-practices': ['error', { minScore: 0.95 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
  'total-blocking-time': ['error', { maxNumericValue: 150 }],
};
/** SEO 1.0 in hide mode (PLAN.md line 420). Label mode is noindex, so by default SEO is only a warning. */
const SEO_ERROR: Assertion = ['error', { minScore: 1 }];
const SEO_WARNING: Assertion = ['warn', { minScore: 1 }];
/** Accessibility is recorded; replica contrast may cap it below 1.0 (PLAN.md line 421). */
const ACCESSIBILITY: Assertion = ['warn', { minScore: 1 }];
/** The SEO audits that do not depend on the placeholder mode: errors in every mode. */
const SEO_AUDITS = ['document-title', 'meta-description', 'http-status-code', 'link-text', 'crawlable-anchors', 'robots-txt', 'hreflang', 'canonical'];
/**
 * Home's scripts against 180,000 B, as a warning (ledger "Rulings (integration)"): the PLAN's JS
 * budget is first-load JS, which tests/e2e/budgets.spec.ts enforces exactly.
 */
const HOME_SCRIPT_SIZE: Assertion = ['warn', { maxNumericValue: 180_000 }];

const urlOn = (port: number, pathname: string): string => `http://localhost:${port}${pathname}`;
const levelOf = (assertion: Assertion): Level => (typeof assertion === 'string' ? assertion : assertion[0]);

/** What LHCI asserts on `url`: the assertions of every matrix entry whose matchingUrlPattern matches it. */
function assertedOn(config: LhciConfig, url: string): Record<string, Assertion[]> {
  const asserted: Record<string, Assertion[]> = {};
  for (const entry of config.ci.assert.assertMatrix) {
    if (!new RegExp(entry.matchingUrlPattern).test(url)) continue;
    for (const [key, assertion] of Object.entries(entry.assertions)) (asserted[key] ??= []).push(assertion);
  }
  return asserted;
}

/**
 * The PLAN's targets, each asserted exactly once on every URL `config` collects: performance at the
 * form factor's target, the other PLAN targets as errors, `seo` for the SEO category, the
 * mode-independent SEO audits as errors, accessibility recorded, and Home's script size on Home only.
 */
function expectPlanTargets(config: LhciConfig, formFactor: FormFactor, seo: Assertion): void {
  for (const url of config.ci.collect.url) {
    const asserted = assertedOn(config, url);
    expect(asserted['categories:performance'], `${url} performance`).toEqual([['error', { minScore: PERFORMANCE[formFactor] }]]);
    for (const [key, target] of Object.entries(PLAN_ERRORS)) expect(asserted[key], `${url} ${key}`).toEqual([target]);
    expect(asserted['categories:seo'], `${url} SEO`).toEqual([seo]);
    expect(asserted['categories:accessibility'], `${url} accessibility`).toEqual([ACCESSIBILITY]);
    for (const audit of SEO_AUDITS) expect(asserted[audit], `${url} ${audit}`).toEqual(['error']);
    const home = new URL(url).pathname === '/';
    expect(asserted['resource-summary:script:size'], `${url} script size`).toEqual(home ? [HOME_SCRIPT_SIZE] : undefined);
  }
}

/** `config` with `key` set to `assertion` wherever the matrix asserts it. */
function withAssertion(config: LhciConfig, key: string, assertion: Assertion): LhciConfig {
  const assertMatrix = config.ci.assert.assertMatrix.map((entry) =>
    key in entry.assertions ? { ...entry, assertions: { ...entry.assertions, [key]: assertion } } : entry,
  );
  return { ...config, ci: { ...config.ci, assert: { ...config.ci.assert, assertMatrix } } };
}

/** `config` without the assertion levels: what is measured and against which thresholds, not what fails. */
function thresholds(config: LhciConfig): unknown {
  const matrix = config.ci.assert.assertMatrix.map((entry) => ({
    ...entry,
    assertions: Object.fromEntries(Object.entries(entry.assertions).map(([key, assertion]) => [key, typeof assertion === 'string' ? null : assertion.slice(1)])),
  }));
  return { ...config, ci: { ...config.ci, assert: { ...config.ci.assert, assertMatrix: matrix } } };
}

describe('parseArgs', () => {
  const DEFAULTS: LhciOptions = { formFactor: 'all', seoStrict: false, seoOnly: false, port: 3100, runs: null };

  /** parseArgs on one bad argument, which it must refuse by name. */
  const expectRefused = (arg: string): void => {
    expect(() => parseArgs([arg]), arg).toThrow(`unknown or invalid option ${arg}`);
  };

  it("defaults to both form factors, label-mode SEO, port 3100 and the file's run count", () => {
    expect(parseArgs([])).toEqual(DEFAULTS);
  });

  it('takes --seo-only as a bare flag, and refuses a value', () => {
    expect(parseArgs(['--seo-only'])).toEqual({ ...DEFAULTS, seoOnly: true });
    expect(() => parseArgs(['--seo-only=1'])).toThrow(/invalid option/);
    for (const arg of ['--seo-only=1', '--seo-only=true', '--seo-only=']) expectRefused(arg);
  });

  it('takes --seo-strict as a bare flag, and refuses a value', () => {
    expect(parseArgs(['--seo-strict'])).toEqual({ ...DEFAULTS, seoStrict: true });
    for (const arg of ['--seo-strict=1', '--seo-strict=false', '--seo-strict=']) expectRefused(arg);
  });

  it('takes --form-factor=mobile, desktop or all, and nothing else', () => {
    for (const formFactor of ['mobile', 'desktop', 'all']) expect(parseArgs([`--form-factor=${formFactor}`])).toEqual({ ...DEFAULTS, formFactor });
    for (const arg of ['--form-factor', '--form-factor=', '--form-factor=tablet', '--form-factor=Desktop', '--form-factor=desktop=mobile']) expectRefused(arg);
  });

  it('takes --port=<digits>', () => {
    expect(parseArgs(['--port=3122'])).toEqual({ ...DEFAULTS, port: 3122 });
    for (const arg of ['--port', '--port=', '--port=abc', '--port=-1', '--port=31.22', '--port=3122x', '--port=3122=3100']) expectRefused(arg);
  });

  it('takes --runs=<a positive whole number>', () => {
    expect(parseArgs(['--runs=1'])).toEqual({ ...DEFAULTS, runs: 1 });
    expect(parseArgs(['--runs=12']).runs).toBe(12);
    for (const arg of ['--runs', '--runs=', '--runs=0', '--runs=-1', '--runs=1.5', '--runs=three', '--runs=3=1']) expectRefused(arg);
  });

  it('refuses unknown options and bare words', () => {
    for (const arg of ['--nope', '--seo', '--form-factors=all', '-p', 'desktop', '']) expectRefused(arg);
  });

  it("parses CI's hide-mode flags, and lets a later value win", () => {
    // .github/workflows/ci.yml: npm run lhci -- --form-factor=desktop --seo-only --runs=1
    expect(parseArgs(['--form-factor=desktop', '--seo-only', '--runs=1'])).toEqual({ ...DEFAULTS, formFactor: 'desktop', seoOnly: true, runs: 1 });
    expect(parseArgs(['--port=3122', '--port=3123']).port).toBe(3123);
  });
});

describe('lighthouserc.json: the PLAN targets (PLAN.md lines 411-421)', () => {
  it("collects the PLAN's four URLs from `next start` on port 3100, three runs each", () => {
    expect(rc.ci.collect.url).toEqual(PLAN_PATHS.map((pathname) => urlOn(3100, pathname)));
    expect(rc.ci.collect.startServerCommand).toBe('npm run start -- -p 3100');
    expect(rc.ci.collect.numberOfRuns).toBe(3);
  });

  it('asserts the median run of every URL, never the best one', () => {
    expect(rc.ci.assert.assertMatrix.length).toBeGreaterThan(0);
    for (const entry of rc.ci.assert.assertMatrix) expect(entry.aggregationMethod, entry.matchingUrlPattern).toBe('median-run');
  });

  it("sets each form factor's performance target and Lighthouse settings: mobile 0.90 on the default (mobile) run, desktop 0.95 on the desktop preset", () => {
    expect(rc.formFactors).toEqual({
      mobile: { settings: {}, performance: PERFORMANCE.mobile },
      desktop: { settings: { preset: 'desktop' }, performance: PERFORMANCE.desktop },
    });
    // Nothing changes throttling or emulation for both form factors at once.
    expect(rc.ci.collect.settings).toBeUndefined();
  });

  it('asserts the mobile targets itself, so a plain `lhci autorun` on the file checks mobile', () => {
    expectPlanTargets(rc, 'mobile', SEO_WARNING);
    expect(formFactorConfig(rc, 'mobile').ci.assert).toEqual(rc.ci.assert);
  });

  it("scopes Home's script size, a warning at 180,000 B, to / alone", () => {
    const scoped = rc.ci.assert.assertMatrix.filter((entry) => 'resource-summary:script:size' in entry.assertions);
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.assertions['resource-summary:script:size']).toEqual(HOME_SCRIPT_SIZE);
    const pattern = new RegExp(scoped[0]?.matchingUrlPattern ?? '');
    expect(rc.ci.collect.url.filter((url) => pattern.test(url))).toEqual([urlOn(3100, '/')]);
  });
});

describe('formFactorConfig: label mode (no flags)', () => {
  it.each(FORM_FACTORS)('%s: the PLAN targets as errors on every URL; SEO and accessibility recorded as warnings', (formFactor) => {
    expectPlanTargets(formFactorConfig(rc, formFactor), formFactor, SEO_WARNING);
  });

  it('mobile performance is 0.90 and desktop 0.95, both errors', () => {
    for (const formFactor of FORM_FACTORS) {
      const asserted = assertedOn(formFactorConfig(rc, formFactor), urlOn(3100, '/showcase'));
      expect(asserted['categories:performance'], formFactor).toEqual([['error', { minScore: PERFORMANCE[formFactor] }]]);
    }
  });

  it.each(FORM_FACTORS)("%s: the form factor's settings, the file's runs, and a report folder of its own", (formFactor) => {
    const { collect, upload } = formFactorConfig(rc, formFactor).ci;
    expect(collect.settings).toEqual(formFactor === 'desktop' ? { preset: 'desktop' } : {});
    expect(collect.numberOfRuns).toBe(3);
    expect(upload).toEqual({ target: 'filesystem', outputDir: `.lighthouseci/reports/${formFactor}` });
  });

  it('writes only the LHCI block, and never changes the lighthouserc.json it is given (main reuses it per form factor)', () => {
    const before = structuredClone(rc);
    for (const formFactor of FORM_FACTORS) {
      for (const options of [{}, { seoStrict: true }, { seoOnly: true, port: 3122, runs: 1 }]) {
        expect(Object.keys(formFactorConfig(rc, formFactor, options))).toEqual(['ci']);
      }
    }
    expect(rc).toEqual(before);
  });

  it('refuses a form factor the file does not define', () => {
    expect(() => formFactorConfig(rc, 'tablet')).toThrow('lighthouserc.json has no formFactors.tablet');
  });
});

describe('formFactorConfig: --seo-strict (a hide-mode build)', () => {
  it.each(FORM_FACTORS)('%s: SEO 1.0 becomes an error, and nothing else changes', (formFactor) => {
    const strict = formFactorConfig(rc, formFactor, { seoStrict: true });
    expectPlanTargets(strict, formFactor, SEO_ERROR);
    expect(strict).toEqual(withAssertion(formFactorConfig(rc, formFactor), 'categories:seo', SEO_ERROR));
  });
});

describe("formFactorConfig: --seo-only (CI's hide-mode job)", () => {
  const config = formFactorConfig(rc, 'desktop', { seoOnly: true });

  it('keeps SEO 1.0 as an error on every URL', () => {
    for (const url of config.ci.collect.url) expect(assertedOn(config, url)['categories:seo'], url).toEqual([SEO_ERROR]);
  });

  it('keeps the 8 mode-independent SEO audits as errors', () => {
    for (const url of config.ci.collect.url) {
      const asserted = assertedOn(config, url);
      for (const audit of SEO_AUDITS) expect(asserted[audit], `${url} ${audit}`).toEqual(['error']);
    }
  });

  it('turns performance into a warning at the desktop target', () => {
    for (const url of config.ci.collect.url) expect(assertedOn(config, url)['categories:performance'], url).toEqual([['warn', { minScore: 0.95 }]]);
  });

  it('turns LCP, CLS, TBT and best practices into warnings, keeping their thresholds', () => {
    for (const url of config.ci.collect.url) {
      const asserted = assertedOn(config, url);
      for (const [key, [, options]] of Object.entries(PLAN_ERRORS)) expect(asserted[key], `${url} ${key}`).toEqual([['warn', options]]);
    }
  });

  it("leaves the warnings as they were: accessibility, and Home's script size", () => {
    for (const url of config.ci.collect.url) expect(assertedOn(config, url)['categories:accessibility'], url).toEqual([ACCESSIBILITY]);
    expect(assertedOn(config, urlOn(3100, '/'))['resource-summary:script:size']).toEqual([HOME_SCRIPT_SIZE]);
  });

  it('leaves SEO as the only error, so only SEO decides the exit code', () => {
    const errors = new Set(config.ci.assert.assertMatrix.flatMap((entry) => Object.keys(entry.assertions).filter((key) => levelOf(entry.assertions[key] ?? 'off') === 'error')));
    expect(errors).toEqual(new Set(['categories:seo', ...SEO_AUDITS]));
    for (const key of errors) expect(isSeoAssertion(key), key).toBe(true);
  });

  it('changes levels only: the same URLs, settings and thresholds as --seo-strict', () => {
    expect(thresholds(config)).toEqual(thresholds(formFactorConfig(rc, 'desktop', { seoStrict: true })));
  });

  it('implies --seo-strict, and works the same on mobile, with performance 0.90 as a warning', () => {
    expect(formFactorConfig(rc, 'desktop', { seoOnly: true, seoStrict: true })).toEqual(config);
    const mobile = assertedOn(formFactorConfig(rc, 'mobile', { seoOnly: true }), urlOn(3100, '/contact'));
    expect(mobile['categories:performance']).toEqual([['warn', { minScore: 0.9 }]]);
    expect(mobile['categories:seo']).toEqual([SEO_ERROR]);
    expect(mobile['canonical']).toEqual(['error']);
  });
});

describe('isSeoAssertion', () => {
  it('knows the SEO category and every SEO audit lighthouserc.json asserts, and nothing else', () => {
    expect(isSeoAssertion('categories:seo')).toBe(true);
    for (const audit of SEO_AUDITS) expect(isSeoAssertion(audit), audit).toBe(true);
    for (const audit of SEO_AUDITS) expect(lighthouse.SEO_AUDITS, audit).toContain(audit);
    const others = ['categories:performance', 'categories:accessibility', ...Object.keys(PLAN_ERRORS), 'resource-summary:script:size'];
    for (const key of others) expect(isSeoAssertion(key), key).toBe(false);
  });
});

describe('formFactorConfig: --port and --runs', () => {
  it('--port moves every collect URL and the start command to the same port', () => {
    const { collect } = formFactorConfig(rc, 'desktop', { port: 3122 }).ci;
    expect(collect.url).toEqual(PLAN_PATHS.map((pathname) => urlOn(3122, pathname)));
    expect(collect.startServerCommand).toBe('npm run start -- -p 3122');
    const served = /\s-p\s+(\d+)\b/.exec(collect.startServerCommand)?.[1];
    for (const url of collect.url) expect(new URL(url).port, url).toBe(served);
    expect(JSON.stringify(collect)).not.toContain('3100');
  });

  it.each(FORM_FACTORS)("%s: --port keeps every assertion, and Home's script size on Home alone", (formFactor) => {
    const moved = formFactorConfig(rc, formFactor, { port: 3122 });
    expectPlanTargets(moved, formFactor, SEO_WARNING);
    expect(moved.ci.assert).toEqual(formFactorConfig(rc, formFactor).ci.assert);
  });

  it('the default port leaves the URLs and the start command as the file has them', () => {
    const { collect } = formFactorConfig(rc, 'mobile', { port: 3100 }).ci;
    expect(collect.url).toEqual(rc.ci.collect.url);
    expect(collect.startServerCommand).toBe(rc.ci.collect.startServerCommand);
  });

  it('takes the port and the run count from the command line', () => {
    const { collect } = formFactorConfig(rc, 'desktop', parseArgs(['--port=3122', '--runs=1'])).ci;
    expect(collect.url[0]).toBe(urlOn(3122, '/'));
    expect(collect.numberOfRuns).toBe(1);
  });

  it("--runs replaces the file's three runs for this run only", () => {
    expect(formFactorConfig(rc, 'mobile', { runs: 5 }).ci.collect.numberOfRuns).toBe(5);
    expect(formFactorConfig(rc, 'mobile', { runs: null }).ci.collect.numberOfRuns).toBe(3);
    expect(rc.ci.collect.numberOfRuns).toBe(3);
  });
});

describe('main (npm run lhci), with npx and the config files stubbed', () => {
  const spawn = vi.mocked(spawnSync);
  const write = vi.mocked(writeFileSync);
  let errors: string[];

  /** A finished LHCI run, as spawnSync reports it. */
  const finished = (status: number | null, signal: NodeJS.Signals | null = null) => ({ status, signal }) as unknown as ReturnType<typeof spawnSync>;
  /** An argument as the shell receives it, without the quotes main() adds around paths with spaces or backslashes. */
  const unquote = (arg: string): string => (/^".*"$/.test(arg) ? arg.slice(1, -1).replaceAll('\\"', '"') : arg);
  const configFile = (formFactor: string): string => path.join(lighthouse.ROOT, '.lighthouseci', `lighthouserc.${formFactor}.json`);

  /** The configs main() wrote, in order: file and parsed content. */
  const written = (): [string, unknown][] => write.mock.calls.map(([file, text]) => [String(file), JSON.parse(String(text))]);
  /** The LHCI runs main() started, in order. */
  const runs = () => spawn.mock.calls.map(([command, args, options]) => ({ command, args: (args ?? []).map(unquote), cwd: options?.cwd, shell: options?.shell }));
  const lhciRun = (formFactor: string) => ({ command: 'npx', args: ['--yes', lighthouse.LHCI, 'autorun', `--config=${configFile(formFactor)}`], cwd: lighthouse.ROOT, shell: true });

  beforeEach(() => {
    spawn.mockReset().mockReturnValue(finished(0));
    write.mockReset();
    vi.mocked(mkdirSync).mockReset();
    errors = [];
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation((line: unknown) => {
      errors.push(String(line));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs LHCI once per form factor, mobile then desktop, each on a complete config of its own', () => {
    expect(lighthouse.main([])).toBe(0);
    expect(mkdirSync).toHaveBeenCalledWith(path.join(lighthouse.ROOT, '.lighthouseci'), { recursive: true });
    expect(written()).toEqual(FORM_FACTORS.map((formFactor) => [configFile(formFactor), formFactorConfig(rc, formFactor)]));
    expect(runs()).toEqual(FORM_FACTORS.map(lhciRun));
  });

  it("hands every option to the config it writes (CI's hide-mode job)", () => {
    expect(lighthouse.main(['--form-factor=desktop', '--seo-only', '--runs=1', '--port=3122'])).toBe(0);
    expect(written()).toEqual([[configFile('desktop'), formFactorConfig(rc, 'desktop', { seoOnly: true, runs: 1, port: 3122 })]]);
    expect(runs()).toEqual([lhciRun('desktop')]);
  });

  it('exits 1 when a form factor fails, after running the others', () => {
    spawn.mockReturnValueOnce(finished(1));
    expect(lighthouse.main([])).toBe(1);
    expect(runs()).toEqual(FORM_FACTORS.map(lhciRun));
    expect(errors.join('\n')).toContain('lhci: assertions failed for mobile (exit 1)');
  });

  it('counts a run stopped by a signal as a failure', () => {
    spawn.mockReturnValue(finished(null, 'SIGTERM'));
    expect(lighthouse.main(['--form-factor=desktop'])).toBe(1);
    expect(errors.join('\n')).toContain('lhci: assertions failed for desktop (exit SIGTERM)');
  });

  it('exits 2 with the usage on a bad option, before writing or running anything', () => {
    expect(lighthouse.main(['--seo-only=1'])).toBe(2);
    expect(errors.join('\n')).toMatch(/^lhci: unknown or invalid option --seo-only=1\nUsage: node scripts\/measure-lighthouse\.mjs /);
    expect(write).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('runs the Lighthouse CI CLI at an exact version', () => {
    expect(lighthouse.LHCI).toMatch(/^@lhci\/cli@\d+\.\d+\.\d+$/);
  });
});
