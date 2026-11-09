import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';
import ts from 'typescript';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * npm run e2e (scripts/e2e.mjs) runs the Playwright suite in two passes (ledger "Rulings
 * (integration)", 2026-10-23): every test but the @vitals ones in parallel, then the wall-clock
 * vitals (tests/e2e/budgets.spec.ts › "Core Web Vitals in the lab") on one worker, with nothing
 * else running. playwright.config.ts turns E2E_PASS into each pass's filters. A slip in the
 * passes, the filters or the tag would drop tests from the gate, or put the vitals back under
 * parallel load, without any test going red. Playwright never starts here: the config is
 * evaluated per pass, the specs are read as text (TypeScript's parser), and main() runs with
 * spawnSync stubbed.
 */

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}));

interface Pass {
  readonly name: string;
  readonly describe: string;
  readonly args: readonly string[];
}

type Env = Readonly<Record<string, string | undefined>>;

/** What scripts/e2e.mjs exports. */
interface E2eRunner {
  readonly PASSES: readonly Pass[];
  listedCount(stdout: string): number | null;
  main(args?: readonly string[], env?: Env): number;
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/*
 * Loaded by URL and typed above: tsconfig has allowJs off, and a static import of an .mjs needs a
 * .d.mts beside it (as scripts/content-todo.mjs has), which this script does not have.
 */
const runner = (await import(/* @vite-ignore */ pathToFileURL(path.join(ROOT, 'scripts', 'e2e.mjs')).href)) as E2eRunner;
const { PASSES, listedCount } = runner;

/** Playwright's CLI, which the script runs. */
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli');

const TAG = '@vitals';
const BUDGETS = 'tests/e2e/budgets.spec.ts';
const GROUP = 'Core Web Vitals in the lab';

/** playwright.config.ts evaluated afresh with E2E_PASS set to `pass` (undefined: unset). */
async function configFor(pass: string | undefined): Promise<PlaywrightTestConfig> {
  vi.stubEnv('E2E_PASS', pass);
  vi.resetModules();
  try {
    return (await import('../../playwright.config')).default;
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
  }
}

/** Playwright's title matcher (createTitleMatcher): whether any of the patterns matches. */
function matches(filter: RegExp | RegExp[], title: string): boolean {
  return [filter].flat().some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(title);
  });
}

describe('PASSES', () => {
  it('describes exactly two passes: main, then vitals', () => {
    expect(PASSES.map((pass) => pass.name)).toEqual(['main', 'vitals']);
  });

  it("adds nothing to the main pass, so the caller's files, -g and --workers apply as given", () => {
    expect(PASSES[0]?.args).toEqual([]);
  });

  it("gives the vitals pass one worker (main() puts it after the caller's arguments, where it wins)", () => {
    expect(PASSES[1]?.args).toEqual(['--workers=1']);
  });
});

describe("each pass's filters in playwright.config.ts (E2E_PASS)", () => {
  let main: PlaywrightTestConfig;
  let vitals: PlaywrightTestConfig;
  let unset: PlaywrightTestConfig;

  beforeAll(async () => {
    main = await configFor('main');
    vitals = await configFor('vitals');
    unset = await configFor(undefined);
  });

  it("main leaves out @vitals, and takes the default or the caller's worker count", () => {
    expect(main.grep).toBeUndefined();
    expect(main.grepInvert !== undefined && matches(main.grepInvert, TAG)).toBe(true);
    expect(main.workers).toBeUndefined();
    expect(main.outputDir).toBeUndefined();
  });

  it('vitals selects only @vitals, on one worker, writing to test-results/vitals', () => {
    expect(vitals.grep !== undefined && matches(vitals.grep, TAG)).toBe(true);
    // A title without the tag stays out, the group's own title included.
    expect(vitals.grep !== undefined && matches(vitals.grep, `${GROUP} the H1 is the LCP element on Home, within 2.5 s`)).toBe(false);
    expect(vitals.grepInvert).toBeUndefined();
    expect(vitals.workers).toBe(1);
    expect(vitals.outputDir).toBe('test-results/vitals');
  });

  it('unset runs every test, as a plain `playwright test` does; any other value is refused', async () => {
    expect([unset.grep, unset.grepInvert, unset.workers]).toEqual([undefined, undefined, undefined]);
    await expect(configFor('vital')).rejects.toThrow('E2E_PASS must be "main" or "vitals", got "vital"');
  });
});

