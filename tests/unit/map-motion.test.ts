import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MAP_PIN_BOX, MAP_PUCK_BOX } from '@/components/replicas/kit/map-markers';

/*
 * The motion contract (src/styles/replica.css) for the map and chart stylesheets: animations only
 * under [data-active], every referenced keyframe defined, everything in @layer components, and the
 * paused and reduced-motion guards repeated for maps and charts outside a replica canvas.
 */

interface Declaration {
  readonly property: string;
  readonly value: string;
  readonly important: boolean;
}

interface StyleRule {
  readonly selectors: readonly string[];
  readonly declarations: readonly Declaration[];
  readonly at: readonly string[];
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseCss(source: string): { readonly rules: readonly StyleRule[]; readonly keyframes: ReadonlyMap<string, string> } {
  const rules: StyleRule[] = [];
  const keyframes = new Map<string, string>();
  const walk = (body: string, at: readonly string[]): void => {
    let cursor = 0;
    while (cursor < body.length) {
      const open = body.indexOf('{', cursor);
      if (open === -1) return;
      let depth = 1;
      let close = open + 1;
      for (; close < body.length && depth > 0; close += 1) {
        if (body[close] === '{') depth += 1;
        else if (body[close] === '}') depth -= 1;
      }
      const prelude = body.slice(cursor, open).replace(/^[^{}]*;/, '').trim();
      const inner = body.slice(open + 1, close - 1);
      if (prelude.startsWith('@keyframes')) keyframes.set(prelude.split(/\s+/)[1] ?? '', inner);
      else if (prelude.startsWith('@')) walk(inner, [...at, prelude]);
      else {
        const declarations = splitTopLevel(inner, ';').map((text): Declaration => {
          const colon = text.indexOf(':');
          const raw = text.slice(colon + 1).trim();
          return { property: text.slice(0, colon).trim(), value: raw.replace(/\s*!important$/, ''), important: /!important$/.test(raw) };
        });
        rules.push({ selectors: splitTopLevel(prelude, ','), declarations, at });
      }
      cursor = close;
    }
  };
  walk(source.replace(/\/\*[\s\S]*?\*\//g, ''), []);
  return { rules, keyframes };
}

const read = (path: string): string => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const SHEETS = {
  map: { css: read('../../src/components/replicas/kit/map.css'), root: '.rx-map' },
  charts: { css: read('../../src/components/replicas/kit/charts.css'), root: '.rx-chart' },
} as const;

const animates = (declaration: Declaration): boolean =>
  (declaration.property === 'animation' || declaration.property === 'animation-name') && declaration.value !== 'none';

describe.each(Object.entries(SHEETS))('%s.css motion contract', (_, sheet) => {
  const { rules, keyframes } = parseCss(sheet.css);

  it('pins the layer order and keeps every rule in @layer components', () => {
    expect(sheet.css).toContain('@layer properties, theme, base, components, utilities;');
    expect(rules.length).toBeGreaterThan(5);
    expect(rules.every((rule) => rule.at[0] === '@layer components')).toBe(true);
  });

  it('declares animations only under a [data-active] ancestor', () => {
    const animated = rules.filter((rule) => rule.declarations.some(animates));
    expect(animated.length).toBeGreaterThan(0);
    expect(animated.flatMap((rule) => rule.selectors.filter((selector) => !selector.startsWith('[data-active] ')))).toEqual([]);
  });

  it('references only keyframes it defines, all named rx-…', () => {
    const used = new Set(
      rules.flatMap((rule) => rule.declarations.filter(animates)).flatMap((d) => [...d.value.matchAll(/(?<![-\w])rx-[a-z0-9-]+/g)].map((m) => m[0])),
    );
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((name) => !keyframes.has(name))).toEqual([]);
    expect([...keyframes.keys()].every((name) => name.startsWith('rx-'))).toBe(true);
  });

  it('repeats the paused and reduced-motion guards for its root', () => {
    const paused = rules.find((rule) => rule.selectors.includes(`[data-paused] ${sheet.root} *`));
    expect(paused?.declarations).toContainEqual({ property: 'animation-play-state', value: 'paused', important: true });
    const reduce = rules.find((rule) => rule.selectors.includes(`:root[data-motion="reduce"] ${sheet.root} *`));
    expect(reduce?.declarations).toContainEqual({ property: 'animation', value: 'none', important: true });
    const fallback = rules.find((rule) => rule.selectors.includes(`:root:not([data-motion]) ${sheet.root} *`));
    expect(fallback?.at).toEqual(['@layer components', '@media (prefers-reduced-motion: reduce)']);
    expect(fallback?.declarations).toContainEqual({ property: 'animation', value: 'none', important: true });
  });
});

describe('map.css glides', () => {
  const { rules, keyframes } = parseCss(SHEETS.map.css);
  const animationOf = (selector: string): string =>
    rules.find((rule) => rule.selectors.includes(selector))?.declarations.find((d) => d.property === 'animation')?.value ?? '';

  it('chains 1–6 glide segments: the first fills both ways, later ones forwards, in order', () => {
    for (let segments = 1; segments <= 6; segments += 1) {
      for (const target of ['.rx-map-puck', '.rx-map__world']) {
        const parts = splitTopLevel(animationOf(`[data-active] ${target}[data-glide="${segments}"]`), ',');
        expect(parts).toHaveLength(segments);
        parts.forEach((part, index) => {
          expect(part).toContain(`rx-map-glide-${index + 1} var(--rx-map-gd-${index + 1}) linear var(--rx-map-gt-${index + 1})`);
          expect(part.endsWith(index === 0 ? 'both' : 'forwards')).toBe(true);
        });
      }
      const trim = splitTopLevel(animationOf(`[data-active] .rx-map-route__trim[data-glide="${segments}"]`), ',');
      expect(trim).toHaveLength(segments);
      expect(trim.at(-1)).toContain(`rx-map-trim-${segments}`);
    }
  });

  it('runs each glide segment along the path from one stop to the next', () => {
    for (let segment = 1; segment <= 6; segment += 1) {
      const frames = keyframes.get(`rx-map-glide-${segment}`) ?? '';
      expect(frames).toContain('offset-path: var(--rx-map-path)');
      expect(frames).toContain('offset-rotate: var(--rx-map-rotate)');
      expect(frames).toContain(`offset-distance: calc(var(--rx-map-g-${segment - 1}) * 1%)`);
      expect(frames).toContain(`offset-distance: calc(var(--rx-map-g-${segment}) * 1%)`);
      expect(keyframes.get(`rx-map-trim-${segment}`)).toContain(`calc(var(--rx-map-g-${segment}) * -1px)`);
    }
  });

  it('recolours with up to 6 stops, each fading to its own colour', () => {
    for (let stops = 1; stops <= 6; stops += 1) {
      const parts = splitTopLevel(animationOf(`[data-active] .rx-map-route[data-recolor="${stops}"]`), ',');
      expect(parts).toHaveLength(stops);
      expect(keyframes.get(`rx-map-rc-${stops}`)).toContain(`color: var(--rx-map-rc-${stops})`);
    }
  });

  it('sizes the marker boxes as map-markers.tsx places them', () => {
    const value = (selector: string, property: string): string | undefined =>
      rules.find((rule) => rule.selectors.length === 1 && rule.selectors[0] === selector)?.declarations.find((d) => d.property === property)?.value;
    expect(value('.rx-map-pin', 'width')).toBe(`${MAP_PIN_BOX.width}px`);
    expect(value('.rx-map-pin', 'height')).toBe(`${MAP_PIN_BOX.height}px`);
    expect(value('.rx-map-pin', 'left')).toBe(`-${MAP_PIN_BOX.anchorX}px`);
    expect(value('.rx-map-pin', 'top')).toBe(`-${MAP_PIN_BOX.anchorY}px`);
    expect(value('.rx-map-pin', 'transform-origin')).toBe(`${MAP_PIN_BOX.anchorX}px ${MAP_PIN_BOX.anchorY}px`);
    expect(value('.rx-map-pin__anchor', 'left')).toBe(`${MAP_PIN_BOX.anchorX}px`);
    expect(value('.rx-map-puck', 'width')).toBe(`${MAP_PUCK_BOX}px`);
    expect(value('.rx-map-puck', 'transform-origin')).toBe(`${MAP_PUCK_BOX / 2}px ${MAP_PUCK_BOX / 2}px`);
  });
});
