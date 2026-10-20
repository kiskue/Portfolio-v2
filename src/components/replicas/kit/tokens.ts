import type { CSSProperties } from 'react';
import type { RColor, RPad } from './types';

/** The logical canvas (px): status bar on top, home-indicator area at the bottom. */
export const R_CANVAS = { width: 390, height: 844, statusBar: 44, homeIndicator: 34 } as const;

/**
 * Brand colours for kit props. They follow BrandVars / BrandScope through the --app-* bridge,
 * with each app's default brand as the fallback (replica.css). On SME canvases they are the
 * fixed SME navy and green.
 */
export const rBrand = {
  primary: 'var(--rx-primary)',
  secondary: 'var(--rx-secondary)',
  accent: 'var(--rx-accent)',
  lightText: 'var(--rx-lighttext)',
  titleInk: 'var(--rx-title-ink)',
} as const;

/** The base tokens RCanvas sets per app and theme (replica.css). */
export const rToken = {
  canvas: 'var(--rx-canvas)',
  surface: 'var(--rx-surface)',
  surface2: 'var(--rx-surface-2)',
  raised: 'var(--rx-raised)',
  ink: 'var(--rx-ink)',
  ink2: 'var(--rx-ink-2)',
  ink3: 'var(--rx-ink-3)',
  muted: 'var(--rx-muted)',
  border: 'var(--rx-border)',
  borderFaint: 'var(--rx-border-faint)',
  field: 'var(--rx-field)',
  fieldBorder: 'var(--rx-field-border)',
  placeholder: 'var(--rx-placeholder)',
  success: 'var(--rx-success)',
  warning: 'var(--rx-warning)',
  danger: 'var(--rx-danger)',
  errorInk: 'var(--rx-error-ink)',
} as const;

/** Logical px as a CSS length. */
export function px(value: number): string {
  return `${value}px`;
}

/** Milliseconds as a CSS time. */
export function ms(value: number): string {
  return `${Math.round(value)}ms`;
}

/** A colour at `percent` opacity (the apps' 6–20% tints), e.g. rTint('#22c55e', 10). */
export function rTint(color: RColor, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/** CSS padding from an RPad. */
export function padding(pad: RPad | undefined): string | undefined {
  if (pad === undefined) return undefined;
  if (typeof pad === 'number') return px(pad);
  return pad.map(px).join(' ');
}

/** Custom properties for a kit element. Undefined entries are dropped. */
export type RVars = Readonly<Record<`--${string}`, string | undefined>>;

/**
 * An inline style from custom properties plus ordinary declarations. Undefined entries are
 * dropped, and the result is undefined when nothing is left (so no empty style attribute).
 */
export function rStyle(vars: RVars, style?: CSSProperties): CSSProperties | undefined {
  const merged: CSSProperties = {};
  let count = 0;
  for (const [name, value] of Object.entries({ ...style, ...vars })) {
    if (value === undefined || value === null) continue;
    Object.assign(merged, { [name]: value });
    count += 1;
  }
  return count > 0 ? merged : undefined;
}

/**
 * The state a replica should draw: `state` when it is one of `states`, else the default
 * (states[0]). Pass the figure's states as a tuple typed with FigureState<'2.3'>.
 */
export function pickState<const S extends string>(states: readonly [S, ...S[]], state: string | undefined): S {
  const known: readonly string[] = states;
  return state !== undefined && known.includes(state) ? (state as S) : states[0];
}