/** Playwright's list-mode reporter (playwright/lib/runner): what `--list --reporter=list` prints with. */
interface ListModeReporter {
  onConfigure(config: { readonly rootDir: string }): void;
  onBegin(suite: { allTests(): readonly ListedTest[] }): void;
}

interface ListedTest {
  titlePath(): string[];
  readonly location: { readonly file: string; readonly line: number; readonly column: number };
}

/**
 * What the installed Playwright prints for `--list` on `tests` tests spread over `files` files: its
 * own list-mode reporter, fed stand-in tests. A format change in a Playwright upgrade then fails
 * here, before listedCount() returns null and main() exits 0 without running a test. Nothing is
 * spawned.
 */
function playwrightListing(tests: number, files: number): string {
  // `playwright` is @playwright/test's own dependency: resolve it from there.
  const { ListModeReporter: Reporter } = createRequire(PLAYWRIGHT_CLI)('playwright/lib/runner') as {
    ListModeReporter: new (options: { screen: unknown }) => ListModeReporter;
  };
  let output = '';
  const write = (text: string): boolean => {
    output += text;
    return true;
  };
  const reporter = new Reporter({ screen: { stdout: { write }, stderr: { write } } });
  const testDir = path.join(ROOT, 'tests');
  reporter.onConfigure({ rootDir: testDir });
  const listed = Array.from({ length: tests }, (_, index): ListedTest => {
    const file = path.join(testDir, 'e2e', `spec-${index % files}.spec.ts`);
    return { titlePath: () => ['', 'desktop', path.relative(testDir, file), `test ${index}`], location: { file, line: index + 1, column: 3 } };
  });
  reporter.onBegin({ allTests: () => listed });
  return output;
}

describe('listedCount', () => {
  it("reads the total of Playwright's --list output, in the plural and singular forms", () => {
    expect(listedCount('Listing tests:\n  [mobile] › e2e/smoke.spec.ts:9:5 › every route › / returns 200\nTotal: 75 tests in 1 file\n')).toBe(75);
    expect(listedCount('Listing tests:\n  [desktop] › e2e/budgets.spec.ts:7:3 › Core Web Vitals in the lab › LCP\nTotal: 1 test in 1 file\n')).toBe(1);
    expect(listedCount('Listing tests:\nTotal: 808 tests in 19 files\n')).toBe(808);
    expect(listedCount('Listing tests:\r\nTotal: 2 tests in 2 files\r\n')).toBe(2);
  });

  it('reads "no tests" as 0 (a pass to skip), not as output without a total', () => {
    expect(listedCount('Listing tests:\nTotal: 0 tests in 0 files\n')).toBe(0);
  });

  it('returns null for output without a total (--help, --version)', () => {
    expect(listedCount('')).toBeNull();
    expect(listedCount('Usage: npx playwright test [options] [test-filter...]\n\nRun tests with Playwright Test\n')).toBeNull();
    expect(listedCount('Version 1.64.1\n')).toBeNull();
  });

  it('reads only a total on a line of its own, never one inside a test title', () => {
    expect(listedCount('Listing tests:\n  [mobile] › e2e/x.spec.ts:1:1 › Total: 3 tests in 1 file\nTotal: 1 test in 1 file\n')).toBe(1);
    expect(listedCount('Listing tests:\n  [mobile] › e2e/x.spec.ts:1:1 › Total: 3 tests in 1 file\n')).toBeNull();
  });

  it('reads what the installed Playwright prints for no tests, one, and many in several files', () => {
    expect(playwrightListing(1, 1)).toMatch(/^Total: 1 test in 1 file$/m);
    expect(listedCount(playwrightListing(0, 0))).toBe(0);
    expect(listedCount(playwrightListing(1, 1))).toBe(1);
    expect(listedCount(playwrightListing(2, 1))).toBe(2);
    expect(listedCount(playwrightListing(808, 19))).toBe(808);
  });
});

