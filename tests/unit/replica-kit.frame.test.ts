import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandVars, type BrandVarsProps } from '@/components/showcase/brand-vars';
import { PHONE_SCALE, PhoneFrame, type PhoneFrameProps } from '@/components/showcase/phone-frame';
import { ScreenCaption, ScreenFigure } from '@/components/showcase/screen-figure';
import { ScreenView, type ScreenViewProps } from '@/components/showcase/screen-view';
import { Copy } from '@/components/ui/copy';
import { brandById, getFigure } from '@/content/derived';
import type { ScreenImage } from '@/content/types';
import { BRAND_VAR_NAMES } from '@/lib/brand-vars';
import { ph } from '@/lib/placeholder';

function view(props: ScreenViewProps): string {
  return renderToStaticMarkup(createElement(ScreenView, props));
}

/** The attribute form React writes for a string. */
function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function image(presentation: ScreenImage['presentation']): ScreenImage {
  return {
    src: '/__tmp__/screen.png',
    width: presentation === 'raw' ? 1320 : 1242,
    height: presentation === 'raw' ? 2868 : 2208,
    alt: 'Smile SAFE Taytay home screen with the weather station card.',
    provenance: 'appstore',
    presentation,
  };
}

describe('PhoneFrame and ScreenView: replicas', () => {
  const sos = getFigure('2.3');
  const html = view({ source: { kind: 'replica', figure: '2.3' }, size: 'md' });

  it('labels the frame with the figure summary as role="img"', () => {
    expect(html).toContain(`role="img" aria-label="${attr(sos.summary)}" class="phone"`);
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-chrome="device"');
  });

  it('makes the screen inert and hidden, and marks it as a replica canvas', () => {
    expect(html).toContain('class="phone-screen" aria-hidden="true" inert="" data-replica-canvas=""');
  });

  it('draws the replica inside RCanvas with the figure app and theme', () => {
    expect(html).toContain('<div class="rx-canvas" data-app="citizen" data-theme="light">');
  });

  it('draws the device chrome from the figure (status bar glyphs, home indicator)', () => {
    expect(html).toContain('class="phone-chrome" data-status="dark" data-indicator="dark"');
    expect(html).toContain('9:41');
    expect(html).toContain('phone-chrome__punch');
    const dark = view({ source: { kind: 'replica', figure: '1.6' }, size: 'sm' });
    expect(dark).toContain('data-app="sme" data-theme="dark"');
    expect(dark).toContain('data-status="light" data-indicator="light"');
  });

  it("wraps a brandable replica in its brand's variables by default", () => {
    expect(html).toContain('data-brand="smile-safe-taytay"');
    expect(html).toContain('--app-primary:#085499');
    const hope = view({ source: { kind: 'replica', figure: '2.3', brand: '1hope' }, size: 'md' });
    expect(hope).toContain('data-brand="1hope"');
    expect(hope).toContain(`--app-primary:${brandById('1hope').palette.primary}`);
  });

  it('leaves the brand to a surrounding BrandScope with brandMode="inherit", and never brands fixed screens', () => {
    for (const markup of [
      view({ source: { kind: 'replica', figure: '2.3' }, size: 'md', brandMode: 'inherit' }),
      view({ source: { kind: 'replica', figure: '2.4' }, size: 'md' }),
      view({ source: { kind: 'replica', figure: '1.1' }, size: 'md' }),
    ]) {
      expect(markup).not.toContain('data-brand=');
      expect(markup).not.toContain('--app-primary');
    }
  });

  it('omits the chrome with chrome="none" and passes size="inherit" through', () => {
    const bare = view({ source: { kind: 'replica', figure: '3.1' }, size: 'inherit', chrome: 'none' });
    expect(bare).toContain('data-size="inherit"');
    expect(bare).toContain('data-chrome="none"');
    expect(bare).not.toContain('phone-chrome');
  });
});

