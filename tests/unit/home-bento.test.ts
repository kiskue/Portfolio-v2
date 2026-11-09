import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BENTO_ORDER, BentoGrid } from '@/components/sections/home/bento-grid';
import { featuredCredential } from '@/components/sections/home/credentials-card';
import { brandIcons } from '@/components/sections/home/live-stores-card';
import { aiBuilds } from '@/content/ai-builds';
import { storeListings } from '@/content/apps/store';
import { credentials } from '@/content/credentials';
import { storeSummary } from '@/content/derived';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { services } from '@/content/services';
import type { PlaceholderMode, StoreListing } from '@/content/types';
import { formatDate, formatRatingCount, formatRatingValue } from '@/lib/format';

/*
 * The Home bento (PLAN "Home", design §2, §4.3; items S2.10–S2.15, S2.33–S2.42, S5.05, S5.09,
 * S5.10, S5.13, S5.32) as server HTML, in label mode (the site default) and hide mode.
 */

const render = (mode: PlaceholderMode): string => renderToStaticMarkup(createElement(BentoGrid, { mode }));
const label = render('label');
const hide = render('hide');

/** The markup of one bento cell. */
function cell(html: string, area: string): string {
  const start = html.indexOf(`data-bento="${area}"`);
  const next = html.indexOf('data-bento="', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
}

const hrefs = (html: string): string[] => [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1] ?? '');
const decode = (text: string): string => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'");

