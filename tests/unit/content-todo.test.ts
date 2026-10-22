import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PlaceholderMode, Site } from '@/content/types';
import {
  CONTENT_DIR,
  PORTRAIT_DIR,
  PORTRAIT_MIN,
  ROOT,
  assetFindings,
  envFindings,
  formatReport,
  githubAnnotations,
  loadEnv,
  main,
  scanContent,
  scanJson,
  scanSource,
  summarize,
  type TodoItem,
} from '../../scripts/content-todo.mjs';

/*
 * npm run content:todo (PLAN "Content you supply later", design §10): the extraction rules on
 * small sources, then the real content cross-checked against the modules themselves (loaded
 * here through Vitest, which resolves the @/ imports), then the CLI end to end.
 */

const SCRIPT = path.join(ROOT, 'scripts', 'content-todo.mjs');

function only(items: readonly TodoItem[], kind: TodoItem['kind']): TodoItem[] {
  return items.filter((item) => item.kind === kind);
}

describe('scanSource: tokens', () => {
  it('finds ph() tokens with their line and a readable path', () => {
    const source = [
      "import { ph } from '@/lib/placeholder';",
      'export const profile = {',
      "  name: 'Gerric',",
      "  availability: { status: 'open', label: ph('Open to roles') },",
      '  replyTime: ph(" I reply soon "),',
      '};',
    ].join('\n');
    expect(only(scanSource('src/content/profile.ts', source), 'token')).toEqual([
      expect.objectContaining({ file: 'src/content/profile.ts', line: 4, where: 'profile.availability.label', text: '[[Open to roles]]' }),
      expect.objectContaining({ line: 5, where: 'profile.replyTime', text: '[[I reply soon]]', optional: false }),
    ]);
  });

  it('names array items by id, slug or depth, else by index', () => {
    const source = [
      'export const testimonials = [',
      "  { id: 'example-one', name: ph('Client name') },",
      "  { slug: 'case', role: ph('Role') },",
      "  { depth: 'core', blurb: ph('Blurb') },",
      "  { quote: ph('Quote') },",
      '];',
    ].join('\n');
    expect(only(scanSource('x.ts', source), 'token').map((item) => item.where)).toEqual([
      'testimonials[example-one].name',
      'testimonials[case].role',
      'testimonials[core].blurb',
      'testimonials[3].quote',
    ]);
  });

  it('resolves same-file constants, concatenation and templates', () => {
    const source = [
      "const WHAT = 'pricing';",
      "const LABEL = 'Typical ' + `timeline and ${WHAT}`;",
      'const ENGAGEMENT = ph(LABEL);',
      'export const services = [',
      "  { id: 'a', engagement: ENGAGEMENT },",
      "  { id: 'b', engagement: ENGAGEMENT },",
      '];',
    ].join('\n');
    const [token, ...rest] = only(scanSource('x.ts', source), 'token');
    expect(rest).toEqual([]);
    expect(token).toMatchObject({ line: 3, where: 'ENGAGEMENT', text: '[[Typical timeline and pricing]]', uses: [5, 6] });
  });

  it('shows a token it cannot resolve as the expression, so nothing is silently dropped', () => {
    const [token] = only(scanSource('x.ts', 'export const a = { b: ph(makeLabel()) };'), 'token');
    expect(token?.text).toBe('[[‹computed: makeLabel()›]]');
  });

  it('counts raw "[[…]]" strings written without ph()', () => {
    const items = only(scanSource('x.ts', "export const a = { b: '[[Raw token]]', c: 'two [[x]] and [[y]]' };"), 'token');
    expect(items.map((item) => item.text)).toEqual(['[[Raw token]]', '[[x]]', '[[y]]']);
  });

  it('ignores tokens in comments, types and imports', () => {
    const source = [
      '/** label shows [[placeholders]] */',
      "// a [[comment]] token: ph('Nope')",
      'export type Placeholder = `[[${string}]]`;',
      "type Literal = '[[literal type]]';",
      "interface Shape { readonly text: '[[member]]' }",
      "import x from './[[weird]]';",
      "export const site = { mode: 'label' };",
    ].join('\n');
    expect(scanSource('x.ts', source)).toEqual([]);
  });
});

