import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Site-wide content safety (PLAN.md, "Binding corrections and guardrails" → Content safety).
 *
 * A deny-list scan over everything that can end up public: every text file under src/ and
 * scripts/, the root config files, and the names (and any text) under public/. tests/ is scanned
 * for literal secrets only (see TESTS_SCOPE). The company material describes a real employer and
 * real local governments, so nothing here may carry a host or port, an IP, an EAS or Firebase id,
 * an EXPO_PUBLIC name, a key, an /api/ path, a rate limit, a secret or header name, an unpublished
 * package id, the config name "OneHope", a PH mobile number or an email other than the profile one.
 *
 * Exceptions are explicit and minimal: ALLOWLIST (one matched text in one file, with a reason) and
 * EXEMPT_CONTEXTS (a span that is blanked before one rule runs, with a reason). Both are checked
 * for staleness, so an exception that no longer matches anything fails the suite.
 *
 * Known-bad samples are assembled at runtime, so this file holds no literal it looks for.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** The only email the site may carry (PLAN.md, Decisions → Identity). */
const PROFILE_EMAIL = 'gerricmeasco360@gmail.com';

type Corpus = 'site' | 'tests';

type RuleId =
  | 'host-port'
  | 'ipv4'
  | 'eas-firebase-id'
  | 'expo-public'
  | 'api-key'
  | 'api-path'
  | 'rate-limit'
  | 'secret-or-header-name'
  | 'unpublished-package-id'
  | 'one-hope'
  | 'ph-mobile'
  | 'foreign-email'
  | 'company-infrastructure'
  | 'unpublished-brand'
  | 'store-name'
  | 'git-handle';

interface Rule {
  readonly id: RuleId;
  readonly what: string;
  /** Global patterns per corpus; a corpus without patterns is not checked by this rule. */
  readonly patterns: Readonly<Partial<Record<Corpus, readonly RegExp[]>>>;
  /** A match is a finding only when this returns true (defaults to always). */
  readonly flags?: (match: string, corpus: Corpus) => boolean;
}

interface Finding {
  readonly rule: RuleId;
  readonly file: string;
  readonly line: number;
  readonly match: string;
}

// ─── What the store data says is public ──────────────────────────────────────────────────

/**
 * Google Play package ids that are published, read from the store data (the single source of
 * store facts) rather than restated here: every `id=` in store-listings.json.
 */
const PUBLISHED_PACKAGES: ReadonlySet<string> = new Set(
  [...readFileSync(join(ROOT, 'src/content/apps/store-listings.json'), 'utf8').matchAll(/[?&]id=(com\.[a-z0-9_.]+)/gi)].map(
    (match) => (match[1] ?? '').toLowerCase(),
  ),
);

/** Store names exactly as published (PLAN.md store-name rules). */
const STORE_NAMES: ReadonlySet<string> = new Set(['Smile SAFE Taytay', '1Hope', 'SJDM App', 'Defensys SAFE', 'SAFE ICB', 'AERO App']);

// ─── Rules (PLAN.md order) ───────────────────────────────────────────────────────────────

/** A hostname with a TLD, an IPv4 address or localhost, as the host part of host:port. */
const HOST = String.raw`(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63})`;

/**
 * Names that cannot point at a real machine or person: loopback and the reserved documentation
 * domains and ranges (RFC 2606, RFC 5737). Tests may use them; the site may not.
 */
const RESERVED_DOMAIN = /(?:^|\.)(?:example\.(?:com|net|org)|example|test|invalid|localhost)$/i;
const RESERVED_IPV4 = /^(?:127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|192\.0\.2\.\d{1,3}|198\.51\.100\.\d{1,3}|203\.0\.113\.\d{1,3})$/;

