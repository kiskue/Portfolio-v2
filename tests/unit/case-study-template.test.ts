import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SECTION_LABELS } from '@/components/sections/case-study/case-study-section';
import { CaseStudyTemplate, SECTION_COMPONENTS } from '@/components/sections/case-study/case-study-template';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import { storeListings } from '@/content/apps/store';
import { caseStudies } from '@/content/case-studies';
import { adjacentCaseStudies, caseStudyMetrics, storeSummary } from '@/content/derived';
import { CASE_STUDY_SECTION_KEYS, type CaseStudy } from '@/content/types';

/*
 * The case-study template as server HTML (PLAN case-study template; W9): every section in content
 * order at its #anchor, the static "On this page" list, the hero (glimpse plus two flanks), the
 * brand table and switcher, the Screens toggle, the store links as text, the dated numbers, and
 * previous / next in cyclic order. What the browser does with it is tests/e2e/case-study.spec.ts.
 */

// BrandScope reads ?brand= after hydration (useSearchParam inside Suspense); give it a URL here.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/projects/defensys-citizen',
}));

const render = (study: CaseStudy): string => renderToStaticMarkup(createElement(CaseStudyTemplate, { study }));
const pages = new Map(caseStudies.map((study) => [study.slug, render(study)]));

function page(study: CaseStudy): string {
  const html = pages.get(study.slug);
  if (html === undefined) throw new Error(`not rendered: ${study.slug}`);
  return html;
}

/** Text as React writes it into HTML. */
const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const count = (html: string, needle: string | RegExp): number =>
  typeof needle === 'string' ? html.split(needle).length - 1 : [...html.matchAll(new RegExp(needle.source, `${needle.flags.replace('g', '')}g`))].length;

/** The markup of the element that opens with `opening` (a unique substring), up to its matching close tag. */
function element(html: string, opening: string): string {
  const start = html.indexOf(opening);
  if (start === -1) throw new Error(`missing ${opening}`);
  const tag = /^<([a-z0-9]+)/.exec(html.slice(html.lastIndexOf('<', start)))?.[1] ?? 'div';
  const from = html.lastIndexOf('<', start);
  let depth = 0;
  const pattern = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  pattern.lastIndex = from;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(from, match.index + match[0].length);
  }
  throw new Error(`unclosed ${opening}`);
}

const citizen = caseStudies.find((study) => study.slug === 'defensys-citizen') as CaseStudy;
const responder = caseStudies.find((study) => study.slug === 'defensys-responder') as CaseStudy;
const sme = caseStudies.find((study) => study.slug === 'sme-panindio') as CaseStudy;
const rows = caseStudies.map((study): [string, CaseStudy] => [study.slug, study]);

// ─── The template ────────────────────────────────────────────────────────────────────────

describe('SECTION_COMPONENTS', () => {
  it('maps every CaseStudySectionKey to a component and a label', () => {
    expect(Object.keys(SECTION_COMPONENTS).toSorted()).toEqual([...CASE_STUDY_SECTION_KEYS].toSorted());
    expect(Object.keys(SECTION_LABELS).toSorted()).toEqual([...CASE_STUDY_SECTION_KEYS].toSorted());
  });
});