describe('scanSource: examples, confirm notes, null facts and the release switch', () => {
  const source = [
    "const NOTE = 'Shared ' + 'note';",
    'export const credentials = [',
    "  { id: 'example-cert', example: true, kind: 'certification', title: ph('Cert'), url: null, confirm: NOTE },",
    "  { id: 'degree', kind: 'degree', title: 'BS CS', url: null },",
    "  { id: 'link', kind: 'link', url: null },",
    '];',
    'export const profile = {',
    '  yearsOfExperience: null,',
    '  cvUrl: null,',
    '  verifiedCredentialUrl: null,',
    "  confirm: `Positioning title.`,",
    '  other: null,',
    '};',
    "export const projects = [{ id: 'secret', hidden: true, role: ph('Role'), confirm: 'Hidden until ready.' }];",
    "export const site = { placeholders: 'label' as const };",
  ].join('\n');
  const items = scanSource('src/content/x.ts', source);

  it('lists example items by their path', () => {
    expect(only(items, 'example')).toEqual([expect.objectContaining({ line: 3, where: 'credentials[example-cert]', optional: false })]);
  });

  it('lists confirm notes with their resolved text', () => {
    expect(only(items, 'confirm').map((item) => [item.line, item.where, item.text, item.optional])).toEqual([
      [3, 'credentials[example-cert]', 'Shared note', false],
      [11, 'profile', 'Positioning title.', false],
      [14, 'projects[secret]', 'Hidden until ready.', true],
    ]);
  });

  it('lists null facts; a url only on credentials; the CV and links are optional', () => {
    expect(only(items, 'null').map((item) => [item.where, item.optional])).toEqual([
      ['credentials[example-cert].url', true],
      ['credentials[degree].url', true],
      ['profile.yearsOfExperience', false],
      ['profile.cvUrl', true],
      ['profile.verifiedCredentialUrl', true],
    ]);
  });

  it('marks what sits inside hidden items as hidden and optional', () => {
    const hidden = items.filter((item) => item.hidden);
    expect(hidden.map((item) => `${item.kind} ${item.where}`)).toEqual(['token projects[secret].role', 'confirm projects[secret]']);
    expect(hidden.every((item) => item.optional)).toBe(true);
  });

  it("lists placeholders: 'label' as the release switch, also behind an environment override", () => {
    expect(only(items, 'release')).toEqual([expect.objectContaining({ line: 15, where: 'site.placeholders' })]);
    expect(only(scanSource('x.ts', "export const site = { placeholders: 'hide' };"), 'release')).toEqual([]);
    const override = "export const site = { placeholders: process.env.NEXT_PUBLIC_PLACEHOLDERS === 'hide' ? 'hide' : 'label' };";
    expect(only(scanSource('x.ts', override), 'release')).toHaveLength(1);
    expect(only(scanSource('x.ts', "export const site = { placeholders: (process.env.MODE as PlaceholderMode) ?? 'label' };"), 'release')).toHaveLength(1);
  });

  it("resolves the release switch through a same-file constant, with or without resolvePlaceholderMode's environment override", () => {
    // src/content/site.ts keeps the owner's switch in a constant; NEXT_PUBLIC_PLACEHOLDERS overrides it for one build.
    for (const value of ['resolvePlaceholderMode(process.env.NEXT_PUBLIC_PLACEHOLDERS, PLACEHOLDERS)', 'PLACEHOLDERS']) {
      // One item, on the line the owner flips.
      expect(only(scanSource('src/content/site.ts', siteSource('label', value)), 'release'), value).toEqual([
        expect.objectContaining({
          file: 'src/content/site.ts',
          line: 2,
          where: 'site.placeholders',
          text: "placeholders are in 'label' mode (noindex, no sitemap): switch PLACEHOLDERS to 'hide' to go public",
          optional: false,
        }),
      ]);
      expect(only(scanSource('src/content/site.ts', siteSource('hide', value)), 'release'), value).toEqual([]);
    }
    // The shorthand `{ placeholders }` reads the same-named constant.
    const shorthand = (mode: PlaceholderMode) => `const placeholders = resolvePlaceholderMode(process.env.MODE, '${mode}');\nexport const site = { placeholders };`;
    expect(only(scanSource('x.ts', shorthand('label')), 'release')).toEqual([expect.objectContaining({ line: 1, where: 'site.placeholders' })]);
    expect(only(scanSource('x.ts', shorthand('hide')), 'release')).toEqual([]);
  });

  it('lists a release switch it cannot read statically, so --strict fails closed', () => {
    const [item, ...rest] = only(scanSource('x.ts', 'export const site = { placeholders: modeFor(build) };'), 'release');
    expect(rest).toEqual([]);
    expect(item).toMatchObject({ line: 1, where: 'site.placeholders', optional: false });
    expect(item?.text).toContain('‹computed: modeFor(build)›');
    // An environment read is the override, unset by default: the default here is 'hide'.
    expect(only(scanSource('x.ts', "export const site = { placeholders: process.env.MODE ?? 'hide' };"), 'release')).toEqual([]);
  });
});