/** A test.describe(…) or test(…) declaration, read from a spec's source. */
interface Declaration {
  readonly kind: 'describe' | 'test';
  readonly file: string;
  readonly line: number;
  /** The title as written; a template literal keeps its `${…}` parts. */
  readonly title: string;
  /** The tag of its details argument, `{ tag: '@x' }` or `{ tag: ['@x', …] }`, as written. */
  readonly tags: readonly string[];
  /** The describes around it, outermost first. */
  readonly parents: readonly Declaration[];
  readonly node: ts.CallExpression;
}

const DESCRIBE_CALL = /^test\.describe(\.(only|skip|fixme|serial|parallel))*$/;
const TEST_CALL = /^test(\.(only|skip|fixme|fail))*$/;

const sources = new Map<string, ts.SourceFile>();

/** A file's syntax tree (repo-relative path), parsed once; `text` parses a sample instead. */
function parse(file: string, text?: string): ts.SourceFile {
  const cached = text === undefined ? sources.get(file) : undefined;
  if (cached) return cached;
  const source = ts.createSourceFile(file, text ?? readFileSync(path.join(ROOT, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (text === undefined) sources.set(file, source);
  return source;
}

const lineOf = (node: ts.Node, source: ts.SourceFile): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

/** `test.describe.serial` for test.describe.serial(…); null for a callee that is not a dotted name. */
function calleeName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (!ts.isPropertyAccessExpression(expression)) return null;
  const object = calleeName(expression.expression);
  return object === null ? null : `${object}.${expression.name.text}`;
}

/** A string as written: a literal's text, a template's source between the backticks, else ‹the expression›. */
function textOf(node: ts.Expression, source: ts.SourceFile): string {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.getText(source).slice(1, -1);
  return `‹${node.getText(source)}›`;
}

/** The `tag` of a details argument, `{ tag: '@x' }` or `{ tag: ['@x', …] }`, as written. */
function tagsOf(details: ts.Expression | undefined, source: ts.SourceFile): string[] {
  if (!details || !ts.isObjectLiteralExpression(details)) return [];
  const tag = details.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(source) === 'tag');
  if (!tag || !ts.isPropertyAssignment(tag)) return [];
  const values = ts.isArrayLiteralExpression(tag.initializer) ? [...tag.initializer.elements] : [tag.initializer];
  return values.map((value) => textOf(value, source));
}

/** The declaration a call makes: test(title, [details,] body) or test.describe([title, [details,]] body). */
function declarationAt(node: ts.CallExpression, file: string, source: ts.SourceFile, parents: readonly Declaration[]): Declaration | null {
  const name = calleeName(node.expression);
  const body = node.arguments.at(-1);
  if (name === null || body === undefined || !(ts.isArrowFunction(body) || ts.isFunctionExpression(body))) return null;
  const kind = DESCRIBE_CALL.test(name) ? 'describe' : TEST_CALL.test(name) ? 'test' : null;
  // test.fixme(condition) and the like take a function but no title: they declare nothing.
  if (kind === null || (kind === 'test' && node.arguments.length < 2)) return null;
  const [first, second] = node.arguments;
  return {
    kind,
    file,
    line: lineOf(node, source),
    title: first === undefined || first === body ? '' : textOf(first, source),
    tags: node.arguments.length === 3 ? tagsOf(second, source) : [],
    parents,
    node,
  };
}

/** Every describe and test a spec declares, in source order. */
function declarations(file: string, source = parse(file)): Declaration[] {
  const found: Declaration[] = [];
  const visit = (node: ts.Node, parents: readonly Declaration[]): void => {
    const declaration = ts.isCallExpression(node) ? declarationAt(node, file, source, parents) : null;
    if (!declaration) {
      ts.forEachChild(node, (child) => visit(child, parents));
      return;
    }
    found.push(declaration);
    // Tests are declared in describe bodies, never in test bodies.
    if (declaration.kind === 'describe') ts.forEachChild(node, (child) => visit(child, [...parents, declaration]));
  };
  visit(source, []);
  return found;
}

/** Whether `node` calls a function named `name` anywhere inside it. */
function invokes(node: ts.Node, name: string): boolean {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) return true;
  return ts.forEachChild(node, (child) => invokes(child, name) || undefined) ?? false;
}