describe.each(rows)('%s as server HTML', (_slug, study) => {
  const html = page(study);

  it('renders one h1 (the title), then each section in content order at its #anchor with an h2', () => {
    expect(count(html, '<h1')).toBe(1);
    expect(html).toMatch(new RegExp(`<h1 id="case-study-title"[^>]*>${study.title}</h1>`));
    const ids = [...html.matchAll(/<section id="([a-z]+)" aria-labelledby="\1-title" data-cs-section="\1"/g)].map((match) => match[1]);
    expect(ids).toEqual([...study.sections]);
    for (const key of study.sections) expect(html).toContain(`<h2 id="${key}-title"`);
  });

  it('lists the sections in the static "On this page" pill: plain #anchors, nothing that watches the scroll', () => {
    const nav = element(html, 'aria-label="On this page"');
    expect([...nav.matchAll(/href="(#[a-z]+)"/g)].map((match) => match[1])).toEqual(study.sections.map((key) => `#${key}`));
    expect(nav).toContain('<details');
    const island = readFileSync(fileURLToPath(new URL('../../src/components/sections/case-study/section-nav.client.tsx', import.meta.url)), 'utf8');
    expect(island).not.toMatch(/IntersectionObserver|addEventListener\(['"]scroll/);
  });

  it('never prints a raw [[placeholder]] token', () => {
    expect(html).not.toContain('[[');
    expect(html).not.toContain(']]');
  });

  it('puts the hero glimpse between two sm flank phones, and nothing else in the hero plays', () => {
    const hero = element(html, 'data-cs-hero=""');
    expect(count(hero, 'data-glimpse-root=""')).toBe(1);
    expect(hero).toContain('data-layout="hero"');
    expect(count(hero, 'data-flank="start"')).toBe(1);
    expect(count(hero, 'data-flank="end"')).toBe(1);
    for (const side of ['start', 'end']) expect(element(hero, `data-flank="${side}"`)).toContain('data-size="sm"');
    expect(count(hero, 'aria-label="Key figures"')).toBe(1);
  });

  it('shows each feature as a static row with an md phone (no scrollytelling)', () => {
    const built = element(html, '<section id="built"');
    expect(count(built, 'data-feature="')).toBe(study.features.length);
    expect(count(built, /class="phone" data-phone="" data-size="md"/)).toBe(study.features.length);
    expect(built).not.toContain('data-glimpse-root');
  });

  it('draws every architecture diagram as a FlowDiagram', () => {
    const architecture = element(html, '<section id="architecture"');
    for (const diagram of study.architecture) expect(architecture).toContain(`data-flow="${diagram.id}"`);
  });

  it('shows the Screens grid inside the source toggle, one phone per screen', () => {
    const screens = element(html, '<section id="screens"');
    expect(screens).toContain('data-source-toggle=""');
    const replicas = element(screens, 'data-source-pane="replica"');
    expect(count(replicas, 'data-phone=""')).toBe(study.screens.length);
  });

  it('dates its numbers from the metrics', () => {
    const numbers = element(html, '<section id="numbers"');
    expect(count(numbers, 'data-metric="')).toBe(caseStudyMetrics(study).length);
    expect(numbers).toContain('Counted from source on Oct 19, 2026');
  });

  it('ends with the honest gaps, then previous and next in cyclic order', () => {
    const next = element(html, '<section id="next"');
    const { prev, next: following } = adjacentCaseStudies(study.slug);
    for (const gap of study.gaps) expect(next).toContain(escape(gap));
    const cards = element(next, 'aria-label="Other case studies"');
    expect([...cards.matchAll(/href="(\/projects\/[a-z-]+)"/g)].map((match) => match[1])).toEqual([
      `/projects/${prev.slug}`,
      `/projects/${following.slug}`,
    ]);
    // The cards carry no phone, so the hero's view-transition name cannot repeat.
    expect(cards).not.toContain('data-phone');
  });
});

// ─── Brands and store links ──────────────────────────────────────────────────────────────

describe('brands and store links', () => {
  it('Citizen: one BrandScope on ?brand= around the page, with the switcher under the hero stage', () => {
    const html = page(citizen);
    expect(count(html, 'data-brand-scope="citizen"')).toBe(1);
    expect(html).toContain('data-brand-param="brand"');
    expect(html).toContain('data-brand="smile-safe-taytay"');
    const hero = element(html, 'data-cs-hero=""');
    expect(count(hero, 'data-brand-switcher=""')).toBe(1);
    expect(count(hero, 'type="radio"')).toBe(citizenBrands.length);
  });

  it('Citizen: the #brands table lists the six public brands, each with a Preview button', () => {
    const brands = element(page(citizen), '<section id="brands"');
    expect(count(brands, 'data-brand-row="')).toBe(citizenBrands.length);
    expect(count(brands, 'data-brand-preview="')).toBe(citizenBrands.length);
    expect(count(brands, 'aria-pressed="true"')).toBe(1);
    expect(brands).toContain('data-brand-preview="smile-safe-taytay"');
    expect(brands).toContain(`Store figures as of Oct 19, 2026`);
  });

  it('Citizen: every store link is a text link to a listing from the store data, never a badge', () => {
    const html = page(citizen);
    const hrefs = new Set([...html.matchAll(/href="(https:\/\/(?:play\.google\.com|apps\.apple\.com)[^"]*)"/g)].map((match) => match[1]?.replaceAll('&amp;', '&')));
    expect([...hrefs].toSorted()).toEqual(storeListings.map((listing) => listing.url).toSorted());
    // No official store badge artwork: the only store images are the apps' public icons and screenshots.
    expect(html).not.toMatch(/\ssrc(?:Set)?="[^"]*badge/i);
    const storeImages = [...html.matchAll(/<img[^>]*src="([^"]*%2Fstore%2F[^"]*)"/g)].map((match) => decodeURIComponent(match[1] ?? ''));
    expect(storeImages.length).toBeGreaterThan(0);
    for (const src of storeImages) expect(src).toMatch(/\/store\/citizen\/[a-z0-9-]+\/(?:play|appstore)-(?:icon|\d{2})\.webp/);
    expect(html).toContain('>Google Play<');
    expect(html).toContain('>App Store<');
  });

  it('Citizen: the store figures come from the store data (computed, not restated)', () => {
    const numbers = element(page(citizen), '<section id="numbers"');
    expect(numbers).toContain(`${storeSummary.play} + ${storeSummary.appstore}`);
    expect(numbers).toContain('store figures as of Oct 19, 2026');
    const glance = element(page(citizen), '<section id="overview"');
    expect(glance).toContain(`${storeSummary.play} on Google Play`);
  });

  it('Responder: four brands with an honest status and no store links', () => {
    const html = page(responder);
    expect(count(html, 'data-brand-scope="responder"')).toBe(1);
    const brands = element(html, '<section id="brands"');
    expect(count(brands, 'data-brand-row="')).toBe(responderBrands.length);
    expect(brands).toContain('Private distribution');
    expect(html).not.toMatch(/play\.google\.com|apps\.apple\.com/);
  });

  it('SME: no brand scope, no store links, and the #ai section with its trio, guardrails and pipeline', () => {
    const html = page(sme);
    expect(html).not.toContain('data-brand-scope');
    expect(html).not.toMatch(/play\.google\.com|apps\.apple\.com/);
    const ai = element(html, '<section id="ai"');
    const special = sme.specials.find((candidate) => candidate.kind === 'ai');
    if (special?.kind !== 'ai') throw new Error('SME has no #ai special');
    for (const figure of special.figures) expect(ai).toContain(`FIG ${figure}`);
    expect(count(ai, /class="phone" data-phone="" data-size="sm"/)).toBe(special.figures.length);
    expect(ai).toContain(`data-flow="${special.diagram.id}"`);
    for (const guardrail of special.guardrails) expect(ai).toContain(escape(guardrail));
  });
});

// ─── Honest labels ───────────────────────────────────────────────────────────────────────

describe('honest labels', () => {
  it('marks Responder features that are not plainly shipped', () => {
    const built = element(page(responder), '<section id="built"');
    expect(built).toContain('>In rollout<');
    expect(built).toContain('>In progress<');
  });

  it('marks the unconfirmed role and timeline as placeholders in label mode', () => {
    const glance = element(page(citizen), '<section id="overview"');
    expect(glance).toContain('Your title at DGSI<span class="sr-only"> (placeholder)</span></mark>');
    expect(glance).toContain('YYYY – present<span class="sr-only"> (placeholder)</span></mark>');
  });

  it('shows an unconfirmed repo link as a non-link chip', () => {
    const glance = element(page(sme), '<section id="overview"');
    expect(glance).toContain('(link not added yet)');
    expect(glance).not.toMatch(/<a [^>]*>Source code/);
  });
});