/** A site.ts in today's shape: the owner's switch in a constant, then site.placeholders = `value`. */
function siteSource(mode: PlaceholderMode, value: string): string {
  return [
    "import type { PlaceholderMode } from '@/content/types';",
    `const PLACEHOLDERS: PlaceholderMode = '${mode}';`,
    'export const site = {',
    "  name: 'Gerric Measco',",
    `  placeholders: ${value},`,
    '};',
  ].join('\n');
}

describe('scanJson', () => {
  it('finds tokens in JSON string values by line', () => {
    const json = ['{', '  "name": "1Hope",', '  "alt": "A [[screenshot]] caption"', '}'].join('\n');
    expect(scanJson('src/content/apps/x.json', json)).toEqual([expect.objectContaining({ line: 3, text: '[[screenshot]]' })]);
  });
});

/** Every string, `example: true` item and confirm note reachable from the modules' exports. */
interface RuntimeTodos {
  readonly tokens: Set<string>;
  readonly examples: Set<string>;
  readonly confirms: Set<string>;
}

function collectRuntime(roots: readonly unknown[]): RuntimeTodos {
  const found: RuntimeTodos = { tokens: new Set(), examples: new Set(), confirms: new Set() };
  const seen = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\[\[([^[\]]+)\]\]/g)) found.tokens.add(match[0]);
      return;
    }
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (record.example === true && typeof record.id === 'string') found.examples.add(record.id);
    if (typeof record.confirm === 'string') found.confirms.add(record.confirm);
    for (const child of value instanceof Map ? value.values() : Object.values(record)) visit(child);
  };
  for (const root of roots) visit(root);
  return found;
}

function contentModules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? contentModules(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .sort();
}

