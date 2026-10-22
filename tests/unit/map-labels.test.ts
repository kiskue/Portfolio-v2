import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MAP_SCENES, RMapCanvas, type RMapCanvasProps } from '@/components/replicas/kit';
import { TOWN } from '@/components/replicas/kit/map-town';

/*
 * Place names and points of interest (kit/map-layers.tsx): drawn only where they show, by their
 * estimated box against the map's view (flat, zoomed, or tilted with its fog), and a point of
 * interest is three elements. Both keep the Home trio's maps inside the DOM budget without
 * changing what the maps look like (the dropped names were outside the view or in the fog;
 * checked against browser captures).
 */

const render = (props: RMapCanvasProps): string => renderToStaticMarkup(createElement(RMapCanvas, props));
const names = (html: string): readonly string[] => [...html.matchAll(/class="rx-map-label"[^>]*>([^<]*)</g)].map((match) => match[1] ?? '');
const pois = (html: string): readonly string[] =>
  [...html.matchAll(/<span class="rx-map-poi"[^>]*>(?:<svg[^>]*>.*?<\/svg>)([^<]*)<\/span>/g)].map((match) => match[1] ?? '');

describe('map place names', () => {
  it('draws, on a full-height map, the names whose boxes reach into its 390×844 window and no others', () => {
    const html = render({ theme: 'light', height: 'full' });
    expect(names(html)).toEqual([
      'Example Ave.',
      'Sample St.',
      'Plaza Ave.',
      'Bridge St.',
      'School St.',
      'Old Rd.',
      'Riverside Dr.',
      'Sample River',
      'BRGY. EXAMPLE',
    ]);
    // Anchored past the right edge (x 470): the old 60 px margin kept them, but no part shows.
    expect(html).not.toContain('BRGY. SAMPLE');
    expect(html).not.toContain('Sample Rd.');
    expect(pois(html)).toEqual(['Town Hospital', 'Public Market', 'Riverside Park']);
  });

  it('keeps the names that cross into view at an edge', () => {
    // "Bridge St." at x 48 is drawn; its twin at x 470 is not. The river's name at the left edge stays.
    const html = render({ theme: 'light', height: 'full' });
    expect(html).toMatch(/translate\(48px, 400px\)[^"]*"[^>]*>Bridge St\./);
    expect(html).not.toMatch(/translate\(470px, 400px\)/);
    expect(names(html).filter((name) => name === 'Sample River')).toHaveLength(1);
  });

  it('draws a tilted map’s names up to its fog, not beyond', () => {
    const html = render({ theme: 'light', height: 'full', tilt: true, traffic: true, route: { path: 'en-route', color: '#f87171', width: 5 } });
    const drawn = names(html);
    // In front of the fog, including far names a flat map would not show (the view widens ahead).
    expect(drawn).toEqual(expect.arrayContaining(['Hill St.', 'Sample Rd.', 'BRGY. EXAMPLE']));
    // Wholly more than 780 px ahead of the camera (y 422): inside the opaque fog.
    for (const label of TOWN.labels.filter((candidate) => candidate.y < 422 - 780 - 60)) {
      expect(html, label.text).not.toContain(`translate(${label.x}px, ${label.y}px)`);
    }
    expect(drawn).not.toContain('BRGY. NORTH');
    expect(pois(html)).toEqual(['Town Hospital', 'Public Market', 'Town Plaza', 'Riverside Park']);
  });

  it('keeps a zoomed-out map’s large names at their size and in view', () => {
    const html = render({ theme: 'light', height: MAP_SCENES.dispatch.height, scene: 'dispatch' });
    expect(names(html)).toEqual(['Sample River', 'Sample River', 'Example Bay', 'BRGY. EXAMPLE', 'BRGY. SAMPLE', 'BRGY. NORTH', 'BRGY. COAST']);
    expect(pois(html)).toEqual([]);
  });
});

describe('map points of interest', () => {
  it('is three elements: the name span, its disc (an svg) and one glyph path', () => {
    const html = render({ theme: 'light', height: 'full' });
    const poi = /<span class="rx-map-poi"[^>]*>.*?<\/span>/.exec(html)?.[0] ?? '';
    expect(poi).toMatch(
      /^<span class="rx-map-poi" data-kind="hospital" style="transform:translate\(147px, 36px\)"><svg class="rx-map-poi__icon" width="16" height="16" viewBox="-7.2 -7.2 38.4 38.4"[^>]*><path d="[^"]+"><\/path><\/svg>Town Hospital<\/span>$/,
    );
    expect(poi.match(/<[a-z]+/g)).toEqual(['<span', '<svg', '<path']);
  });

  it('keeps its size when the map zooms out', () => {
    const html = render({ theme: 'light', height: 'full', view: { cx: 195, cy: 300, zoom: 0.8 } });
    // 1 / 0.8, written with the map's one-decimal number format.
    expect(html).toMatch(/class="rx-map-poi"[^>]*style="transform:translate\(147px, 36px\) scale\(1\.3\)"/);
  });
});
