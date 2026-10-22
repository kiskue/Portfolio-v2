import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CtaBand } from '@/components/content/cta-band';
import { EmptyState } from '@/components/content/empty-state';
import { BentoGrid } from '@/components/sections/home/bento-grid';
import { ProjectsIndex } from '@/components/sections/projects/projects-index';
import { ShowcaseClear, ShowcaseEmpty, type ShowcaseEmptyProps } from '@/components/sections/showcase/filter-bar';
import { ShowcaseProvider, type BrandParam, type ShowcaseProviderProps } from '@/components/sections/showcase/showcase-provider';
import { TestimonialsContent } from '@/components/sections/testimonials/testimonials-content';
import { MapPhone } from '@/components/showcase/map-phone';
import { callsToAction, emptyStates, home } from '@/content/home';
import { testimonials } from '@/content/testimonials';
import type { EmptyState as EmptyStateCopy } from '@/content/types';
import { hasToken } from '@/lib/placeholder';
import { contactHref } from '@/lib/routes';

/*
 * I3: the shared blocks of wave 2b's integration (reuse rule 10, audit S5.13 and S4.45).
 * - EmptyState: one empty-state block for Home's Testimonials card, /testimonials and the
 *   /projects and /showcase no-match states, with a heading level and an action slot.
 * - CtaBand: one closing band for /services and /testimonials.
 * - MapPhone: the 404's map phone (the 'lost' scene).
 * Plus guards that no page composes its own copy of either block again.
 */

// The filter islands read the URL after hydration (inside Suspense); give the hooks an empty one.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/',
}));

const html = (element: ReactElement): string => renderToStaticMarkup(element);
const hrefs = (markup: string): string[] => [...markup.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1] ?? '');
/** The opening tag of the first element carrying `marker` (React orders attributes its own way). */
function tagWith(markup: string, marker: string): string {
  const at = markup.indexOf(marker);
  if (at === -1) return '';
  return markup.slice(markup.lastIndexOf('<', at), markup.indexOf('>', at) + 1);
}

const state: EmptyStateCopy = {
  title: 'Nothing here yet.',
  body: 'A line about what will appear.',
  cta: { label: 'Leave a note', href: contactHref('testimonial') },
};

describe('EmptyState', () => {
  const section = html(createElement(EmptyState, { state, icon: 'folder-open', name: 'fixture' }));

  it('is a dashed sunken card marked data-empty-state, with an h2 title and the body by default', () => {
    const card = tagWith(section, 'data-empty-state="fixture"');
    expect(section.startsWith(card)).toBe(true);
    expect(card.startsWith('<div ')).toBe(true);
    for (const token of ['bg-sunken', 'border-dashed', 'border-line-strong', 'rounded-card']) expect(card).toContain(token);
    expect(section).toMatch(/<h2 class="text-ink text-h2 text-balance">Nothing here yet\.<\/h2>/);
    expect(section).toContain('A line about what will appear.');
  });

  it('shows its icon as a decorative soft tile above the title', () => {
    expect(section).toMatch(/<span aria-hidden="true" class="[^"]*bg-accent-soft[^"]*"><svg[^>]*lucide-folder-open/);
    expect(section.indexOf('lucide-folder-open')).toBeLessThan(section.indexOf('<h2'));
    expect(html(createElement(EmptyState, { state }))).not.toContain('bg-accent-soft');
  });

  it('renders the state’s link as a secondary pill with an arrow', () => {
    expect(hrefs(section)).toEqual(['/contact?topic=testimonial']);
    const link = /<a [^>]*>.*?<\/a>/.exec(section)?.[0] ?? '';
    expect(link).toContain('border-line-strong bg-raised');
    expect(link).toContain('h-8');
    expect(link).toContain('Leave a note');
    expect(link).toContain('lucide-arrow-right');
  });

  it('takes an h3 inside a card, compact, with the card-title scale and the 12px radius', () => {
    const card = html(createElement(EmptyState, { state, as: 'h3', size: 'card' }));
    expect(card).toMatch(/<h3 class="text-ink text-card-title">Nothing here yet\.<\/h3>/);
    expect(card).not.toContain('<h2');
    expect(tagWith(card, 'data-empty-state=""')).toContain('rounded-control');
  });

  it('puts an action slot in place of the link (a filter island’s Clear filters button)', () => {
    const button = createElement('button', { type: 'button' }, 'Clear filters');
    const slotted = html(createElement(EmptyState, { state, action: button }));
    expect(slotted).toContain('<button type="button">Clear filters</button>');
    expect(hrefs(slotted)).toEqual([]);
    const none = html(createElement(EmptyState, { state, action: null }));
    expect(none).not.toContain('<a ');
    expect(none).not.toContain('<button');
  });

  it('leaves out what the copy does not have', () => {
    const bare = html(createElement(EmptyState, { state: { title: 'Only a title.' } }));
    expect(bare).toContain('data-empty-state=""');
    expect(bare).toContain('Only a title.');
    expect(bare).not.toContain('<p');
    expect(bare).not.toContain('<a ');
  });
});