describe('the real content', () => {
  const scanned = scanContent();
  let runtime: RuntimeTodos;

  beforeAll(async () => {
    const files = contentModules(path.join(ROOT, CONTENT_DIR));
    expect(files.length).toBeGreaterThan(10);
    const modules: unknown[] = await Promise.all(files.map((file) => import(/* @vite-ignore */ pathToFileURL(file).href)));
    runtime = collectRuntime(modules);
  });

  it('finds every token the content modules hold, and no others', () => {
    const tokens = new Set(only(scanned, 'token').map((item) => item.text));
    expect(runtime.tokens.size).toBeGreaterThan(20);
    expect([...tokens].sort()).toEqual([...runtime.tokens].sort());
  });

  it('finds every example item', () => {
    const ids = new Set(only(scanned, 'example').map((item) => /\[([^\]]+)\]$/.exec(item.where)?.[1]));
    expect(runtime.examples.size).toBeGreaterThan(0);
    expect([...ids].sort()).toEqual([...runtime.examples].sort());
  });

  it('finds every confirm note, word for word', () => {
    const notes = new Set(only(scanned, 'confirm').map((item) => item.text));
    expect(runtime.confirms.size).toBeGreaterThan(10);
    expect([...notes].sort()).toEqual([...runtime.confirms].sort());
  });

  it('lists the null facts of the profile and the credentials', async () => {
    const { profile } = await import('@/content/profile');
    const { credentials } = await import('@/content/credentials');
    const expected = [
      ...(['yearsOfExperience', 'cvUrl', 'verifiedCredentialUrl'] as const).filter((key) => profile[key] === null).map((key) => `profile.${key}`),
      ...credentials.filter((credential) => credential.url === null).map((credential) => `credentials[${credential.id}].url`),
    ];
    expect(only(scanned, 'null').map((item) => item.where).sort()).toEqual(expected.sort());
  });

  /** src/content/site.ts evaluated afresh with NEXT_PUBLIC_PLACEHOLDERS set to `value` (undefined: unset). */
  async function siteWith(value: string | undefined): Promise<Site> {
    vi.stubEnv('NEXT_PUBLIC_PLACEHOLDERS', value);
    vi.resetModules();
    try {
      return (await import('@/content/site')).site;
    } finally {
      vi.unstubAllEnvs();
      // Later imports evaluate site.ts again with the real environment.
      vi.resetModules();
    }
  }

  it("lists the release switch while site.placeholders is 'label'", async () => {
    // The default: what site.ts evaluates to with no environment override.
    const { placeholders } = await siteWith(undefined);
    expect(only(scanned, 'release')).toHaveLength(placeholders === 'label' ? 1 : 0);
  });

  it('keeps listing it whatever NEXT_PUBLIC_PLACEHOLDERS sets for one build, on the line that holds the default', async () => {
    const releases = only(scanned, 'release');
    for (const override of ['hide', 'label'] as const) {
      // The override reaches the module, but not the release switch.
      expect((await siteWith(override)).placeholders).toBe(override);
      expect(only(scanContent(), 'release')).toEqual(releases);
    }
    for (const item of releases) {
      const lines = readFileSync(path.join(ROOT, item.file ?? ''), 'utf8').split(/\r?\n/);
      expect(lines[(item.line ?? 0) - 1]).toContain("'label'");
    }
  });

  it('reports every content item with its file and a 1-based line', () => {
    for (const item of scanned) {
      expect(item.file).toMatch(/^src\/content\/.+\.(ts|json)$/);
      expect(item.line).toBeGreaterThan(0);
      expect(item.where).not.toBe('');
    }
  });
});

