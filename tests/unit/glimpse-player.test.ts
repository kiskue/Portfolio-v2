import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlimpsePlayer, type GlimpsePlayerProps } from '@/components/showcase/glimpse';
import { TapIndicator, TapLayer } from '@/components/showcase/tap-indicator';
import { glimpses } from '@/content/apps/glimpses';
import type { GlimpseId } from '@/content/types';

/*
 * The server-rendered glimpse player: what the HTML holds before JavaScript runs (design §5.3,
 * architecture D4). Every step is a server tree; each track shows its poster frame; nothing is
 * active; the controls exist but only show with JavaScript.
 */

const HOME: readonly GlimpseId[] = ['home.sme', 'home.citizen', 'home.responder'];

function render(props: GlimpsePlayerProps): string {
  return renderToStaticMarkup(createElement(GlimpsePlayer, props));
}

/** Every opening tag with a class token, e.g. tags(html, 'gl-frame'). */
function tags(html: string, className: string): string[] {
  return [...html.matchAll(new RegExp(`<[a-z]+[^>]*class="(?:[^"]* )?${className}(?: [^"]*)?"[^>]*>`, 'g'))].map((match) => match[0]);
}

const count = (html: string, needle: string): number => html.split(needle).length - 1;

describe('GlimpsePlayer: the Home trio as server HTML', () => {
  const html = render({ glimpses: HOME, layout: 'trio', size: 'inherit' });
  const frames = tags(html, 'gl-frame');
  const homeSteps = glimpses.filter((glimpse) => HOME.includes(glimpse.id)).flatMap((glimpse) => glimpse.steps);

  it('renders every step as a frame, plus the Responder poster frame', () => {
    expect(frames).toHaveLength(homeSteps.length + 1);
    expect(frames.filter((frame) => frame.includes('data-kind="poster"'))).toHaveLength(1);
  });

  it('shows exactly each track’s poster frame, with nothing active or queued', () => {
    const shown = frames.filter((frame) => frame.includes('data-shown=""'));
    expect(shown).toHaveLength(3);
    expect(shown.filter((frame) => frame.includes('data-kind="poster"'))).toHaveLength(1);
    expect(html).not.toMatch(/data-active=""/);
    expect(html).not.toMatch(/data-leaving=""/);
    for (const frame of frames.filter((candidate) => !candidate.includes('data-shown'))) expect(frame).toContain('aria-hidden="true"');
  });

  it('draws every phone at the track’s scale (size inherit) inside a track per app', () => {
    const tracks = tags(html, 'gl-track');
    expect(tracks).toHaveLength(3);
    expect(tracks.map((track) => /gl-ps-[\w-]+/.exec(track)?.[0])).toEqual(['gl-ps-auto-side', 'gl-ps-auto-centre', 'gl-ps-auto-side']);
    const phones = tags(html, 'phone');
    expect(phones).toHaveLength(frames.length);
    for (const phone of phones) expect(phone).toContain('data-size="inherit"');
  });

  it('skins the Citizen track as Smile SAFE Taytay first (rotation 1)', () => {
    const citizen = tags(html, 'gl-track').find((track) => track.includes('data-glimpse-track="1"')) ?? '';
    expect(citizen).toContain('--app-primary:#085499');
    expect(citizen).toContain('--app-name:&quot;Smile SAFE Taytay&quot;');
    expect(tags(html, 'gl-track').filter((track) => track.includes('--app-primary'))).toHaveLength(1);
  });

  it('links each phone to its case study, named by its label chip', () => {
    const links = tags(html, 'gl-link');
    expect(links.map((link) => /href="([^"]+)"/.exec(link)?.[1])).toEqual([
      '/projects/sme-panindio',
      '/projects/defensys-citizen',
      '/projects/defensys-responder',
    ]);
    for (const link of links) {
      const id = /aria-labelledby="([^"]+)"/.exec(link)?.[1];
      expect(id && html.includes(`id="${id}"`), link).toBe(true);
    }
    // Nothing interactive inside a link (the step dots and Pause sit outside them).
    for (const block of html.split('class="gl-link"').slice(1)) expect(block.split('</a>')[0]).not.toMatch(/<(button|input|a)\b/);
  });

  it('puts one tap ring in the frame of each tap (design §5.3 coordinates)', () => {
    const taps = homeSteps.flatMap((step) => step.taps ?? []);
    expect(count(html, 'class="gl-tap"')).toBe(taps.length);
    expect(html).toContain('--tap-x:262px;--tap-y:806px;--tap-at:1200ms');
  });

  it('captions the poster step and keeps the other captions hidden', () => {
    const caption = /<p[^>]*data-glimpse-caption=""[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[0] ?? '';
    expect(caption).toContain('aria-live="polite"');
    const items = caption.match(/<span( hidden="")?><span class="block/g) ?? [];
    expect(items).toHaveLength(homeSteps.length);
    expect(items.filter((item) => !item.includes('hidden'))).toHaveLength(1);
    expect(caption).toContain('FIG 1.1');
    expect(caption).toContain(' · Smile SAFE Taytay');
    expect(caption).toContain(' · 1Hope');
  });

  it('renders Pause, step dots for the current app only and the app picker', () => {
    expect(count(html, 'data-glimpse-control="pause"')).toBe(1);
    expect(html).toContain('aria-label="Pause preview"');
    const groups = tags(html, 'gl-dots');
    expect(groups).toHaveLength(3);
    expect(groups.filter((group) => group.includes('hidden=""'))).toHaveLength(2);
    expect(html).toContain('aria-label="Step 2 of 3: Point of sale"');
    expect(html).toMatch(/aria-current="step"/);
    expect(count(html, 'type="radio"')).toBe(3);
    expect(html).toContain('SME Panindio');
  });

  it('adds no DOM for the phone morph (React names the phones only during a transition)', () => {
    expect(render({ glimpses: HOME, layout: 'trio', size: 'inherit', morph: false })).toBe(html);
    expect(html).not.toContain('view-transition-name');
  });
});