describe('BentoGrid', () => {
  it('renders the seven cards in reading order (cred before serv), each in a [data-bento] cell', () => {
    expect(BENTO_ORDER).toEqual(['proj', 'about', 'ai', 'live', 'cred', 'serv', 'testi']);
    expect(label).toMatch(/^<div class="bento[^"]*" data-section="bento">/);
    expect([...label.matchAll(/data-bento="(\w+)"/g)].map((match) => match[1])).toEqual([...BENTO_ORDER]);
    for (const area of BENTO_ORDER) {
      expect(label).toContain(`class="bento-cell [grid-area:${area}]" data-bento="${area}"`);
      expect(cell(label, area)).toMatch(/<section aria-labelledby="bento-\w+-title"/);
    }
  });

  it('lays the grid out with the PLAN’s areas at 1, 2 and 4 columns', () => {
    const css = readFileSync(fileURLToPath(new URL('../../src/components/sections/home/bento.css', import.meta.url)), 'utf8');
    expect(css).toContain('grid-template-areas: "proj" "about" "ai" "live" "cred" "serv" "testi";');
    expect(css).toMatch(/@container \(min-width: 36rem\) \{\s*\.bento-grid \{[^}]*"proj proj" "about ai" "live live" "cred serv" "testi testi"/);
    expect(css).toMatch(
      /@container \(min-width: 56rem\) \{\s*\.bento-grid \{[^}]*"proj proj about ai" "proj proj live live" "cred serv testi testi"/,
    );
  });
});

describe('the cards and where they link (design §2)', () => {
  it('Projects: the glimpse trio, each phone to its case study, and All projects in the header', () => {
    const proj = cell(label, 'proj');
    expect(proj).toContain('data-layout="trio"');
    expect(proj).toContain('class="proj-player');
    expect(hrefs(proj)).toEqual([
      '/projects',
      '/projects/sme-panindio',
      '/projects/defensys-citizen',
      '/projects/defensys-responder',
      '/projects/sme-panindio',
      '/projects/defensys-citizen',
      '/projects/defensys-responder',
    ]);
    expect(proj).toContain(`${home.cards.proj.linkLabel}<svg`);
  });

  it('About: the whole card links to /about, the fan is decorative and lifts on hover', () => {
    const about = cell(label, 'about');
    expect(hrefs(about)).toEqual(['/about']);
    expect(about).toContain('after:absolute after:inset-0');
    expect(about).toContain('hover:-translate-y-[3px]');
    expect(about).toContain('<div class="fan" aria-hidden="true">');
    expect(about.match(/class="fan-card fan-card--\w+"/g)).toEqual([
      'class="fan-card fan-card--back"',
      'class="fan-card fan-card--middle"',
      'class="fan-card fan-card--front"',
    ]);
    expect(about).toContain(profile.education.degree);
    expect(about).toContain(profile.education.school);
    expect(about).toMatch(/<img alt=""/);
  });

  it('About: years of experience show as a marked "[[N]]+ years" in label mode and not at all in hide mode', () => {
    expect(profile.yearsOfExperience).toBeNull();
    expect(cell(label, 'about')).toMatch(/<mark class="ph[^"]*">N<span class="sr-only"> \(placeholder\)<\/span><\/mark>\+ years shipping production apps/);
    expect(cell(hide, 'about')).not.toContain('years shipping');
  });

  it('AI builds: a header link to the AI projects, a chip per build named with its status, and a legend', () => {
    const ai = cell(label, 'ai');
    expect(hrefs(ai)).toEqual(['/projects?type=ai', ...aiBuilds.map((build) => build.href)]);
    expect(ai).toContain('SME AI assistant</span>');
    expect(ai).toContain('<span class="sr-only">, Beta</span>');
    expect(ai).toContain('aria-label="Status key"');
    expect(ai).not.toContain('hover:-translate-y-[3px]');
  });

  it('Live: every figure comes from the store data, worded as facts about the apps', () => {
    const live = decode(cell(label, 'live'));
    const text = live.replace(/<[^>]+>/g, '');
    const { topInstalls, topRating } = storeSummary;
    expect(text).toContain(
      `${storeSummary.publicBrands} apps · , ${storeSummary.listings} store listings (${storeSummary.play} Google Play · , ${storeSummary.appstore} App Store)`,
    );
    expect(text).toContain(`${topInstalls?.installs}installs`);
    expect(text).toContain(`${formatRatingValue(topRating?.value ?? 0)}${formatRatingCount(topRating?.count ?? 0)}`);
    expect(text).toContain('Smile SAFE Taytay on Google Play');
    expect(text).toContain(`As of ${formatDate(storeSummary.asOf)} · , ${home.cards.live.footnote}`);
    // Links: the Citizen brands, then one store icon per public brand.
    const links = hrefs(live);
    expect(links[0]).toBe('/projects/defensys-citizen#brands');
    expect(links.slice(1)).toEqual(brandIcons(storeListings).map((listing) => listing.url));
    expect(links.slice(1)).toHaveLength(storeSummary.publicBrands);
  });

  it('Live: no store figure is typed into the card’s source (S5.05)', () => {
    const source = readFileSync(fileURLToPath(new URL('../../src/components/sections/home/live-stores-card.tsx', import.meta.url)), 'utf8');
    // Code only: the doc comments quote the rendered line on purpose.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(5K\+|4\.2|27 ratings|Oct 19|2026|8 store|6 apps)\b/);
    expect(code).not.toMatch(/\{\s*\d+\s*\}/);
  });

  it('brandIcons keeps one listing per brand, the Google Play one when there is one', () => {
    const fixture = (brand: StoreListing['brand'], platform: StoreListing['platform']) => ({ id: `${brand}.${platform}`, brand, platform }) as StoreListing;
    const listings = [fixture('1hope', 'appstore'), fixture('1hope', 'play'), fixture('sjdm-app', 'appstore')];
    expect(brandIcons(listings).map((listing) => listing.id)).toEqual(['1hope.play', 'sjdm-app.appstore']);
    expect(brandIcons(storeListings).every((listing) => listing.platform === 'play')).toBe(true);
  });

  it('Credentials: the whole card links to /about#credentials, with the medallion and the featured credential', () => {
    const cred = cell(label, 'cred');
    expect(hrefs(cred)).toEqual(['/about#credentials']);
    expect(cred).toContain('lucide-graduation-cap');
    // Label mode: the example certification, marked and tagged, over the degree.
    expect(cred).toMatch(/<mark class="ph[^"]*">Certification name/);
    expect(cred).toContain('>Example</span>');
    expect(cred).toContain(`${profile.education.degree} · ${profile.education.short}</p>`);
    // Hide mode: the degree itself in the pill, no example.
    const hidden = cell(hide, 'cred');
    expect(hidden).not.toContain('<mark');
    expect(hidden).not.toContain('>Example</span>');
    expect(hidden).toContain(`</span>${profile.education.degree} · ${profile.education.short}</span>`);
  });

  it('featuredCredential: the first visible credential unless it is the degree', () => {
    expect(featuredCredential(credentials, 'label')?.id).toBe('example-certification');
    expect(featuredCredential(credentials, 'hide')).toBeNull();
    expect(featuredCredential([], 'label')).toBeNull();
  });

  it('Services: a header link to /services and five numbered rows to their blocks', () => {
    const serv = cell(label, 'serv');
    expect(hrefs(serv)).toEqual(['/services', ...services.map((service) => `/services#${service.id}`)]);
    expect(serv.match(/<li>/g)).toHaveLength(services.length);
    for (const index of ['01', '02', '03', '04', '05']) expect(serv).toContain(`>${index}</span>`);
  });

  it('Testimonials: three Example-tagged quote cards as a whole-card link in label mode', () => {
    const testi = cell(label, 'testi');
    expect(hrefs(testi)).toEqual(['/testimonials']);
    expect(testi.match(/>Example<\/span>/g)).toHaveLength(3);
    expect(testi).toContain('class="testi-quotes pointer-events-none');
  });

  it('Testimonials: hide mode shows the empty state, whose Leave a note link is the card’s only link', () => {
    const testi = cell(hide, 'testi');
    expect(testi).toContain(home.testimonialsEmpty.title.replace('’', '’'));
    expect(hrefs(testi)).toEqual(['/contact?topic=testimonial']);
    expect(testi).not.toContain('hover:-translate-y-[3px]');
    expect(testi).not.toContain('>Example</span>');
  });
});