describe('environment and assets', () => {
  it('flags an unset production domain and Resend key', () => {
    expect(envFindings({}).map((item) => item.where)).toEqual(['NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY']);
    expect(envFindings({ NEXT_PUBLIC_SITE_URL: '  ', RESEND_API_KEY: '' })).toHaveLength(2);
    expect(envFindings({ NEXT_PUBLIC_SITE_URL: 'https://example.com', RESEND_API_KEY: 're_123' })).toEqual([]);
    // On Vercel the production URL stands in for the domain (src/content/site.ts).
    expect(envFindings({ VERCEL_PROJECT_PRODUCTION_URL: 'example.vercel.app', RESEND_API_KEY: 're_123' })).toEqual([]);
  });

  it('reads .env files the way next build does: process env first, then .env.production.local … .env', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'content-todo-env-'));
    try {
      writeFileSync(path.join(dir, '.env'), 'NEXT_PUBLIC_SITE_URL=https://from-env.example\nRESEND_API_KEY=base\n');
      writeFileSync(path.join(dir, '.env.local'), 'RESEND_API_KEY=local\n');
      expect(loadEnv(dir, {})).toMatchObject({ NEXT_PUBLIC_SITE_URL: 'https://from-env.example', RESEND_API_KEY: 'local' });
      expect(loadEnv(dir, { RESEND_API_KEY: 'process' }).RESEND_API_KEY).toBe('process');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags a portrait below 1200×1480 and passes a large enough one', async () => {
    const small = await assetFindings(ROOT, async () => ({ width: 765, height: 944 }));
    expect(small).toEqual([expect.objectContaining({ kind: 'asset', file: `${PORTRAIT_DIR}/gerric-portrait.jpg`, optional: false })]);
    expect(small[0]?.text).toContain('765×944');
    expect(await assetFindings(ROOT, async () => PORTRAIT_MIN)).toEqual([]);
    expect(await assetFindings(ROOT, async () => ({ width: 1200, height: 1479 }))).toHaveLength(1);
  });

  it('reads the real portrait size with sharp', async () => {
    const [finding] = await assetFindings();
    // Today's portrait is the V1 export; the check passes once the high-resolution one replaces it.
    if (finding) expect(finding.text).toMatch(/^\d+×\d+: supply a high-resolution export/);
  });
});

describe('the report', () => {
  const items: TodoItem[] = [
    { kind: 'token', file: 'src/content/a.ts', line: 3, where: 'a.b', text: '[[B]]', optional: false, hidden: false },
    { kind: 'confirm', file: 'src/content/a.ts', line: 9, where: 'a', text: 'Confirm\n  it.', optional: true, hidden: true },
    { kind: 'env', file: null, line: null, where: 'RESEND_API_KEY', text: 'not set', optional: false, hidden: false },
  ];

  it('groups by file, keeps file:line, and ends with the total', () => {
    const report = formatReport(items);
    expect(report).toContain('src/content/a.ts (2)\n  src/content/a.ts:3  token    a.b: [[B]]');
    expect(report).toContain('src/content/a.ts:9  confirm  a: Confirm it. [hidden item]');
    expect(report).toContain('Environment (1)\n  env      RESEND_API_KEY: not set');
    expect(report.trimEnd().split('\n').at(-1)).toBe(
      'Total: 3 (1 token, 1 confirm note, 1 environment variable); 2 required, 1 optional.',
    );
  });

  it('summarizes per kind', () => {
    expect(summarize(items)).toEqual({
      total: 3,
      required: 2,
      optional: 1,
      byKind: { token: 1, example: 0, null: 0, confirm: 1, env: 1, asset: 0, release: 0 },
    });
  });

  it('prints GitHub Actions warnings with file and line, escaped', () => {
    expect(githubAnnotations(items)).toEqual([
      '::warning file=src/content/a.ts,line=3,title=content%3Atodo token::a.b: [[B]]',
      '::warning file=src/content/a.ts,line=9,title=content%3Atodo confirm::a: Confirm it.',
      '::warning title=content%3Atodo env::RESEND_API_KEY: not set',
    ]);
  });
});