/** Every string in a source that contains `text`: literals and template parts, never comments. */
function stringsWith(source: ts.SourceFile, text: string): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    const isString = ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
    if (isString && node.text.includes(text)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The spec files Playwright loads (playwright.config.ts): *.spec.ts under tests/, outside tests/unit. */
function specFiles(dir = 'tests'): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return file === 'tests/unit' ? [] : specFiles(file);
      return entry.name.endsWith('.spec.ts') ? [file] : [];
    })
    .sort();
}

const SPECS = specFiles();
const SUPPORT = readdirSync(path.join(ROOT, 'tests', 'support'))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => `tests/support/${name}`);
const DECLARED = SPECS.flatMap((file) => declarations(file));
const TESTS = DECLARED.filter((declaration) => declaration.kind === 'test');
const GROUPS = DECLARED.filter((declaration) => declaration.kind === 'describe' && declaration.file === BUDGETS && declaration.title === GROUP);

const inGroup = (declaration: Declaration): boolean => GROUPS.some((group) => declaration.parents.includes(group));
/**
 * The tags Playwright gives a declaration (TestCase.tags): every @-word in its describes' titles and
 * tags and in its own title, then its own tags. A describe's tags reach every test inside it.
 */
function tagsOn(declaration: Declaration): string[] {
  const titled = [...declaration.parents.flatMap((parent) => [parent.title, ...parent.tags]), declaration.title].join(' ');
  return [...(titled.match(/@\S+/g) ?? []), ...declaration.tags];
}
const where = (declaration: Declaration): string => `${declaration.file}:${declaration.line} ${declaration.title}`;

