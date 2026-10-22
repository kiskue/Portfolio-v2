import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, BrandSwitcher, type BrandScopeProps } from '@/components/showcase/brand-scope';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';

/*
 * SegmentedControl in forced colours (Windows High Contrast; PLAN "Manual checks"; design §10).
 * Forced colours drop shadows and fills and draw every transparent border, so the checked option
 * fills itself with the system Highlight. It opts out of forcing to keep that fill (a forced
 * Canvas backplate would hide its HighlightText), so it also drops its own shadow and ring and
 * sets its focus ring to CanvasText, and option media with colours of its own hands them back.
 * This pins the classes; tests/e2e/forced-colors.spec.ts checks the rendering in a browser.
 */

// BrandScope reads the URL inside Suspense; give it search params without the Next.js router.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/defensys-responder',
}));

const CHECKED_IN_FORCED_COLOURS = [
  'forced-colors:has-checked:forced-color-adjust-none',
  'forced-colors:has-checked:bg-[Highlight]',
  'forced-colors:has-checked:border-[Highlight]',
  'forced-colors:has-checked:text-[HighlightText]',
  'forced-colors:has-checked:[box-shadow:none]',
  'forced-colors:has-checked:outline-[CanvasText]',
];

/** The class list of each option (its <label>) in some markup. */
function optionClasses(markup: string): string[][] {
  return [...markup.matchAll(/<label class="([^"]*)"/g)].map((match) => (match[1] ?? '').split(/\s+/));
}

describe('SegmentedControl in forced colours', () => {
  type Choice = 'one' | 'two' | 'three';
  const options: readonly SegmentedOption<Choice>[] = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two', srLabel: 'Two, the second' },
    { value: 'three', label: 'Three', disabled: true },
  ];

  it.each([
    ['segmented', 'sm'],
    ['segmented', 'md'],
    ['chips', 'sm'],
    ['chips', 'md'],
  ] as const)('every %s option (%s) fills itself with Highlight once checked', (look, size) => {
    const markup = renderToStaticMarkup(
      createElement(SegmentedControl<Choice>, { name: 'choice', legend: 'Choice', options, defaultValue: 'two', look, size }),
    );
    const labels = optionClasses(markup);
    expect(labels).toHaveLength(options.length);
    for (const classes of labels) expect(classes).toEqual(expect.arrayContaining(CHECKED_IN_FORCED_COLOURS));
  });

  it('the Responder brand monograms keep the forced palette inside a checked option', () => {
    const props = brandScopeProps('responder') as BrandScopeProps;
    const markup = renderToStaticMarkup(createElement(BrandScope, props, createElement(BrandSwitcher)));
    const tiles = [...markup.matchAll(/<span aria-hidden="true" class="([^"]*\binline-grid\b[^"]*)"/g)].map((match) => match[1] ?? '');
    expect(tiles).toHaveLength(props.options.length);
    for (const classes of tiles) expect(classes.split(/\s+/)).toContain('forced-colors:forced-color-adjust-auto');
  });
});
