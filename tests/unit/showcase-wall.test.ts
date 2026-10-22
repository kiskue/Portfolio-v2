import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { LightboxDetails } from '@/components/sections/showcase/lightbox-details';
import { ShowcaseWall } from '@/components/sections/showcase/showcase-wall';
import { PHONE_SCALE } from '@/components/showcase/phone-frame';
import { storeListings } from '@/content/apps/store';
import { showcaseEntries, showcaseSummary, storeSummary } from '@/content/derived';
import { formatDate } from '@/lib/format';
import { resultText } from '@/lib/showcase-filters';

/*
 * The Showcase wall as the server renders it (PLAN "Other pages", design §7): every derived
 * screen once, grouped by app, store screenshots with their real alt text and text store links,
 * counts from derived.ts, filters at their defaults. Without JavaScript this is the page.
 */

// The URL is read after hydration (inside Suspense); give the hooks an empty one here.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/showcase',
}));

const markup = renderToStaticMarkup(createElement(ShowcaseWall));

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

/** Assertions on the large markup that print only what was looked for when they fail. */
const has = (html: string, text: string): void => expect(html.includes(text), `contains ${JSON.stringify(text)}`).toBe(true);
const lacks = (html: string, text: string): void => expect(html.includes(text), `lacks ${JSON.stringify(text)}`).toBe(false);
const matches = (html: string, pattern: RegExp): void => expect(pattern.test(html), `matches ${String(pattern)}`).toBe(true);
const misses = (html: string, pattern: RegExp): void => expect(pattern.test(html), `misses ${String(pattern)}`).toBe(false);

const tileIds = [...markup.matchAll(/data-showcase-tile="([^"]+)"/g)].map((match) => match[1]);

describe('the wall', () => {
  it('renders every derived screen once, in wall order: 21 coded replicas and 35 kept screenshots', () => {
    expect(tileIds).toEqual(showcaseEntries.map((entry) => entry.id));
    expect(tileIds).toHaveLength(56);
    expect(showcaseSummary).toMatchObject({ total: 56, replica: 21, real: 35 });
  });

  it('groups the screens by app with an h2 each, in showcase order (SME, Citizen, Responder)', () => {
    const groups = [...markup.matchAll(/data-showcase-group="([^"]+)"/g)].map((match) => match[1]);
    expect(groups).toEqual(['sme', 'citizen', 'responder']);
    const headings = [...markup.matchAll(/<h2 id="showcase-(\w+)"[^>]*>([^<]+)<\/h2>/g)].map((match) => [match[1], match[2]]);
    expect(headings).toEqual([
      ['sme', 'SME Panindio'],
      ['citizen', 'Defensys Citizen'],
      ['responder', 'Defensys Responder'],
    ]);
  });

  it('shows the whole wall before any filter applies (no tile is hidden on the server)', () => {
    misses(markup, /<li[^>]*\bhidden=""[^>]*data-showcase-tile/);
    has(markup, resultText(showcaseSummary.total, showcaseSummary.total));
  });

  it('puts replicas first in each group, then a store divider and the screenshots by listing', () => {
    const citizen = markup.slice(markup.indexOf('data-showcase-group="citizen"'), markup.indexOf('data-showcase-group="responder"'));
    const replicas = citizen.indexOf('data-showcase-region="replica"');
    const real = citizen.indexOf('data-showcase-region="real"');
    expect(replicas).toBeGreaterThan(-1);
    expect(real).toBeGreaterThan(replicas);
    has(citizen, 'From Google Play and the App Store');
    const listings = [...citizen.matchAll(/data-showcase-listing="([^"]+)"/g)].map((match) => match[1]);
    expect(listings).toEqual(storeListings.map((listing) => listing.id));
  });
});