describe('the CLI', () => {
  let clean: string;
  const roots: string[] = [];

  /** A finished site: no placeholders left, a large portrait, and this site.ts. */
  async function finishedSite(site: string): Promise<string> {
    const root = mkdtempSync(path.join(tmpdir(), 'content-todo-clean-'));
    roots.push(root);
    mkdirSync(path.join(root, CONTENT_DIR), { recursive: true });
    mkdirSync(path.join(root, PORTRAIT_DIR), { recursive: true });
    writeFileSync(path.join(root, CONTENT_DIR, 'site.ts'), site);
    await sharp({ create: { width: 1200, height: 1480, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(path.join(root, PORTRAIT_DIR, 'portrait.jpg'));
    return root;
  }

  beforeAll(async () => {
    // A finished site: no placeholders left, hide mode, a large portrait.
    clean = await finishedSite("export const site = { placeholders: 'hide', name: 'Gerric Measco' };\n");
  });

  afterAll(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  const ENV = { ...process.env, NEXT_PUBLIC_SITE_URL: '', RESEND_API_KEY: '', VERCEL_PROJECT_PRODUCTION_URL: '', GITHUB_ACTIONS: '' };

  it('prints the grouped report with a total and exits 0 (npm run content:todo)', () => {
    const output = execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, env: ENV, encoding: 'utf8' });
    expect(output).toContain('src/content/profile.ts (');
    expect(output).toContain('Environment (2)');
    expect(output).toMatch(/\nTotal: \d+ \(.*\); \d+ required, \d+ optional\.\n$/);
  });

  it('--json is machine-readable and matches the scan', () => {
    const output = execFileSync(process.execPath, [SCRIPT, '--json'], { cwd: ROOT, env: { ...ENV, GITHUB_ACTIONS: 'true' }, encoding: 'utf8' });
    const parsed = JSON.parse(output) as { items: TodoItem[]; summary: ReturnType<typeof summarize> };
    expect(parsed.summary).toEqual(summarize(parsed.items));
    expect(parsed.items.filter((item) => item.file?.startsWith('src/content/'))).toEqual(scanContent());
  });

  it('--strict exits 1 while required items remain; unknown options exit 2', () => {
    const strict = spawnSync(process.execPath, [SCRIPT, '--strict'], { cwd: ROOT, env: ENV, encoding: 'utf8' });
    expect(strict.status).toBe(1);
    expect(strict.stdout).toContain('--strict: required items remain');
    expect(spawnSync(process.execPath, [SCRIPT, '--nope'], { cwd: ROOT, env: ENV, encoding: 'utf8' }).status).toBe(2);
  });

  it('--strict passes once everything is supplied', async () => {
    const lines: string[] = [];
    const env = { NEXT_PUBLIC_SITE_URL: 'https://example.com', RESEND_API_KEY: 're_123' };
    const code = await main(['--strict'], { root: clean, env, log: (line) => lines.push(line), github: false });
    expect(lines.join('\n')).toContain('Total: 0 (nothing left); 0 required, 0 optional.');
    expect(code).toBe(0);
  });

  it("--strict fails on the release switch while site.ts defaults to 'label', even in a hide-mode build environment", async () => {
    // Everything else is supplied, and the environment overrides the mode to 'hide' for this one build.
    const env = { NEXT_PUBLIC_SITE_URL: 'https://example.com', RESEND_API_KEY: 're_123', NEXT_PUBLIC_PLACEHOLDERS: 'hide' };
    const run = async (mode: PlaceholderMode) => {
      const root = await finishedSite(siteSource(mode, 'resolvePlaceholderMode(process.env.NEXT_PUBLIC_PLACEHOLDERS, PLACEHOLDERS)'));
      const lines: string[] = [];
      const code = await main(['--strict'], { root, env, log: (line) => lines.push(line), github: false });
      return { code, report: lines.join('\n') };
    };
    const label = await run('label');
    expect(label.report).toContain(
      "src/content/site.ts:2  release  site.placeholders: placeholders are in 'label' mode (noindex, no sitemap): switch PLACEHOLDERS to 'hide' to go public",
    );
    expect(label.report).toContain('Total: 1 (1 release switch); 1 required, 0 optional.');
    expect(label.code).toBe(1);
    const hide = await run('hide');
    expect(hide.report).toContain('Total: 0 (nothing left); 0 required, 0 optional.');
    expect(hide.code).toBe(0);
  });

  it('adds ::warning annotations in GitHub Actions', async () => {
    const lines: string[] = [];
    const code = await main([], { root: clean, env: {}, log: (line) => lines.push(line), github: true });
    expect(code).toBe(0);
    expect(lines.filter((line) => line.startsWith('::warning '))).toHaveLength(2);
  });
});