/** The host of a host:port match, without scheme or port. */
const hostOf = (match: string): string => match.replace(/^[a-z]+:\/\//i, '').replace(/:.*$/, '');
const isReservedHost = (host: string): boolean => RESERVED_DOMAIN.test(host) || RESERVED_IPV4.test(host);

// Patterns shared by the site and tests scopes (each use is copied with `new RegExp`).
const IPV4 = /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const FIREBASE_APP_ID = /\b\d{1,2}:\d{6,}:(?:android|ios|web):[0-9a-f]{6,}\b/gi;
const SECRET_VALUES: readonly RegExp[] = [
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/g,
  /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
];
const PACKAGE_ID = /\bcom\.(?:dgsi[a-z0-9]*|sme)\.[a-z0-9_.]*[a-z0-9_]/gi;
const PH_MOBILE = /(?:\+63|\(\+63\))[\s-]?\(?9\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}\b|\(09\d{2}\)[\s-]?\d{3}[\s-]?\d{4}\b|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

const RULES: readonly Rule[] = [
  {
    id: 'host-port',
    what: 'a host or URL with a port, or a URL pointing at localhost',
    patterns: {
      // A port is digits or a template expression; "9:41", "0:07" and "4.5:1" have no host, so they pass.
      site: [
        new RegExp(String.raw`\b(?:https?|wss?):\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])(?::(?:\d{1,5}|\$\{[^}]*\}))?`, 'gi'),
        new RegExp(String.raw`\b${HOST}:(?:\d{2,5}\b|\$\{[^}]*\})`, 'gi'),
      ],
      tests: [new RegExp(String.raw`\b${HOST}:\d{2,5}\b`, 'gi')],
    },
    flags: (match, corpus) => corpus === 'site' || !isReservedHost(hostOf(match)),
  },
  {
    id: 'ipv4',
    what: 'an IPv4 address',
    patterns: { site: [IPV4], tests: [IPV4] },
    flags: (match, corpus) => corpus === 'site' || !RESERVED_IPV4.test(match),
  },
  {
    id: 'eas-firebase-id',
    what: 'an EAS or Firebase id (UUID-style project id, app id, config key or host)',
    patterns: {
      site: [
        UUID,
        FIREBASE_APP_ID,
        /\b(?:projectId|messagingSenderId|storageBucket|measurementId|googleServicesFile)\b/g,
        /\bgoogle-services\.json\b|\bGoogleService-Info\.plist\b/gi,
        /\b[a-z0-9-]+\.(?:firebaseio\.com|firebaseapp\.com|appspot\.com)\b|\bu\.expo\.dev\b|\bexpo\.dev\/accounts\b/gi,
      ],
      // Tests may name the config keys they look for; only literal id values count there.
      tests: [UUID, FIREBASE_APP_ID],
    },
  },
  {
    id: 'expo-public',
    what: 'an EXPO_PUBLIC env name',
    patterns: { site: [/EXPO_PUBLIC/gi] },
  },
  {
    id: 'api-key',
    what: 'an API key, token or private key',
    patterns: { site: [...SECRET_VALUES, /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g], tests: SECRET_VALUES },
  },
  {
    id: 'api-path',
    what: 'an /api/ path',
    patterns: { site: [/\/api\//gi] },
  },
  {
    id: 'rate-limit',
    what: 'a rate limit',
    patterns: {
      site: [
        /\b\d[\d,.]*\s*(?:req(?:uest)?s?|calls?|hits?|messages?|pings?)?\s*(?:\/|\bper\b)\s*(?:s|secs?|seconds?|min|mins|minutes?|h|hrs?|hours?|days?)\b/gi,
        /\brequests?\s+(?:per|a|an|each|every)\s+(?:second|minute|hour|day)\b/gi,
        /\b(?:throttled?|rate[\s-]?limit(?:ed|s)?)\s+(?:to|at|of)\s+\d/gi,
      ],
    },
  },
  {
    id: 'secret-or-header-name',
    what: 'a secret or header name',
    patterns: {
      site: [
        /\bx-(?:[a-z0-9]+-)*(?:api-key|secret|token|key|auth|signature|password)\b/gi,
        /\bauthorization\s*:\s*bearer\b/gi,
        /\bshared[\s-]+secret\b/gi,
        // The names in the research dossiers, then any env-style secret name.
        /\b(?:AI_SERVICE_SECRET|OLLAMA_BEARER_TOKEN|GEMINI_API_KEY|ORS_API_KEY|JWT_(?:REFRESH_)?SECRET|EXPO_ACCESS_TOKEN|DISCORD_WEBHOOK_URL|ADMIN_PASSWORD|DEMO_EXCHANGE_PATH|webClientId|googleMapsApiKey)\b/g,
        // Secret-bearing kinds only: a bare *_TOKEN can be a placeholder token (YEARS_TOKEN).
        /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:SECRET|PASSWORD|PASSWD|PRIVATE_KEY|WEBHOOK_URL|(?:ACCESS|AUTH|BEARER|API|REFRESH|SESSION)_TOKEN)\b/g,
      ],
    },
  },
  {
    id: 'unpublished-package-id',
    what: 'an unpublished package id (or any DGSI or SME id that is not a published Google Play package)',
    patterns: { site: [PACKAGE_ID], tests: [PACKAGE_ID] },
    flags: (match) => !PUBLISHED_PACKAGES.has(match.toLowerCase()),
  },
  {
    id: 'one-hope',
    what: 'the config name "OneHope" (the store name is "1Hope")',
    patterns: { site: [/\bone[\s_-]*hope\b/gi] },
  },
  {
    id: 'ph-mobile',
    what: 'a PH mobile number',
    patterns: { site: [PH_MOBILE], tests: [PH_MOBILE] },
  },
  {
    id: 'foreign-email',
    what: 'an email other than the profile email',
    patterns: { site: [EMAIL], tests: [EMAIL] },
    // "icon@2x.png" is an image name, not an address; tests may also use reserved example domains.
    flags: (match, corpus) =>
      match.toLowerCase() !== PROFILE_EMAIL &&
      !/@\d+x\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(match) &&
      (corpus === 'site' || !RESERVED_DOMAIN.test(match.slice(match.indexOf('@') + 1))),
  },
  {
    id: 'company-infrastructure',
    what: 'a private company host, tenant portal, EAS owner or repository org',
    patterns: {
      site: [/\b[a-z0-9-]+\.defensys\.ph\b|\bdigitalgovernmentsolutions\b|\bdynamicglobalsoft\b|\bdefensys-(?:sjdm|taytay|generic|demo)\b|\bDGSI-Dev\b/gi],
    },
  },
  {
    id: 'unpublished-brand',
    what: 'an unpublished brand or the demo tenant (Antipolo, demo builds, the demo launcher)',
    patterns: { site: [/\bantipolo\b|\bdemo[\s_-]?(?:safe|responder|defensys|tenant|launcher|login|build)\b|\bgovtech\b/gi] },
  },
  {
    id: 'store-name',
    what: 'a store name not spelled as published',
    patterns: { site: [/\bsmile\s+safe\s+taytay\b|\bdefensys\s+safe\b|\bsjdm\s+app\b|\bsafe\s+icb\b|\baero\s+app\b|\b1\s+hope\b/gi] },
    flags: (match) => !STORE_NAMES.has(match),
  },
  {
    id: 'git-handle',
    what: "another developer's git handle from the research (personal identifier)",
    patterns: { site: [/\b(?:hrebs|sbltss)\b/gi] },
  },
];

// ─── Exceptions ──────────────────────────────────────────────────────────────────────────

/** Spans blanked before a rule runs, because inside them the rule's pattern means something else. */
interface ExemptContext {
  readonly rules: readonly RuleId[];
  readonly span: RegExp;
  readonly reason: string;
}

const EXEMPT_CONTEXTS: readonly ExemptContext[] = [
  {
    rules: ['eas-firebase-id', 'api-key'],
    span: /https:\/\/(?:play-lh\.googleusercontent\.com|is[1-5]-ssl\.mzstatic\.com)\/[^\s"'`)]*/g,
    reason:
      'Public store-image CDN URLs (the hosts scripts/prepare-assets.mjs allowlists): Apple image paths embed a UUID-shaped segment and Google image paths are opaque tokens. These are the public store assets the PLAN allows, not EAS or Firebase ids.',
  },
  {
    rules: ['store-name'],
    span: /\\"[^"\\]*\\"|“[^”]*”/g,
    reason:
      'Alt text quoting the caption printed on a store image (for example the "1 Hope" caption) transcribes it faithfully; it is not the site spelling the store name.',
  },
];

interface AllowEntry {
  readonly rule: RuleId;
  /** Repo-relative, forward slashes. */
  readonly file: string;
  /** The exact matched text this entry permits in that file. */
  readonly match: string;
  readonly reason: string;
}

const ALLOWLIST: readonly AllowEntry[] = [
  {
    rule: 'host-port',
    file: 'src/content/site.ts',
    match: "http://localhost:${process.env.PORT ?? '3000'}",
    reason: 'metadataBase fallback for local runs (PLAN: NEXT_PUBLIC_SITE_URL, then the Vercel domain, then localhost).',
  },
  {
    rule: 'host-port',
    file: 'playwright.config.ts',
    match: 'http://localhost:${PORT}',
    reason: 'The e2e suite runs next start on a local port; never part of the built site.',
  },
  {
    rule: 'host-port',
    file: 'lighthouserc.json',
    match: 'http://localhost:3100',
    reason: 'Lighthouse CI audits next start on a local port (PLAN, Verification); never part of the built site.',
  },
  {
    rule: 'foreign-email',
    file: '.env.example',
    // Assembled, so this file holds no address of its own.
    match: ['onboarding', 'resend.dev'].join('@'),
    reason: "Resend's documented test sender (PLAN, Contact): it can deliver only to the account owner's inbox.",
  },
  {
    rule: 'unpublished-brand',
    file: 'src/content/case-studies/defensys-responder.ts',
    match: 'demo build',
    reason: 'The binding Responder wording "4 brands + demo build" (PLAN, Binding corrections → Claims).',
  },
  {
    rule: 'unpublished-brand',
    file: 'src/content/apps/brands.ts',
    match: 'demo build',
    reason: 'The same binding wording, in the comment that explains why responderBrands lists no demo build.',
  },
];

/**
 * tests/ is not served, and its files assert absence, so they must name what they look for
 * (labels, regex sources, config key names). They are checked only for literal secrets: keys and
 * tokens, EAS/Firebase id values, IPv4 addresses, numeric host:port pairs, PH mobile numbers,
 * foreign emails and unpublished package ids. Samples in tests are assembled at runtime.
 */
const TESTS_SCOPE = 'tests/**: literal secrets only (they assert absence and must name what they look for)';

// ─── Corpus ──────────────────────────────────────────────────────────────────────────────

interface ScannedText {
  readonly file: string;
  readonly text: string;
  readonly corpus: Corpus;
}

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.svg',
  '.md',
  '.mdx',
  '.txt',
  '.html',
  '.xml',
  '.webmanifest',
  '.yml',
  '.yaml',
]);

