import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NavList, type NavListItem } from '@/components/layout/nav-list';
import { BrandPreviewButton } from '@/components/sections/case-study/brand-parts.client';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, type BrandScopeProps } from '@/components/showcase/brand-scope';
import { site } from '@/content/site';

/*
 * The site's other selected and current states in forced colours (Windows High Contrast; PLAN
 * "Manual checks"; design §10) take a checked SegmentedControl option's treatment: a Highlight
 * fill and border with HighlightText, opted out of forcing so no Canvas backplate hides that text,
 * with no shadow and a CanvasText focus ring. The nav's current row hands its icon and its
 * inline-start bar HighlightText too; the glimpse player's current step dot fills its mark with
 * Highlight. This pins the classes and the rule; tests/e2e/forced-colors.spec.ts checks the
 * rendering in a browser.
 */

// NavList marks the current row from the pathname; BrandScope reads the URL inside Suspense.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/about',
}));

/** The class list of each element with `tag` in some markup (React escapes & as &amp;). */
function classesOf(markup: string, tag: string): string[][] {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*\\bclass="([^"]*)"`, 'g'))].map((match) =>
    (match[1] ?? '').replaceAll('&amp;', '&').split(/\s+/),
  );
}

describe('the nav in forced colours', () => {
  const CURRENT_IN_FORCED_COLOURS = [
    'forced-colors:aria-[current=page]:forced-color-adjust-none',
    'forced-colors:aria-[current=page]:bg-[Highlight]',
    'forced-colors:aria-[current=page]:border-[Highlight]',
    'forced-colors:aria-[current=page]:text-[HighlightText]',
    'forced-colors:aria-[current=page]:[box-shadow:none]',
    'forced-colors:aria-[current=page]:outline-[CanvasText]',
    'forced-colors:aria-[current=page]:[&_svg]:text-inherit',
    'forced-colors:aria-[current=page]:before:bg-[HighlightText]',
  ];

  it('fills the current row with Highlight (every row carries the classes; aria-current applies them)', () => {
    const items: NavListItem[] = site.nav.map((item) => ({ id: item.id, label: item.label, href: item.href, match: item.match, icon: null }));
    const markup = renderToStaticMarkup(createElement(NavList, { items }));
    const links = classesOf(markup, 'a');
    expect(links).toHaveLength(site.nav.length);
    for (const classes of links) expect(classes).toEqual(expect.arrayContaining(CURRENT_IN_FORCED_COLOURS));
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  });
});

describe('the Brands "Preview" button in forced colours', () => {
  const PRESSED_IN_FORCED_COLOURS = [
    'forced-colors:aria-pressed:forced-color-adjust-none',
    'forced-colors:aria-pressed:bg-[Highlight]',
    'forced-colors:aria-pressed:border-[Highlight]',
    'forced-colors:aria-pressed:text-[HighlightText]',
    'forced-colors:aria-pressed:[box-shadow:none]',
    'forced-colors:aria-pressed:outline-[CanvasText]',
  ];

  it.each(['citizen', 'responder'] as const)('fills the pressed %s button with Highlight (every button carries the classes; aria-pressed applies them)', (app) => {
    const props = brandScopeProps(app) as BrandScopeProps;
    const buttons = props.options.map((option) => createElement(BrandPreviewButton, { key: option.id, brand: option.id, name: option.name }));
    const markup = renderToStaticMarkup(createElement(BrandScope, props, ...buttons));
    const classes = classesOf(markup, 'button');
    expect(classes).toHaveLength(props.options.length);
    for (const list of classes) expect(list).toEqual(expect.arrayContaining(PRESSED_IN_FORCED_COLOURS));
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
});

describe('the glimpse step dots in forced colours', () => {
  const css = readFileSync(fileURLToPath(new URL('../../src/components/showcase/glimpse.css', import.meta.url)), 'utf8');

  it("fill the current step's mark with Highlight", () => {
    const rule = /@media \(forced-colors: active\) \{\s*\.gl-dot\[aria-current="step"\]::before \{([^}]*)\}/.exec(css)?.[1];
    expect(rule, "a forced-colours rule for the current step's mark").toBeDefined();
    expect(rule).toMatch(/\bbackground-color: Highlight;/);
    expect(rule).toMatch(/\bborder-color: Highlight;/);
  });
});