describe('the @vitals tag in the specs (read as text)', () => {
  it('reads the specs Playwright loads, and their declarations (self-check)', () => {
    expect(SPECS).toContain(BUDGETS);
    expect(SPECS.length).toBeGreaterThan(10);
    expect(TESTS.length).toBeGreaterThan(100);
    const sample = [
      "test.describe('outer', { tag: '@a' }, () => {",
      '  test.describe.serial(`inner ${name}`, () => {',
      "    test('one @b', async () => {",
      "      test.skip(true, 'a condition, not a test');",
      '    });',
      "    test('two', { tag: ['@c', '@d'] }, async () => {});",
      '  });',
      '});',
      "test.describe.configure({ mode: 'serial' });",
      "test.fixme('three', async () => {});",
      'test.fixme(({ browserName }) => browserName === "webkit");',
    ].join('\n');
    const read = declarations('sample.spec.ts', parse('sample.spec.ts', sample));
    expect(read.map((declaration) => [declaration.kind, declaration.line, declaration.title, tagsOn(declaration)])).toEqual([
      ['describe', 1, 'outer', ['@a']],
      ['describe', 2, 'inner ${name}', ['@a']],
      ['test', 3, 'one @b', ['@a', '@b']],
      ['test', 6, 'two', ['@a', '@c', '@d']],
      ['test', 10, 'three', []],
    ]);
  });

  it(`finds one "${GROUP}" group in budgets.spec.ts, holding tests`, () => {
    expect(GROUPS.map(where)).toEqual([expect.stringMatching(/^tests\/e2e\/budgets\.spec\.ts:\d+ Core Web Vitals in the lab$/)]);
    expect(TESTS.filter(inGroup).length).toBeGreaterThan(0);
  });

  it('tags every test in the group @vitals', () => {
    const vitals = TESTS.filter(inGroup);
    expect(vitals.length).toBeGreaterThan(0);
    for (const test of vitals) expect(tagsOn(test), where(test)).toContain(TAG);
  });

  it('holds every test that measures wall-clock vitals (starts the observers), so none runs in the parallel pass', () => {
    const measuring = TESTS.filter((test) => invokes(test.node, 'observeVitals'));
    expect(measuring.length, 'tests that call observeVitals()').toBeGreaterThan(0);
    expect(measuring.filter((test) => !inGroup(test)).map(where)).toEqual([]);
  });

  it('is on no other test or describe, in budgets.spec.ts or any other spec, as a tag or in a title', () => {
    const others = DECLARED.filter((declaration) => !GROUPS.includes(declaration) && !inGroup(declaration));
    expect(others.filter((declaration) => declaration.tags.includes(TAG) || declaration.title.includes(TAG)).map(where)).toEqual([]);
  });

  it('appears in no other string of the specs or tests/support, so nothing else is tagged through a constant', () => {
    const stray = [...SPECS, ...SUPPORT].flatMap((file) => {
      const source = parse(file);
      const outside = (node: ts.Node): boolean =>
        !GROUPS.some((group) => group.file === file && node.getStart(source) >= group.node.getStart(source) && node.end <= group.node.end);
      return stringsWith(source, TAG)
        .filter(outside)
        .map((node) => `${file}:${lineOf(node, source)} ${node.getText(source)}`);
    });
    expect(stray).toEqual([]);
  });
});