/** Root files that are not scanned: generated output, and local env files that git ignores. */
const ROOT_SKIP = /^(?:package-lock\.json|.*\.tsbuildinfo|\.env|\.env\..*\.local|\.env\.local)$/;

/** Repo-relative, forward-slash paths of every file under `dir`. */
function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    return entry.isFile() ? [path] : [];
  });
}

const isText = (path: string): boolean => TEXT_EXTENSIONS.has(extname(path).toLowerCase());
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const rootFiles = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isFile() && !ROOT_SKIP.test(entry.name))
  .map((entry) => entry.name);

const siteFiles = [...walk('src'), ...walk('scripts'), ...rootFiles];
const publicFiles = walk('public');
const testFiles = walk('tests').filter(isText);

const corpus: readonly ScannedText[] = [
  // File contents.
  ...siteFiles.filter((file) => rootFiles.includes(file) || isText(file)).map((file) => ({ file, text: read(file), corpus: 'site' as const })),
  ...publicFiles.filter(isText).map((file) => ({ file, text: read(file), corpus: 'site' as const })),
  // File names: a public URL is its path, and a name can leak an id as easily as a file can.
  ...[...siteFiles, ...publicFiles].map((file) => ({ file: `${file} (name)`, text: file, corpus: 'site' as const })),
  ...testFiles.map((file) => ({ file, text: read(file), corpus: 'tests' as const })),
];