describe('PhoneFrame and ScreenView: real screenshots', () => {
  it("puts a 'raw' image inside the frame, labelled by its alt, with no device chrome", () => {
    const raw = image('raw');
    const html = view({ source: { kind: 'image', image: raw }, size: 'lg' });
    expect(html).toContain(`role="img" aria-label="${attr(raw.alt)}" class="phone"`);
    expect(html).toContain('<img alt=""');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('object-cover object-top');
    expect(html).toContain(`sizes="${Math.ceil(390 * PHONE_SCALE.lg)}px"`);
    expect(html).not.toContain('data-replica-canvas');
    expect(html).not.toContain('phone-chrome');
  });

  it("shows a 'marketing' image in a card at its own aspect ratio, never in a phone frame", () => {
    const marketing = image('marketing');
    const html = view({ source: { kind: 'image', image: marketing }, size: 'md' });
    expect(html).not.toContain('class="phone"');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('class="screen-card" data-size="md" data-presentation="marketing"');
    expect(html).toContain('aspect-ratio:1242 / 2208');
    expect(html).toContain(`<img alt="${attr(marketing.alt)}"`);
  });
});

describe('ScreenFigure', () => {
  it('renders a <figure> with the FIG line as a visible <figcaption>', () => {
    const figure = getFigure('2.3');
    const html = renderToStaticMarkup(createElement(ScreenFigure, { source: { kind: 'replica', figure: '2.3' }, size: 'sm' }));
    expect(html.startsWith('<figure')).toBe(true);
    expect(html).toMatch(/<figcaption[^>]*><span[^>]*>FIG 2\.3<\/span>/);
    expect(html).toContain(attr(figure.caption));
    expect(html).toContain(`aria-label="${attr(figure.summary)}"`);
  });

  it('takes a caption override, and shows none for an image unless given one', () => {
    const custom = renderToStaticMarkup(
      createElement(ScreenFigure, { source: { kind: 'replica', figure: '1.1' }, size: 'xs', caption: 'Custom caption' }),
    );
    expect(custom).toContain('Custom caption</figcaption>');
    const plain = renderToStaticMarkup(createElement(ScreenFigure, { source: { kind: 'image', image: image('raw') }, size: 'xs' }));
    expect(plain).not.toContain('<figcaption');
    const none = renderToStaticMarkup(createElement(ScreenFigure, { source: { kind: 'replica', figure: '1.1' }, size: 'xs', caption: null }));
    expect(none).not.toContain('<figcaption');
  });

  it('renders captions through Copy: a placeholder field gets the shared placeholder mark (reuse rule 8)', () => {
    const token = ph('Caption to confirm');
    const html = renderToStaticMarkup(createElement(ScreenFigure, { source: { kind: 'replica', figure: '1.1' }, size: 'xs', caption: token }));
    const copy = renderToStaticMarkup(createElement(Copy, { text: token }));
    expect(copy).toContain('<mark class="ph ');
    expect(copy).toContain('<span class="sr-only"> (placeholder)</span></mark>');
    expect(html).toContain(`<figcaption class="text-meta text-ink-3">${copy}</figcaption>`);
    expect(html).not.toContain('[[');
  });

  it('ScreenCaption is the FIG label, a space and the caption from figures.ts, rendered by Copy', () => {
    const figure = getFigure('3.2');
    const html = renderToStaticMarkup(createElement(ScreenCaption, { figure: '3.2' }));
    expect(html).toBe(
      `<span class="inline-block w-14 font-mono text-fig text-ink-2 uppercase">FIG 3.2</span> ${renderToStaticMarkup(createElement(Copy, { text: figure.caption }))}`,
    );
  });
});

describe('BrandVars', () => {
  it('sets every brand variable on a display:contents wrapper', () => {
    const html = renderToStaticMarkup(createElement(BrandVars, { brand: 'sjdm-app' } as BrandVarsProps, 'child'));
    expect(html).toMatch(/^<div data-brand="sjdm-app" style="display:contents;/);
    for (const name of BRAND_VAR_NAMES) expect(html).toContain(`${name}:`);
    expect(html).toContain('child</div>');
  });
});

describe('PhoneFrame', () => {
  it('is hook-free and renders directly (client islands reuse it)', () => {
    const html = renderToStaticMarkup(
      createElement(PhoneFrame, { size: 'xs', label: 'A phone', chrome: 'device', statusBar: 'light' } as PhoneFrameProps, 'canvas'),
    );
    expect(html).toContain('role="img" aria-label="A phone" class="phone" data-phone="" data-size="xs" data-chrome="device"');
    expect(html).toContain('<div class="phone-canvas">canvas<div class="phone-chrome" data-status="light" data-indicator="dark">');
  });
});