describe('what each pass runs: the config filters applied to the specs', () => {
  it('vitals selects exactly the group, and main every other test, on every project', async () => {
    const problems: string[] = [];
    for (const pass of PASSES) {
      const config = await configFor(pass.name);
      expect(config.projects?.length, pass.name).toBeGreaterThan(0);
      for (const project of config.projects ?? []) {
        // Each project filters with its own grep and grepInvert, else the config's (Playwright's FullProjectInternal).
        const grep = project.grep ?? config.grep ?? /.*/;
        const grepInvert = project.grepInvert ?? config.grepInvert;
        for (const test of TESTS) {
          // What Playwright greps (TestCase._grepTitleWithTags): project, file, each describe's title and tags, title, tags.
          const titled = [project.name ?? '', path.posix.relative('tests', test.file), ...test.parents.flatMap((parent) => [parent.title, ...parent.tags]), test.title, ...test.tags];
          const title = titled.join(' ');
          const selected = !(grepInvert !== undefined && matches(grepInvert, title)) && matches(grep, title);
          if (selected !== (pass.name === 'vitals' ? inGroup(test) : !inGroup(test))) {
            problems.push(`${pass.name} pass, ${project.name ?? 'unnamed'} project: ${selected ? 'selects' : 'leaves out'} ${where(test)}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('main (npm run e2e), with Playwright stubbed', () => {
  const spawn = vi.mocked(spawnSync);
  /*
   * Every main() call gets this environment. If the stub ever failed to apply, a real Playwright
   * would refuse its config (E2E_PORT must be 1024-65535) before listing a test or starting a server.
   */
  const ENV: Env = { E2E_PORT: '1' };
  /** What the stub prints for `--list`, by pass (E2E_PASS), and the listing's exit status. */
  let listings: Partial<Record<string, string>>;
  let listingStatus: number;
  /** Each pass's exit status when it runs (0 when not set). */
  let statuses: Partial<Record<string, number | null>>;
  let printed: string[];

  /** Playwright's list summary (its ListModeReporter's last line). */
  const listing = (tests: number, files: number): string =>
    `Listing tests:\nTotal: ${tests} ${tests === 1 ? 'test' : 'tests'} in ${files} ${files === 1 ? 'file' : 'files'}\n`;

  /** The stubbed Playwright calls, in order: the pass, the arguments after `playwright test`, and E2E_SKIP_BUILD. */
  const calls = () =>
    spawn.mock.calls.map(([, args, options]) => ({ pass: options?.env?.E2E_PASS, args: (args ?? []).slice(2), skipBuild: options?.env?.E2E_SKIP_BUILD }));
  /** The calls that ran tests, not listed them. */
  const runs = () => calls().filter((call) => !call.args.includes('--list'));

  beforeEach(() => {
    listings = { main: listing(796, 18), vitals: listing(12, 1) };
    listingStatus = 0;
    statuses = {};
    printed = [];
    spawn.mockReset().mockImplementation(((_command: string, args: readonly string[], options: { env: Env }) => {
      const pass = options.env.E2E_PASS ?? '';
      if (args.includes('--list')) return { status: listingStatus, stdout: listings[pass] ?? '', stderr: '' };
      return { status: pass in statuses ? statuses[pass] : 0 };
    }) as unknown as typeof spawnSync);
    const print = (text: unknown): boolean => {
      printed.push(String(text));
      return true;
    };
    vi.spyOn(console, 'log').mockImplementation(print);
    vi.spyOn(console, 'error').mockImplementation(print);
    vi.spyOn(process.stdout, 'write').mockImplementation(print as typeof process.stdout.write);
    vi.spyOn(process.stderr, 'write').mockImplementation(print as typeof process.stderr.write);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists both passes, then runs main in parallel and vitals on one worker, building once', () => {
    expect(runner.main(['tests/e2e/budgets.spec.ts', '--workers=2'], ENV)).toBe(0);
    const list = ['--list', '--pass-with-no-tests', 'tests/e2e/budgets.spec.ts', '--workers=2', '--reporter=list'];
    expect(calls()).toEqual([
      { pass: 'main', args: list, skipBuild: undefined },
      { pass: 'vitals', args: list, skipBuild: undefined },
      { pass: 'main', args: ['tests/e2e/budgets.spec.ts', '--workers=2'], skipBuild: undefined },
      // The last --workers wins; the vitals pass serves the build the main pass's server made.
      { pass: 'vitals', args: ['tests/e2e/budgets.spec.ts', '--workers=2', '--workers=1'], skipBuild: '1' },
    ]);
    expect(printed).toContain('\ne2e: main passed, vitals passed');
  });

  it("runs Playwright's own CLI with this Node and no shell, passing the caller's environment on", () => {
    expect(runner.main(['-g', 'Home'], { ...ENV, CI: 'true', E2E_SKIP_BUILD: '1' })).toBe(0);
    expect(spawn).toHaveBeenCalledTimes(4);
    for (const [command, args, options] of spawn.mock.calls) {
      expect(command).toBe(process.execPath);
      expect(args?.slice(0, 2)).toEqual([PLAYWRIGHT_CLI, 'test']);
      expect(options?.shell).toBeUndefined();
      // CI builds first and sets E2E_SKIP_BUILD=1, which reaches the main pass too.
      expect(options?.env).toMatchObject({ CI: 'true', E2E_SKIP_BUILD: '1', E2E_PORT: '1' });
    }
  });

  it('exits with the worst status, running the vitals pass even after the main pass failed', () => {
    statuses = { main: 1 };
    expect(runner.main([], ENV)).toBe(1);
    expect(runs().map((run) => run.pass)).toEqual(['main', 'vitals']);

    spawn.mockClear();
    statuses = { vitals: 1 };
    expect(runner.main([], ENV)).toBe(1);
    expect(runs().map((run) => run.pass)).toEqual(['main', 'vitals']);
    expect(printed).toContain('\ne2e: main passed, vitals failed (exit 1)');
  });

  it('stops after an interrupted pass (exit 130)', () => {
    statuses = { main: 130 };
    expect(runner.main([], ENV)).toBe(130);
    expect(runs().map((run) => run.pass)).toEqual(['main']);
  });

  it('counts a run that ends without a status (killed by a signal) as a failure', () => {
    statuses = { vitals: null };
    expect(runner.main([], ENV)).toBe(1);
  });

  it('skips a pass that selects no tests; a lone vitals pass builds for itself', () => {
    listings = { main: listing(0, 0), vitals: listing(3, 1) };
    expect(runner.main(['-g', 'LCP'], ENV)).toBe(0);
    expect(runs()).toEqual([{ pass: 'vitals', args: ['-g', 'LCP', '--workers=1'], skipBuild: undefined }]);
    expect(printed).toContain('\ne2e: main pass skipped: no tests selected');
  });

  it('skips the vitals pass when the arguments select none of its tests', () => {
    listings = { main: listing(75, 1), vitals: listing(0, 0) };
    expect(runner.main(['tests/e2e/smoke.spec.ts'], ENV)).toBe(0);
    expect(runs()).toEqual([{ pass: 'main', args: ['tests/e2e/smoke.spec.ts'], skipBuild: undefined }]);
  });

  it('fails when the arguments select no test at all, so a typo cannot pass', () => {
    listings = { main: listing(0, 0), vitals: listing(0, 0) };
    expect(runner.main(['tests/e2e/smok.spec.ts'], ENV)).toBe(1);
    expect(runs()).toEqual([]);
    expect(printed).toContain('e2e: no tests found for: tests/e2e/smok.spec.ts');
  });

  it('returns the status of a listing that failed (a config or syntax error), running nothing', () => {
    listingStatus = 1;
    expect(runner.main([], ENV)).toBe(1);
    expect(calls()).toHaveLength(1);
  });

  it('fails when Playwright cannot be started at all', () => {
    spawn.mockReturnValue({ status: null, error: new Error('spawnSync node ENOENT'), stdout: '', stderr: '' } as unknown as ReturnType<typeof spawnSync>);
    expect(runner.main([], ENV)).toBe(1);
    expect(printed).toContain('e2e: could not run Playwright: spawnSync node ENOENT');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('passes output without a total through (--help), running nothing, and exits 0', () => {
    listings = { main: 'Usage: npx playwright test [options] [test-filter...]\n' };
    expect(runner.main(['--help'], ENV)).toBe(0);
    expect(runs()).toEqual([]);
    expect(printed).toContain('Usage: npx playwright test [options] [test-filter...]\n');
  });

  it.each(['-h', '--help', '-V', '--version'])('%s: a listing without a total exits 0 and runs nothing', (flag) => {
    listings = { main: 'Usage: npx playwright test [options] [test-filter...]\n' };
    expect(runner.main([flag], ENV)).toBe(0);
    expect(runs()).toEqual([]);
    expect(printed.join('\n')).not.toContain('failing closed');
  });

  it.each([['tests/e2e/smoke.spec.ts'], ['--headed'], ['--grep=help'], ['--reporter=html'], ['-g', '--version-x']])(
    '%s: a listing without a total fails closed and runs nothing',
    (...args) => {
      listings = { main: 'Listing tests:\n  [mobile] › e2e/smoke.spec.ts:9:5 › every route › / returns 200\nSummary: 75 tests\n' };
      expect(runner.main(args, ENV)).toBe(1);
      expect(runs()).toEqual([]);
      expect(printed).toContain("e2e: Playwright's --list output has no 'Total:' line, so no test count; failing closed");
    },
  );

  it('gives an interactive run (--ui, --debug) one plain Playwright invocation', () => {
    for (const flag of ['--ui', '--ui-port=9323', '--ui-host=127.0.0.1', '--debug']) {
      spawn.mockClear();
      expect(runner.main([flag, 'tests/e2e/home.spec.ts'], ENV), flag).toBe(0);
      expect(calls(), flag).toEqual([{ pass: undefined, args: [flag, 'tests/e2e/home.spec.ts'], skipBuild: undefined }]);
    }
  });
});