// ─── Scanner ─────────────────────────────────────────────────────────────────────────────

/** Blanks (same length, so positions hold) every exempt span that applies to this rule. */
function blankExemptSpans(text: string, rule: RuleId, used?: Set<number>): string {
  return EXEMPT_CONTEXTS.reduce((current, context, index) => {
    if (!context.rules.includes(rule)) return current;
    return current.replace(new RegExp(context.span.source, context.span.flags), (span) => {
      used?.add(index);
      return ' '.repeat(span.length);
    });
  }, text);
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) if (text.charCodeAt(position) === 10) line += 1;
  return line;
}

interface Span {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/**
 * Every finding in one text, before the allowlist. A rule's patterns can overlap (a URL and the
 * host:port inside it), so overlapping matches collapse into the earliest, longest one.
 */
function scan(item: ScannedText, used?: Set<number>): Finding[] {
  return RULES.flatMap((rule) => {
    const patterns = rule.patterns[item.corpus] ?? [];
    if (patterns.length === 0) return [];
    const text = blankExemptSpans(item.text, rule.id, used);
    const spans = patterns
      .flatMap((pattern) => [...text.matchAll(new RegExp(pattern.source, pattern.flags))])
      .filter((match) => rule.flags?.(match[0], item.corpus) ?? true)
      .map((match): Span => ({ start: match.index, end: match.index + match[0].length, text: match[0] }))
      .sort((a, b) => a.start - b.start || b.end - a.end);
    const kept: Span[] = [];
    for (const span of spans) {
      const last = kept.at(-1);
      if (last === undefined || span.start >= last.end) kept.push(span);
    }
    return kept.map((span): Finding => ({ rule: rule.id, file: item.file, line: lineOf(text, span.start), match: span.text }));
  });
}

/** Rules that fire on a sample string, for the self-checks. */
function sampleFindings(text: string, corpus: Corpus = 'site'): RuleId[] {
  return [...new Set(scan({ file: '(sample)', text, corpus }).map((finding) => finding.rule))];
}

const allowedBy = (finding: Finding): number =>
  ALLOWLIST.findIndex((entry) => entry.rule === finding.rule && entry.file === finding.file && entry.match === finding.match);

/** Exempt contexts (by index) that blanked at least one span in the real files. */
const usedContexts = new Set<number>();
const allFindings = corpus.flatMap((item) => scan(item, usedContexts));
const usedAllowEntries = new Set(allFindings.map(allowedBy).filter((index) => index >= 0));
const findings = allFindings.filter((finding) => allowedBy(finding) < 0);

const describeFinding = (finding: Finding): string => `${finding.file}:${finding.line} → ${finding.match}`;

// ─── Tests ───────────────────────────────────────────────────────────────────────────────

describe('content safety: scope', () => {
  it('scans src/, scripts/, the root config files, public/ names and tests/', () => {
    const files = new Set(corpus.map((item) => item.file));
    for (const required of [
      'src/content/profile.ts',
      'src/content/case-studies/defensys-citizen.ts',
      'src/content/apps/store-listings.json',
      'src/content/apps/store-assets.generated.json',
      'src/app/layout.tsx',
      'scripts/prepare-assets.mjs',
      'next.config.ts',
      'package.json',
      'playwright.config.ts',
      '.env.example',
      'tests/unit/content-safety.test.ts',
    ]) {
      expect(files.has(required), required).toBe(true);
    }
    expect(corpus.filter((item) => item.corpus === 'site' && !item.file.endsWith(' (name)')).length).toBeGreaterThan(100);
    expect(corpus.some((item) => item.file.startsWith('public/store/') && item.file.endsWith(' (name)'))).toBe(true);
    for (const item of corpus) expect(item.file, item.file).not.toMatch(/^[A-Za-z]:|\\/);
  });

  it('skips only generated files and local env files at the root', () => {
    for (const name of ['package-lock.json', 'tsconfig.tsbuildinfo', '.env', '.env.local', '.env.production.local']) {
      expect(ROOT_SKIP.test(name), name).toBe(true);
    }
    for (const name of ['.env.example', 'next.config.ts', 'package.json', 'eslint.config.mjs', 'vitest.config.mts']) {
      expect(ROOT_SKIP.test(name), name).toBe(false);
    }
  });

  it('reads the six published Google Play packages from the store data', () => {
    expect(PUBLISHED_PACKAGES.size).toBe(6);
    for (const id of PUBLISHED_PACKAGES) expect(id).toMatch(/^com\.dgsi\.[a-z]+$/);
  });
});

describe('content safety: the rules bite', () => {
  // Assembled at runtime, so this file never contains what it looks for.
  const dot = (...parts: string[]) => parts.join('.');
  const bad: Readonly<Record<RuleId, readonly string[]>> = {
    'host-port': [
      `${['https://api', 'example', 'com'].join('.')}:${8443}`,
      `${dot('staging', 'example', 'ph')}:${3000}`,
      `ws://${'localhost'}:${4000}`,
      `${'http'}://${'localhost'}/health`,
    ],
    ipv4: [dot('10', '0', '0', '12'), dot('192', '168', '1', '20')],
    'eas-firebase-id': [
      ['123e4567', 'e89b', '12d3', 'a456', '426614174000'].join('-'),
      ['1', '123456789012', 'android', 'abcdef123456'].join(':'),
      `${'project'}Id`,
      dot('my-app', 'firebaseio', 'com'),
    ],
    'expo-public': [['EXPO', 'PUBLIC', 'API', 'URL'].join('_')],
    'api-key': [`${'AI'}za${'x'.repeat(35)}`, `${'Bear'}er ${'a'.repeat(24)}`, `${'gh'}p_${'b'.repeat(36)}`],
    'api-path': [`POST /${'api'}/v1/ai/ask`],
    'rate-limit': [`${20}/min`, `${1} request/second`, `${'requests'} per second`, `throttled to ${20}`],
    'secret-or-header-name': [
      ['X', 'AI', 'Service', 'Secret'].join('-'),
      ['x', 'api', 'key'].join('-'),
      `${'Authorization'}: Bearer`,
      `a ${'shared'} secret`,
      ['AI', 'SERVICE', 'SECRET'].join('_'),
      ['CONTACT', 'WEBHOOK', 'URL'].join('_'),
      ['STORE', 'ACCESS', 'TOKEN'].join('_'),
    ],
    'unpublished-package-id': [
      dot('com', 'dgsi', 'defensysresponseteam'),
      dot('com', 'dgsi', 'defensys', 'taytayrt'),
      dot('com', 'dgsi', 'sjdmresponderapp'),
      dot('com', 'dgsi', 'demoresponderapp'),
      dot('com', 'dgsi', 'antipolosafeapp'),
      dot('com', 'dgsi', 'demosafeapp'),
      dot('com', 'sme', 'panindo'),
      dot('com', 'dgsi', 'responderppt'),
    ],
    'one-hope': [['One', 'Hope'].join(''), ['One', 'Hope'].join(' ')],
    'ph-mobile': [['0917', '000', '0001'].join(' '), `+63 ${['917', '000', '0001'].join(' ')}`, `+63${'9170000001'}`],
    'foreign-email': [['someone', dot('example', 'com')].join('@')],
    'company-infrastructure': [dot('portal', 'defensys', 'ph'), ['defensys', 'sjdm'].join('-'), `${'dynamic'}globalsoft`],
    'unpublished-brand': [`${'Anti'}polo SAFE`, `${'Demo'} Responder`, `the ${'demo'} build`],
    'store-name': ['Defensys Safe', ['1', 'Hope'].join(' '), 'Smile Safe Taytay', 'SJDM APP'],
    'git-handle': [['hre', 'bs'].join('')],
  };

  it.each(RULES.map((rule): [RuleId, Rule] => [rule.id, rule]))('%s catches its known-bad samples', (id) => {
    const samples = bad[id];
    expect(samples.length, id).toBeGreaterThan(0);
    for (const sample of samples) expect(sampleFindings(sample), sample).toContain(id);
  });

  it('passes ordinary copy, including times, ratios, versions and the public links', () => {
    const fine = [
      '9:41',
      '0:07',
      '10:42 AM',
      'contrast 4.5:1, measured 2.42:1',
      'v1.4.0 to v2.5.17',
      'Expo SDK 54 · React Native 0.81',
      'GMT+8',
      'Apr – May 2025',
      '₱10,170 net profit',
      'Capture every 5 s or 10 m; upload every 60 s or after 100 m',
      'At most 1 MiB or 2,000 rows a chunk',
      'Road routing on a free, rate-limited service',
      'font: 600 15px/1.4 system-ui',
      'w-1/2 aspect-[9/19.5]',
      'X-Content-Type-Options: nosniff',
      'RESEND_API_KEY and NEXT_PUBLIC_SITE_URL',
      'YEARS_TOKEN = ph(...)',
      'It is free and needs no API keys.',
      'https://github.com/kiskue',
      'https://www.linkedin.com/in/gerric-measco-39a0a722a/',
      `https://play.google.com/store/apps/details?id=${[...PUBLISHED_PACKAGES][0] ?? ''}`,
      `mailto:${PROFILE_EMAIL}`,
      'icon@2x.png',
      '1Hope, Smile SAFE Taytay, SJDM App, Defensys SAFE, SAFE ICB and AERO App',
      'store/citizen/1hope/play-01.webp',
      'smile-safe-taytay.appstore',
      'Defensys Citizen · Dynamic Global Soft Inc. (DGSI)',
      'demo-section.tsx',
      '2026-10-19',
      'a22c33d0d1617932be0e3e89a4dd6f3abf0fd63a703f69132cc135c06ce8a4e1',
    ];
    for (const sample of fine) expect(sampleFindings(sample), sample).toEqual([]);
  });

  it('exempts only the documented contexts', () => {
    const uuid = ['c69b000e', '60d8', '8000', '8ef6', '6239b78da895'].join('-');
    const cdn = `https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c6/9b/00/${uuid}/Defensys.png/4000x4000bb.png`;
    expect(sampleFindings(cdn)).toEqual([]);
    expect(sampleFindings(`id ${uuid}`)).toContain('eas-firebase-id');
    expect(sampleFindings(`"alt": "1Hope sign-in screen under the caption \\"${['1', 'Hope'].join(' ')}\\""`)).toEqual([]);
    expect(sampleFindings(`under the caption ${['1', 'Hope'].join(' ')}`)).toContain('store-name');
  });

  it(`scopes ${TESTS_SCOPE}`, () => {
    expect(sampleFindings(dot('10', '0', '0', '12'), 'tests')).toEqual(['ipv4']);
    expect(sampleFindings(dot('com', 'dgsi', 'sjdmresponderapp'), 'tests')).toEqual(['unpublished-package-id']);
    expect(sampleFindings(['someone', dot('mail', 'ph')].join('@'), 'tests')).toEqual(['foreign-email']);
    expect(sampleFindings(`${dot('api', 'company', 'ph')}:${8443}`, 'tests')).toEqual(['host-port']);
    // Naming what a test looks for is fine there, and so are loopback and reserved example names.
    expect(sampleFindings(`${'EXPO'}_PUBLIC ${['One', 'Hope'].join('')} /${'api'}/ projectId`, 'tests')).toEqual([]);
    for (const harmless of [
      `http://${'localhost'}:${3100}`,
      `https://${dot('evil', 'example')}:${8443}`,
      ['ana', dot('example', 'com')].join('@'),
      dot('127', '0', '0', '1'),
      dot('192', '0', '2', '10'),
    ]) {
      expect(sampleFindings(harmless, 'tests'), harmless).toEqual([]);
    }
    // The site stays strict about the same names.
    expect(sampleFindings(['ana', dot('example', 'com')].join('@'))).toEqual(['foreign-email']);
    expect(sampleFindings(dot('127', '0', '0', '1'))).toEqual(['ipv4']);
  });
});

describe('content safety: the site', () => {
  it.each(RULES.map((rule): [string, RuleId] => [rule.what, rule.id]))('has no %s', (_what, id) => {
    expect(findings.filter((finding) => finding.rule === id && !finding.file.startsWith('tests/')).map(describeFinding)).toEqual([]);
  });

  it('has no literal secret in tests/', () => {
    expect(findings.filter((finding) => finding.file.startsWith('tests/')).map((finding) => `${finding.rule}: ${describeFinding(finding)}`)).toEqual(
      [],
    );
  });

  it('keeps the allowlist minimal: every entry and exempt context is still needed', () => {
    expect(ALLOWLIST.filter((_entry, index) => !usedAllowEntries.has(index)).map((entry) => `${entry.rule} ${entry.file} ${entry.match}`)).toEqual([]);
    expect(EXEMPT_CONTEXTS.filter((_context, index) => !usedContexts.has(index)).map((context) => context.reason)).toEqual([]);
    for (const entry of ALLOWLIST) expect(entry.reason.trim(), `${entry.rule} ${entry.file}`).not.toBe('');
  });
});