describe('CtaBand', () => {
  const band = html(createElement(CtaBand, { cta: callsToAction.testimonials, headingId: 'band-title' }));

  it('is a raised section named by its h2, marked data-section="cta"', () => {
    const root = tagWith(band, 'data-section="cta"');
    expect(band.startsWith(root)).toBe(true);
    expect(root).toMatch(/^<section aria-labelledby="band-title"/);
    expect(root).toContain('bg-raised');
    expect(band).toMatch(/<h2 id="band-title" class="text-ink text-h2 text-balance">Worked with me\?<\/h2>/);
    expect(band).toContain(callsToAction.testimonials.body);
  });

  it('ends with the primary pill and its ↗ glyph, the one link', () => {
    expect(hrefs(band)).toEqual([contactHref('testimonial')]);
    const link = /<a [^>]*>.*?<\/a>/.exec(band)?.[0] ?? '';
    expect(link).toContain('bg-ink text-raised');
    expect(link).toContain('lucide-arrow-up-right');
    expect(link).toContain('>Leave a note<');
  });

  it('has no pill without a link', () => {
    const plain = html(createElement(CtaBand, { cta: { title: 'A band.' }, headingId: 'plain' }));
    expect(plain).not.toContain('<a ');
    expect(plain).toContain('A band.');
  });
});

describe('the four empty states go through EmptyState', () => {
  it('Home: the Testimonials card in hide mode, compact, its h3 under the card’s h2, one link', () => {
    const grid = html(createElement(BentoGrid, { mode: 'hide' }));
    const start = grid.indexOf('data-bento="testi"');
    const testi = grid.slice(start);
    expect(testi).toMatch(/<h2 id="bento-testi-title"[^>]*>Testimonials<\/h2>/);
    expect(testi).toContain('data-empty-state="testimonials"');
    expect(testi).toMatch(/<h3 class="text-ink text-card-title">Kind words, soon\.<\/h3>/);
    expect(tagWith(testi, 'data-empty-state="testimonials"')).toContain('flex-1');
    expect(hrefs(testi)).toEqual([home.testimonialsEmpty.cta?.href]);
  });

  it('/testimonials: hide mode shows the block with its h2, icon and link instead of the grid and band', () => {
    const page = html(createElement(TestimonialsContent, { testimonials, mode: 'hide' }));
    const root = tagWith(page, 'data-empty-state="testimonials"');
    expect(page.startsWith(root)).toBe(true);
    expect(root).toContain('border-dashed');
    expect(page).toMatch(/<h2 class="text-ink text-h2 text-balance">Kind words, soon\.<\/h2>/);
    expect(page).toContain('lucide-message-square-quote');
    expect(page).not.toContain('data-section="cta"');
    expect(hrefs(page)).toEqual([emptyStates.testimonials.cta?.href]);
  });

  it('/testimonials: label mode closes the grid with the shared band', () => {
    const page = html(createElement(TestimonialsContent, { testimonials, mode: 'label' }));
    expect(page).toContain('<section aria-labelledby="testimonials-cta-title"');
    expect(page).not.toContain('data-empty-state');
  });

  it('/projects: nothing to list shows the block, with no Clear filters while no filter is set', () => {
    const index = html(createElement(ProjectsIndex, { mode: 'label', projects: [] }));
    expect(index).toContain('data-empty-state="projects"');
    expect(index).toMatch(/<h2 class="text-ink text-h2 text-balance">No projects match\.<\/h2>/);
    expect(index).toContain('lucide-folder-open');
    expect(index).not.toContain('<button');
    // The content's /projects link is not the action here: Clear filters (a button) is.
    expect(hrefs(index.slice(index.indexOf('data-empty-state')))).toEqual([]);
  });

  it('/showcase: the block shows when no tile matches, with no Clear filters while no filter is set', () => {
    // No current selection empties the real wall (W10a-S), so the provider gets no tiles at all.
    const brands: Record<'citizen' | 'responder', BrandParam> = {
      citizen: { ids: ['smile-safe-taytay'], fallback: 'smile-safe-taytay' },
      responder: { ids: ['defensys'], fallback: 'defensys' },
    };
    const block = createElement(EmptyState, {
      state: emptyStates.showcase,
      icon: 'smartphone',
      name: 'showcase',
      action: createElement(ShowcaseClear, { label: 'Clear filters' }),
    });
    // Children go in as createElement's third argument (react/no-children-prop).
    const provider: Omit<ShowcaseProviderProps, 'children'> = { facets: [], brands, appFieldId: 'app' };
    const markup = html(
      createElement(ShowcaseProvider, provider as ShowcaseProviderProps, createElement(ShowcaseEmpty, {} as ShowcaseEmptyProps, block)),
    );
    expect(markup).toContain('data-empty-state="showcase"');
    expect(markup).toMatch(/<h2 class="text-ink text-h2 text-balance">Nothing matches these filters\.<\/h2>/);
    expect(markup).not.toContain('<button');
  });
});

