/* eslint-disable react/no-children-prop -- .ts tests have no JSX, and these components' prop types require `children`. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Button, ButtonLink, type ButtonProps } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ExternalLink } from '@/components/ui/external-link';
import { isHeavyRoute, resolvePrefetch } from '@/components/ui/link-prefetch';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

/** Each <input> tag's attributes (React's SSR attribute order differs from source order). */
function inputs(markup: string): Record<string, string>[] {
  return [...markup.matchAll(/<input ([^>]*?)\/?>/g)].map((tag) =>
    Object.fromEntries([...(tag[1] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1]!.toLowerCase(), attr[2]!])),
  );
}

describe('link prefetch policy (pages with replica phones prefetch on hover or focus only)', () => {
  it.each([
    ['/showcase', true],
    ['/showcase?app=sme', true],
    ['/projects/sme-panindio', true],
    ['/projects/defensys-citizen#brands', true],
    ['/projects', true],
    ['/projects?type=ai', true],
    ['/projects#more', true],
    ['/', true],
    ['/?ref=x', true],
    ['/#content', true],
    ['/about', false],
    ['/contact?topic=hiring', false],
    ['/showcases', false],
    ['/projectsx', false],
  ])('%s heavy: %s', (href, heavy) => {
    expect(isHeavyRoute(href)).toBe(heavy);
  });

  it('pages with replica phones default to intent, others to Next default; an explicit value always wins', () => {
    expect(resolvePrefetch('/showcase')).toBe('intent');
    expect(resolvePrefetch('/')).toBe('intent');
    expect(resolvePrefetch('/projects?type=web')).toBe('intent');
    expect(resolvePrefetch('/about')).toBeNull();
    expect(resolvePrefetch('/showcase', false)).toBe(false);
    expect(resolvePrefetch('/', null)).toBeNull();
    expect(resolvePrefetch('/about', 'intent')).toBe('intent');
  });
});

describe('Button', () => {
  it('requires an accessible name for icon-only buttons at the type level', () => {
    expectTypeOf<{ icon: 'x'; label: string }>().toExtend<ButtonProps>();
    expectTypeOf<{ children: string }>().toExtend<ButtonProps>();
    expectTypeOf<{ icon: 'x' }>().not.toExtend<ButtonProps>();
    expectTypeOf<{ icon: 'x'; label: string; children: string }>().not.toExtend<ButtonProps>();
  });

  it('icon-only buttons get aria-label; the glyph is decorative', () => {
    const markup = html(createElement(Button, { icon: 'pause', label: 'Pause animation' }));
    expect(markup).toContain('aria-label="Pause animation"');
    expect(markup).toContain('type="button"');
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('loading: aria-busy, aria-disabled, a spinner, and it cannot submit twice', () => {
    const markup = html(createElement(Button, { loading: true, type: 'submit', children: 'Sending…' }));
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('lucide-loader-circle');
  });

  it('ButtonLink renders a link to the typed route', () => {
    const markup = html(createElement(ButtonLink, { href: '/contact', icon: 'arrow-up-right', children: 'Get in touch' }));
    expect(markup).toMatch(/^<a [^>]*href="\/contact"/);
    expect(markup).toContain('Get in touch');
  });
});

describe('Chip', () => {
  it('puts the status word in the accessible name next to the decorative shape', () => {
    const markup = html(createElement(Chip, { icon: 'bot', status: 'beta', children: 'SME AI assistant' }));
    expect(markup).toContain('<span class="sr-only">, Beta</span>');
    expect(markup.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ExternalLink', () => {
  it('opens a new tab safely and says so', () => {
    const markup = html(createElement(ExternalLink, { href: 'https://github.com/kiskue', children: 'GitHub' }));
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('(opens in a new tab)');
    expect(markup).toContain('lucide-arrow-up-right');
  });

  it('keeps mailto: links in the same tab without the arrow', () => {
    const markup = html(createElement(ExternalLink, { href: 'mailto:gerricmeasco360@gmail.com', children: 'Email' }));
    expect(markup).not.toContain('target=');
    expect(markup).not.toContain('opens in a new tab');
    expect(markup).not.toContain('lucide-arrow-up-right');
  });
});

describe('SegmentedControl (native radios, hook-free)', () => {
  type Topic = 'hiring' | 'project';
  const options: readonly SegmentedOption<Topic>[] = [
    { value: 'hiring', label: 'Hiring' },
    { value: 'project', label: 'SME', srLabel: 'SME Panindio project' },
  ];

  it('uncontrolled: one named radio group in a fieldset with a legend, default checked', () => {
    const markup = html(createElement(SegmentedControl<Topic>, { name: 'topic', legend: 'Topic', options, defaultValue: 'project' }));
    expect(markup).toMatch(/^<fieldset/);
    expect(markup).toContain('<legend class="mb-2');
    const radios = inputs(markup);
    expect(radios.map((radio) => [radio.type, radio.name, radio.value])).toEqual([
      ['radio', 'topic', 'hiring'],
      ['radio', 'topic', 'project'],
    ]);
    expect(radios.map((radio) => 'checked' in radio)).toEqual([false, true]);
    expect(radios.some((radio) => 'readonly' in radio)).toBe(false);
  });

  it('legendHidden keeps the legend for screen readers only', () => {
    const markup = html(createElement(SegmentedControl<Topic>, { name: 't', legend: 'Topic', legendHidden: true, options }));
    expect(markup).toContain('<legend class="sr-only">Topic</legend>');
  });

  it('a short visible label gets a fuller accessible name that contains it', () => {
    const markup = html(createElement(SegmentedControl<Topic>, { name: 't', legend: 'Topic', options }));
    expect(markup).toContain('<span aria-hidden="true">SME</span><span class="sr-only">SME Panindio project</span>');
  });

  it('controlled without a handler is read-only (no React warning); with a handler it is not', () => {
    const readOnly = inputs(html(createElement(SegmentedControl<Topic>, { name: 't', legend: 'Topic', options, value: 'hiring' })));
    expect(readOnly.map((radio) => ['checked' in radio, 'readonly' in radio])).toEqual([
      [true, true],
      [false, true],
    ]);
    const live = inputs(
      html(createElement(SegmentedControl<Topic>, { name: 't', legend: 'Topic', options, value: 'hiring', onValueChange: () => {} })),
    );
    expect(live.map((radio) => ['checked' in radio, 'readonly' in radio])).toEqual([
      [true, false],
      [false, false],
    ]);
  });
});
