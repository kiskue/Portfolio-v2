import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PHONE_SCALE, PHONE_SIZES } from '@/components/showcase/phone-frame';

/*
 * The motion contract and the phone sizes live in src/styles/replica.css. These tests read the
 * stylesheet itself, so a rule that breaks the contract fails here before any browser run.
 */

interface Declaration {
  readonly property: string;
  readonly value: string;
  readonly important: boolean;
}

interface StyleRule {
  readonly selectors: readonly string[];
  readonly declarations: readonly Declaration[];
  /** Enclosing at-rule preludes, outermost first (e.g. "@layer components"). */
  readonly at: readonly string[];
}

/** Splits on `separator` outside parentheses and brackets. */
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

function parseCss(source: string): { readonly rules: readonly StyleRule[]; readonly keyframes: ReadonlySet<string> } {
  const rules: StyleRule[] = [];
  const keyframes = new Set<string>();
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
      const prelude = body.slice(cursor, open).trim();
      const inner = body.slice(open + 1, close - 1);
      if (prelude.startsWith('@keyframes')) keyframes.add(prelude.split(/\s+/)[1] ?? '');
      else if (prelude.startsWith('@')) walk(inner, [...at, prelude]);
      else {
        const declarations = splitTopLevel(inner, ';').map((text): Declaration => {
          const colon = text.indexOf(':');
          const raw = text.slice(colon + 1).trim();
          return {
            property: text.slice(0, colon).trim(),
            value: raw.replace(/\s*!important$/, ''),
            important: /!important$/.test(raw),
          };
        });
        rules.push({ selectors: splitTopLevel(prelude, ','), declarations, at });
      }
      cursor = close;
    }
  };
  walk(source.replace(/\/\*[\s\S]*?\*\//g, ''), []);
  return { rules, keyframes };
}

const css = readFileSync(fileURLToPath(new URL('../../src/styles/replica.css', import.meta.url)), 'utf8');
const { rules, keyframes } = parseCss(css);

const animates = (declaration: Declaration): boolean =>
  (declaration.property === 'animation' || declaration.property === 'animation-name') && declaration.value !== 'none';

describe('replica.css motion contract', () => {
  it('parses the stylesheet (sanity)', () => {
    expect(rules.length).toBeGreaterThan(100);
    expect(rules.every((rule) => rule.at[0] === '@layer components')).toBe(true);
  });

  it('declares animations only under a [data-active] ancestor (rule 1)', () => {
    const animated = rules.filter((rule) => rule.declarations.some(animates));
    expect(animated.length).toBeGreaterThan(5);
    const outside = animated.flatMap((rule) => rule.selectors.filter((selector) => !selector.startsWith('[data-active] ')));
    expect(outside).toEqual([]);
  });

  it('references only keyframes it defines', () => {
    const used = new Set(
      rules
        .flatMap((rule) => rule.declarations.filter(animates))
        .flatMap((declaration) => [...declaration.value.matchAll(/(?<![-\w])rx-[a-z-]+/g)].map((match) => match[0])),
    );
    expect([...used].filter((name) => !keyframes.has(name))).toEqual([]);
  });

  it('freezes everything inside a replica under [data-paused] (rule 3)', () => {
    const guard = rules.find((rule) => rule.selectors.includes('[data-paused] .rx-canvas *'));
    expect(guard?.selectors).toEqual(
      expect.arrayContaining(['[data-paused] .rx-canvas', '[data-paused] .rx-canvas *::before', '[data-paused] .rx-canvas *::after']),
    );
    expect(guard?.declarations).toContainEqual({ property: 'animation-play-state', value: 'paused', important: true });
  });

  it('stops every replica animation under reduced motion, with the media-query fallback (rule 4)', () => {
    const setting = rules.find((rule) => rule.selectors.includes(':root[data-motion="reduce"] .rx-canvas *'));
    expect(setting?.at).toEqual(['@layer components']);
    expect(setting?.declarations).toContainEqual({ property: 'animation', value: 'none', important: true });

    const fallback = rules.find((rule) => rule.selectors.includes(':root:not([data-motion]) .rx-canvas *'));
    expect(fallback?.at).toEqual(['@layer components', '@media (prefers-reduced-motion: reduce)']);
    expect(fallback?.declarations).toContainEqual({ property: 'animation', value: 'none', important: true });
  });

  it('shows the poster frame by default (static styles, no animation needed)', () => {
    const hidden = rules.find((rule) => rule.selectors.includes('.rx-seq > .rx-seq__frame'));
    const poster = rules.find((rule) => rule.selectors.includes('.rx-seq > .rx-seq__frame[data-poster]'));
    expect(hidden?.declarations).toContainEqual({ property: 'opacity', value: '0', important: false });
    expect(poster?.declarations).toContainEqual({ property: 'opacity', value: '1', important: false });
  });
});

describe('replica.css phone sizes', () => {
  it('sets --ps for exactly the six PhoneFrame sizes, matching PHONE_SCALE', () => {
    const sizes = Object.fromEntries(
      rules.flatMap((rule) => {
        const match = rule.selectors[0]?.match(/^:where\(\.phone, \.screen-card\)\[data-size="([^"]+)"\]$/);
        const ps = rule.declarations.find((declaration) => declaration.property === '--ps');
        return match && ps ? [[match[1], Number(ps.value)]] : [];
      }),
    );
    expect(sizes).toEqual(Object.fromEntries(PHONE_SIZES.map((size) => [size, PHONE_SCALE[size]])));
  });

  it('sizes the outer box as 414×868 × --ps from CSS alone', () => {
    const phone = rules.find((rule) => rule.selectors.length === 1 && rule.selectors[0] === '.phone');
    const value = (property: string): string | undefined =>
      phone?.declarations.find((declaration) => declaration.property === property)?.value;
    expect(value('width')).toBe('calc(414px * var(--phone-ps))');
    expect(value('height')).toBe('calc(868px * var(--phone-ps))');
    expect(value('padding')).toBe('calc(12px * var(--phone-ps))');
    expect(value('--phone-ps')).toBe('var(--ps, 0.5024)');
  });
});