describe('screens and images', () => {
  const real = showcaseEntries.filter((entry) => entry.source === 'real');

  it('gives every store screenshot its real alt text from the store data', () => {
    expect(real).toHaveLength(storeSummary.screenshots);
    for (const entry of real) {
      const { alt } = entry.screen.image;
      expect(alt.length, entry.id).toBeGreaterThan(20);
      has(markup, `alt="${escapeHtml(alt)}"`);
    }
  });

  it('gives every image an alt attribute (decorative store icons beside their names use alt="")', () => {
    const images = markup.match(/<img\b[^>]*>/g) ?? [];
    expect(images.length).toBeGreaterThanOrEqual(real.length);
    for (const image of images) expect(image).toMatch(/\balt="/);
  });

  it('never puts a marketing screenshot inside a phone frame: each is a bordered card', () => {
    expect(real.every((entry) => entry.screen.image.presentation === 'marketing')).toBe(true);
    expect(markup.match(/class="screen-card"/g)).toHaveLength(real.length);
    // 21 replica phones (role="img" with the figure summary), no image phones.
    expect(markup.match(/data-phone="" data-size="inherit" data-chrome="device"/g)).toHaveLength(showcaseSummary.replica);
    lacks(markup, 'data-chrome="none"');
  });

  it('keeps replica markup inert and hidden from assistive tech (the frame carries the summary)', () => {
    const canvases = markup.match(/<div class="phone-screen" aria-hidden="true" inert="" data-replica-canvas="">/g) ?? [];
    expect(canvases).toHaveLength(showcaseSummary.replica);
  });

  it('loads store images lazily at the sm card width', () => {
    const cards = markup.match(/<div class="screen-card"[\s\S]*?<\/div>/g) ?? [];
    expect(cards).toHaveLength(real.length);
    for (const card of cards) {
      has(card, 'loading="lazy"');
      has(card, `sizes="${Math.ceil(414 * PHONE_SCALE.sm)}px"`);
    }
  });
});

describe('counts, links and brands', () => {
  it('reads counts from derived.ts and never claims more screenshots than are shown', () => {
    has(markup, `Real screenshots (${storeSummary.screenshots})`);
    has(markup, `${showcaseSummary.byApp.citizen.replica} coded replicas and ${showcaseSummary.byApp.citizen.real} real screenshots.`);
    misses(markup, /\b47\b[^<]{0,30}screenshots?|screenshots?[^<]{0,30}\b47\b/i);
    misses(markup, /\b(?:all|every|each)\b[^<.]{0,40}\bscreenshots?\b/i);
  });

  it('links each listing as text next to its store icon, never with a badge', () => {
    for (const listing of storeListings) {
      has(markup, `href="${escapeHtml(listing.url)}"`);
      has(markup, `<span class="sr-only"> listing for ${escapeHtml(listing.name)}</span>`);
    }
    misses(markup, /\/badges\//);
  });

  it('links each group to its case study', () => {
    for (const slug of ['sme-panindio', 'defensys-citizen', 'defensys-responder']) has(markup, `href="/projects/${slug}"`);
    expect(markup.match(/Read the case study<span class="sr-only"> about /g)).toHaveLength(3);
  });

  it('wraps the white-label groups in BrandScopes on their own URL keys, starting on the default brand', () => {
    matches(markup, /data-brand-scope="citizen" data-brand="smile-safe-taytay" data-brand-param="brand"/);
    matches(markup, /data-brand-scope="responder" data-brand="defensys" data-brand-param="rbrand"/);
    // Brandable replicas name the skin they show; the brand chips appear once an app is chosen.
    matches(markup, /data-tile-brand=""[^>]*>(?:<[^>]+>)*Smile SAFE Taytay</);
    lacks(markup, 'data-brand-switcher');
  });

  it('renders the filters at their defaults: All apps, every source, the live count', () => {
    matches(markup, /<input type="radio"[^>]*checked=""[^>]*value="all"/);
    has(markup, '<span class="sr-only">All apps</span>');
    has(markup, '<span class="sr-only">SME Panindio</span>');
    has(markup, 'role="status"');
    lacks(markup, 'Clear filters');
    lacks(markup, 'data-showcase-empty');
    // Without JavaScript the filters cannot work; a note says so (the wall stays whole).
    has(markup, '<noscript><p class="text-meta text-ink-3">The filters need JavaScript; the whole wall is shown below.</p></noscript>');
  });
});

describe('lightbox details', () => {
  const html = (id: string): string => {
    const entry = showcaseEntries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`no entry ${id}`);
    return renderToStaticMarkup(createElement(LightboxDetails, { entry }));
  };

  it('describes a replica: caption, purpose, source, the screen description', () => {
    const details = html('replica-2.3');
    has(details, 'SOS: one tap, then a 5-second countdown you can cancel');
    has(details, 'The core emergency interaction');
    has(details, 'Coded replica of the real screen, with fictional data');
    has(details, 'Screen description');
    lacks(details, 'In rollout');
  });

  it('marks Responder Channels (3.5) as in rollout', () => {
    has(html('replica-3.5'), 'In rollout');
  });

  it('describes a store screenshot: its alt text, a text store link, the publisher and the date', () => {
    const entry = showcaseEntries.find((candidate) => candidate.id === '1hope.appstore-2');
    if (!entry || entry.source !== 'real') throw new Error('missing 1hope.appstore-2');
    const details = html(entry.id);
    has(details, escapeHtml(entry.screen.image.alt));
    has(details, `href="${escapeHtml(entry.listing.url)}"`);
    has(details, 'App Store');
    has(details, escapeHtml(entry.listing.publisher));
    has(details, formatDate(entry.listing.asOf));
  });
});

// ─── Server Components never import a value from a 'use client' module ─────────────────
//
// A Server Component that imports a constant from a client module gets a client reference,
// not the value (it broke the lightbox details once). Only components and types may cross.

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const SCOPES = ['src/components/sections/showcase', 'src/app/showcase'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function isClient(source: ts.SourceFile): boolean {
  const first = source.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client';
}

function resolveAlias(specifier: string): string | null {
  if (!specifier.startsWith('@/')) return null;
  const base = join(SRC, specifier.slice(2));
  return [`${base}.tsx`, `${base}.ts`].find((candidate) => existsSync(candidate)) ?? null;
}

/** A component name: PascalCase with a lower-case letter (so SCREAMING_CASE constants fail). */
const isComponentName = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

describe('server/client boundary in the Showcase', () => {
  it('tells component names from other values', () => {
    for (const name of ['BrandScope', 'WallTile', 'ShowcaseProvider', 'FilterBar']) expect(isComponentName(name), name).toBe(true);
    for (const name of ['REPLICA_ONLY_LABEL', 'realScreenshotsLabel', 'useBrand', 'SHOWCASE_PARAM']) expect(isComponentName(name), name).toBe(false);
  });

  it('server modules import only components (PascalCase) and types from client modules', () => {
    const problems: string[] = [];
    const scanned = SCOPES.flatMap((scope) => files(join(ROOT, scope))).filter((file) => !isClient(parse(file)));
    expect(scanned.length).toBeGreaterThan(3);
    for (const file of scanned) {
      for (const statement of parse(file).statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause || statement.importClause.isTypeOnly) continue;
        const target = resolveAlias((statement.moduleSpecifier as ts.StringLiteral).text);
        if (!target || !isClient(parse(target))) continue;
        const { name, namedBindings } = statement.importClause;
        const names = [
          ...(name ? [name.text] : []),
          ...(namedBindings && ts.isNamedImports(namedBindings)
            ? namedBindings.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text)
            : namedBindings
              ? ['* (namespace)']
              : []),
        ];
        for (const imported of names) {
          if (!isComponentName(imported)) problems.push(`${relative(ROOT, file)} imports "${imported}" from a client module`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