describe('MapPhone', () => {
  const label = 'A fixture map. Fictional data.';
  const phone = html(createElement(MapPhone, { scene: 'lost', size: 'md', label }));

  it('is one role="img" phone named by its label, with device chrome and an inert canvas', () => {
    expect(phone).toMatch(/^<div role="img" aria-label="A fixture map\. Fictional data\." class="phone" data-phone="" data-size="md" data-chrome="device">/);
    expect(phone.match(/role="img"/g)).toHaveLength(1);
    expect(phone).toContain('aria-hidden="true" inert=""');
    expect(phone).toContain('data-replica-canvas=""');
  });

  it('draws the scene full screen on the Citizen canvas: the lost scene’s "You are here" dot', () => {
    expect(phone).toContain('class="rx-canvas" data-app="citizen" data-theme="light"');
    expect(phone).toMatch(/<div class="rx-map" data-theme="light"[^>]*style="height:100%"/);
    expect(phone).toContain('>You are here<');
  });

  it('follows its theme on the canvas and the map', () => {
    const dark = html(createElement(MapPhone, { scene: 'lost', size: 'sm', label, theme: 'dark' }));
    expect(dark).toContain('data-size="sm"');
    expect(dark).toContain('class="rx-canvas" data-app="citizen" data-theme="dark"');
    expect(dark).toContain('class="rx-map" data-theme="dark"');
  });
});

// ─── Guards: one block each, no local copies ───────────────────────────────────────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const rel = (path: string): string => relative(ROOT, path).replaceAll('\\', '/');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const sources = sourceFiles(SRC).map((path) => ({ file: rel(path), text: readFileSync(path, 'utf8') }));
const BLOCKS = ['src/components/content/empty-state.tsx', 'src/components/content/cta-band.tsx'];

describe('one EmptyState and one CtaBand', () => {
  it('only the shared blocks set the empty-state and CTA-band markers', () => {
    const setters = sources.filter(({ text }) => /data-empty-state|data-section="cta"/.test(text)).map(({ file }) => file);
    expect(setters.sort()).toEqual([...BLOCKS].sort());
  });

  it('every module outside src/content that reads the empty-state or CTA copy renders it through them', () => {
    const readers = sources.filter(
      ({ file, text }) =>
        !file.startsWith('src/content/') && !BLOCKS.includes(file) && /\b(emptyStates|callsToAction|testimonialsEmpty)\b/.test(text),
    );
    expect(readers.length).toBeGreaterThanOrEqual(5);
    const local = readers.filter(({ text }) => !/from '@\/components\/content\/(empty-state|cta-band)'/.test(text)).map(({ file }) => file);
    expect(local).toEqual([]);
  });

  it('the old local copies are gone', () => {
    expect(existsSync(join(SRC, 'components/sections/services/cta-band.tsx'))).toBe(false);
    const copies = sources
      .filter(({ file, text }) => file.startsWith('src/components/sections/') && /function (Empty|Callout|CtaBand)\b/.test(text))
      .map(({ file }) => file);
    expect(copies).toEqual([]);
  });

  it('the copy they render has no placeholder tokens (SectionHeader renders it in the site’s mode)', () => {
    const fields = [...Object.values(emptyStates), ...Object.values(callsToAction), home.testimonialsEmpty].flatMap((copy) => [
      copy.title,
      copy.body ?? '',
      copy.cta?.label ?? '',
    ]);
    expect(fields.filter((field) => hasToken(field))).toEqual([]);
  });
});