describe('GlimpsePlayer: sizes and layouts', () => {
  it('a fixed trio size is the centre phone; the sides are one size smaller', () => {
    const html = render({ glimpses: HOME, layout: 'trio', size: 'md', morph: false });
    expect(tags(html, 'gl-track').map((track) => /gl-ps-[\w-]+/.exec(track)?.[0])).toEqual(['gl-ps-sm', 'gl-ps-md', 'gl-ps-sm']);
    const tiny = render({ glimpses: HOME, layout: 'trio', size: 'xs', morph: false });
    expect(tags(tiny, 'gl-track').map((track) => /gl-ps-[\w-]+/.exec(track)?.[0])).toEqual(['gl-ps-xs', 'gl-ps-xs', 'gl-ps-xs']);
  });

  it('a hero has no links, chips or picker, and notes a feature in rollout', () => {
    const html = render({ glimpses: ['hero.defensys-responder'], layout: 'hero', size: 'lg', morph: false });
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toContain('type="radio"');
    expect(html).toContain('data-layout="hero"');
    expect(tags(html, 'gl-track')[0]).toContain('gl-ps-lg');
    expect(html).toContain('FIG 3.5');
    expect(html).toContain(' · In rollout');
    expect(html).toContain('aria-label="Preview of Defensys Responder: duty switch, incoming dispatch, navigation and push-to-talk channels. Fictional data."');
  });

  it('a single layout keeps the links and the picker, one phone at a time', () => {
    const html = render({ glimpses: HOME, layout: 'single', size: 'md', morph: false, id: 'single' });
    expect(html).toContain('data-layout="single"');
    expect(tags(html, 'gl-link')).toHaveLength(3);
    expect(html).toContain('Read the SME Panindio case study');
    expect(html).toContain('id="single-caption"');
  });

  it('labels a multi-app player by its apps', () => {
    const html = render({ glimpses: HOME, layout: 'trio', size: 'inherit', morph: false });
    expect(html).toContain('aria-label="Previews of SME Panindio, Defensys Citizen and Defensys Responder. Fictional data."');
  });
});

describe('TapIndicator', () => {
  it('positions a tap in logical px with its start time; a hold carries its duration', () => {
    const tap = renderToStaticMarkup(createElement(TapIndicator, { tap: { x: 10, y: 20, atMs: 300, kind: 'tap' } }));
    expect(tap).toBe('<span class="gl-tap" data-kind="tap" style="--tap-x:10px;--tap-y:20px;--tap-at:300ms;--tap-hold:0ms"></span>');
    const hold = renderToStaticMarkup(createElement(TapIndicator, { tap: { x: 360, y: 806, atMs: 300, kind: 'hold', holdMs: 1200 } }));
    expect(hold).toContain('data-kind="hold"');
    expect(hold).toContain('--tap-hold:1200ms');
  });

  it('a step without taps renders no layer; the layer is decorative', () => {
    expect(renderToStaticMarkup(createElement(TapLayer, { taps: [] }))).toBe('');
    expect(renderToStaticMarkup(createElement(TapLayer, { taps: [{ x: 1, y: 2, atMs: 0, kind: 'tap' }] }))).toContain('class="gl-taps" aria-hidden="true"');
  });
});
