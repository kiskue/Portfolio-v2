import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeHeader } from '@/components/sections/home/home-header';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import type { PlaceholderMode } from '@/content/types';

/*
 * The Home header row (design §1, §4.2; items S2.01–S2.03, S2.M1, S5.10) as server HTML, in label
 * mode (the site default) and hide mode.
 */

const render = (mode: PlaceholderMode): string => renderToStaticMarkup(createElement(HomeHeader, { mode }));
const label = render('label');
const hide = render('hide');

describe('HomeHeader', () => {
  it('sets the H1 as two lines with one break, which narrow screens drop (the H1 stays one text block)', () => {
    const [first, second] = home.headline;
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(label)?.[1] ?? '';
    expect(h1).toBe(`${first}<br class="max-md:hidden"/> ${second}`);
    expect(label.match(/<h1\b/g)).toHaveLength(1);
    // No block children inside the H1: Chrome would then report each line as its own LCP candidate.
    expect(h1).not.toMatch(/<(span|div|p)\b/);
  });

  it('puts the subline under the H1', () => {
    expect(label).toContain(`<p class="mt-4 max-w-[60rem] text-lead text-ink-2">${home.subline}</p>`);
  });

  it('offers Get in touch (primary, arrow up-right), and View projects only below 768px', () => {
    const contact = /<a [^>]*href="\/contact"[^>]*>([\s\S]*?)<\/a>/.exec(label);
    expect(contact?.[0]).toContain('bg-ink');
    expect(contact?.[1]).toContain(home.ctas.contact);
    expect(contact?.[1]).toMatch(/<svg[^>]*class="[^"]*lucide-arrow-up-right/);
    const projects = /<a [^>]*href="\/projects"[^>]*>/.exec(label)?.[0] ?? '';
    expect(projects).toContain('md:hidden');
    expect(label).toContain(`>${home.ctas.projects}</a>`);
  });

  it('shows the CV as a non-link placeholder chip in label mode and nothing in hide mode (cvUrl is null)', () => {
    expect(profile.cvUrl).toBeNull();
    expect(label).toContain(home.ctas.cv);
    expect(label).toContain('<span class="sr-only"> (placeholder)</span>');
    expect(label).not.toMatch(/<a [^>]*download/);
    expect(hide).not.toContain(home.ctas.cv);
  });

  it('shows the meta row below 1280px: availability (marked in label mode), location and time zone', () => {
    const meta = /<p class="[^"]*xl:hidden[^"]*">([\s\S]*?)<\/p>/.exec(label)?.[1] ?? '';
    expect(meta).toContain('<mark class="ph');
    expect(meta).toContain('Open to roles &amp; projects');
    expect(meta).toContain(profile.location);
    expect(meta).toContain(profile.timezone);
    expect(meta).toContain('bg-status-live');

    // Hide mode drops the placeholder segment and its dot, with no dangling separator.
    const hidden = /<p class="[^"]*xl:hidden[^"]*">([\s\S]*?)<\/p>/.exec(hide)?.[1] ?? '';
    expect(hidden).not.toContain('<mark');
    expect(hidden).not.toContain('bg-status-live');
    expect(hidden).toContain(`${profile.location}<span aria-hidden="true"> · </span>`);
    expect(hidden.startsWith('<span>')).toBe(true);
  });
});
