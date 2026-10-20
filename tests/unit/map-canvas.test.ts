import { brotliCompressSync } from 'node:zlib';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MAP_SCENE_KEYS, MAP_SCENES, type MapSceneKey, RMapCanvas } from '@/components/replicas/kit';
import { MAP_PIN_BOX, MAP_PUCK_BOX } from '@/components/replicas/kit/map-markers';
import { mapRoutePoints } from '@/components/replicas/kit/map-scenes';

/** The kit's markup rule: div, span and inline SVG shapes only (tests/unit/replica-kit.test.ts). */
const ALLOWED_TAGS = new Set(['div', 'span', 'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

function tagsIn(html: string): readonly string[] {
  return [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => (match[1] ?? '').toLowerCase());
}

function classesIn(html: string): readonly string[] {
  return [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((match) => (match[1] ?? '').split(/\s+/).filter(Boolean));
}

function renderScene(scene: MapSceneKey, theme: 'light' | 'dark' = 'light'): string {
  const height = MAP_SCENES[scene].height;
  return renderToStaticMarkup(createElement(RMapCanvas, { theme, height, scene }));
}

/** Building footprints drawn (one "h…v…h…Z" subpath each). */
function buildingCount(html: string): number {
  const d = /class="rx-map__buildings"[^>]*d="([^"]*)"|d="([^"]*)"[^>]*class="rx-map__buildings"/.exec(html);
  return ((d?.[1] ?? d?.[2] ?? '').match(/Z/g) ?? []).length;
}

describe('RMapCanvas', () => {
  it.each(MAP_SCENE_KEYS.flatMap((key) => (['light', 'dark'] as const).map((theme) => [key, theme] as const)))(
    '%s (%s) is inert-safe kit markup',
    (key, theme) => {
      const html = renderScene(key, theme);
      expect(tagsIn(html).filter((tag) => !ALLOWED_TAGS.has(tag))).toEqual([]);
      expect(classesIn(html).filter((name) => !/^(rx-|r-|lucide$|lucide-)/.test(name))).toEqual([]);
      expect(html).not.toMatch(/\sdata-(active|paused|next)[\s=>]/);
      expect(html).not.toMatch(/--app-[\w-]+\s*:/);
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
      expect(html).toContain(`data-theme="${theme}"`);
    },
  );

  it('renders deterministically', () => {
    for (const key of MAP_SCENE_KEYS) expect(renderScene(key)).toBe(renderScene(key));
  });

  it('keeps every scene light enough for the Home budget', () => {
    const sizes = Object.fromEntries(MAP_SCENE_KEYS.map((key) => [key, renderScene(key).length]));
    console.info('[map] html bytes per scene', JSON.stringify(sizes));
    for (const [key, size] of Object.entries(sizes)) expect(size, key).toBeLessThan(key === 'en-route' ? 60_000 : 40_000);
    // The two maps in the Home glimpse (1.5 delivery, 3.3 en route), compressed as served.
    const glimpse = brotliCompressSync(Buffer.from(renderScene('delivery') + renderScene('en-route'))).length;
    console.info('[map] Home glimpse maps, brotli bytes', glimpse);
    expect(glimpse).toBeLessThan(14_000);
  });

  it('draws only the part of the town a map can show', () => {
    const band = buildingCount(renderScene('delivery'));
    const full = buildingCount(renderToStaticMarkup(createElement(RMapCanvas, { theme: 'light', height: 'full', scene: 'delivery' })));
    expect(band).toBeGreaterThan(10);
    expect(full).toBeGreaterThan(band * 2);
    // Zoomed out, the buildings drop out (the dispatch overview).
    expect(buildingCount(renderScene('dispatch'))).toBe(0);
    expect(renderScene('dispatch')).toContain('data-detail="coarse"');
  });

  it('shows the canvas window by default, so town coordinates are canvas px', () => {
    const html = renderToStaticMarkup(createElement(RMapCanvas, { theme: 'light', height: 'full', pins: [{ x: 40, y: 60, kind: 'hazard' }] }));
    expect(html).toContain('transform:translate(-195px, -422px)');
    expect(html).toContain(`transform:translate(40px, 60px)`);
  });

  it('frames a band on its content when no view is given', () => {
    const html = renderToStaticMarkup(
      createElement(RMapCanvas, {
        theme: 'light',
        height: 220,
        pins: [
          { x: 100, y: 100, kind: 'store' },
          { x: 300, y: 200, kind: 'home' },
        ],
      }),
    );
    expect(html).toContain('transform:translate(-200px, -150px)');
  });

  it('glides the 1.5 rider along a trimmed route while active, ending at its poster', () => {
    const html = renderScene('delivery');
    expect(html).toMatch(/class="rx-map-puck"[^>]*data-look="badge"[^>]*data-glyph="moto"[^>]*data-glide="1"/);
    expect(html).toContain('--rx-map-path:path(&quot;M365 560');
    expect(html).toContain('--rx-map-rotate:auto 90deg');
    expect(html).toContain('--rx-map-g-0:34;--rx-map-g-1:55;--rx-map-gt-1:200ms;--rx-map-gd-1:2600ms');
    // The trimmed route starts at the rider in the poster (55%) and follows the same glide.
    expect(html).toMatch(/class="rx-map-route__trim" data-glide="1" style="stroke-dasharray:100 100;stroke-dashoffset:-55/);
    expect(html).toContain('pathLength="100"');
    expect(html).toContain('stroke="#0369A1" stroke-width="10"');
  });

  it('follows the 3.3 puck on a tilted map: the town slides along the mirrored route', () => {
    const html = renderScene('en-route');
    expect(html).toMatch(/class="rx-map"[^>]*data-tilt=""[^>]*data-follow=""/);
    expect(html).toContain('left:50%;top:66.7%;transform:rotateX(52deg)');
    expect(html).toMatch(/class="rx-map__world" data-glide="2" style="transform:translate\(-105px, -300px\)/);
    expect(html).toContain('--rx-map-path:path(&quot;M-105 -300');
    expect(html).toContain('class="rx-map__fog"');
    // Pins stand up on the tilted ground.
    expect(html).toContain('rotateX(-52deg)');
    // FAR → CLOSE → NEAR → ON SITE.
    expect(html).toMatch(/class="rx-map-route" data-recolor="3" style="color:#f87171;--rx-map-rc-1:#fb923c;--rx-map-rct-1:1100ms/);
  });

  it('keeps pins and the puck at their size when zoomed out', () => {
    const html = renderScene('dispatch');
    expect(html).toContain('scale(2.5)');
    expect(html).toMatch(/class="rx-map__world" style="transform:scale\(0.4\) translate\(-225px, -380px\)"/);
  });

  it('places the puck box centre on its point and turns it to the heading', () => {
    const html = renderScene('duty');
    const half = MAP_PUCK_BOX / 2;
    expect(html).toContain(`transform:translate(${105 - half}px, ${300 - half}px) rotate(40deg)`);
    expect(html).toContain('--rx-map-puck-c:var(--rx-map-accent)');
    expect(MAP_PIN_BOX.anchorX * 2).toBe(MAP_PIN_BOX.width);
  });

  it('labels pins on the side with room, unless told otherwise', () => {
    const html = renderScene('hazards');
    // "Your Location" sits in the right part of the view, so its label goes left.
    expect(html).toMatch(/data-side="left">Your Location</);
    expect(html).toMatch(/data-side="right">Flood</);
  });

  it('lets props override a scene', () => {
    const html = renderToStaticMarkup(
      createElement(RMapCanvas, { theme: 'dark', height: 220, scene: 'delivery', pins: [], route: { path: 'delivery', color: '#123456', width: 5, dashed: true } }),
    );
    expect(html).not.toContain('rx-map-pin');
    expect(html).toContain('color:#123456');
    // Dashed routes keep the dash period on the casing-less core and are never trimmed.
    expect(html).toContain('stroke-dasharray="10 8"');
    expect(html).not.toContain('rx-map-route__trim" data-glide');
  });

  it('draws the traffic layer only when asked', () => {
    expect(renderScene('field-report')).toContain('data-level="jam"');
    expect(renderScene('hazards')).not.toContain('rx-map__traffic');
  });

  it('draws the routes it is given from map-scenes geometry', () => {
    const html = renderScene('en-route-near');
    const first = mapRoutePoints('en-route')[0];
    expect(html).toContain(`d="M${first?.x} ${first?.y} L`);
  });
});
