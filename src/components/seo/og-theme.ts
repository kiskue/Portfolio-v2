/**
 * Colours for the Open Graph cards. next/og draws with Satori, which has no CSS variables, so the
 * light theme's values are read out of the design tokens (src/styles/tokens.css) at build time
 * instead of being copied here: a token change reaches the cards on the next build.
 */

/** The cards' face: the site's UI and display font (loaded by og-assets.ts). */
export const OG_FONT_FAMILY = 'Plus Jakarta Sans';

/** The custom properties declared in the first `:root { … }` block (the light theme), without "--". */
export function parseRootTokens(css: string): Readonly<Record<string, string>> {
  const start = css.search(/:root\s*\{/);
  if (start === -1) throw new Error('tokens.css: no :root { … } block');
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  if (close === -1) throw new Error('tokens.css: the :root block is not closed');
  const block = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

export interface OgTheme {
  readonly bg: string;
  readonly surface: string;
  readonly line: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  readonly accentInk: string;
  readonly onInk: string;
  /** The periwinkle glow and the avatar's peach glow, as rgba() at the theme's strength. */
  readonly glow: string;
  readonly peach: string;
  /** The same hues at zero alpha, where a gradient fades out. */
  readonly glowFade: string;
  readonly peachFade: string;
}

/** The card palette from parsed tokens; a missing or malformed token fails the build. */
export function ogTheme(tokens: Readonly<Record<string, string>>): OgTheme {
  const hex = (name: string): string => {
    const value = tokens[`c-${name}`];
    if (!value || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      throw new Error(`tokens.css: --c-${name} is not a hex colour (${JSON.stringify(value)})`);
    }
    return value;
  };
  const rgba = (name: string, fade = false): string => {
    const triplet = tokens[name];
    const alpha = tokens[`${name}-alpha`];
    if (!triplet || !/^\d{1,3} \d{1,3} \d{1,3}$/.test(triplet) || !alpha || !/^(?:0|1)?(?:\.\d+)?$/.test(alpha)) {
      throw new Error(`tokens.css: --${name} / --${name}-alpha are not an RGB triplet and an alpha`);
    }
    return `rgba(${triplet.split(' ').join(', ')}, ${fade ? 0 : alpha})`;
  };
  return {
    bg: hex('bg'),
    surface: hex('surface'),
    line: hex('line'),
    ink: hex('ink'),
    ink2: hex('ink-2'),
    ink3: hex('ink-3'),
    accentInk: hex('accent-ink'),
    // White glyphs on the ink tile, like the site's monogram icon.
    onInk: hex('raised'),
    glow: rgba('glow'),
    peach: rgba('peach'),
    glowFade: rgba('glow', true),
    peachFade: rgba('peach', true),
  };
}
