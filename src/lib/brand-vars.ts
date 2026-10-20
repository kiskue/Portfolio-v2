import type { CSSProperties } from 'react';
import type { AssetPath, Brand } from '@/content/types';

/**
 * The bridge from a brand palette to CSS. BrandVars / BrandScope wrappers put these on an
 * element's style; tokens.css maps them to Tailwind (`bg-r-primary`, `text-r-accent`, …) and
 * replicas inherit them, so switching brands re-renders no replica tree.
 *
 * Every brand sets the six colour and name variables, so a nested scope fully overrides an
 * outer one of the same app.
 *
 * --app-logo is set by Citizen brands only: `url("<CitizenBrand.icon>")`, the brand's PUBLIC
 * store icon (/store/citizen/<brand>/play-icon.webp, downloaded from its store listing by
 * scripts/prepare-assets.mjs). Citizen replica headers paint it as a background image, since a
 * replica may not use <img>. It is never a logo or seal file from the repos: none is copied
 * (PLAN.md, public-safe). Responder brands set no --app-logo (they have no public icon; their
 * replicas draw the monogram), so read it with a fallback: var(--app-logo, none), or the default
 * brand's icon. Scopes of different apps never nest, so a Citizen icon cannot leak into a
 * Responder phone.
 */
export const BRAND_VAR_NAMES = [
  '--app-primary',
  '--app-secondary',
  '--app-accent',
  '--app-lighttext',
  '--app-title-ink',
  '--app-name',
] as const;

/** Set by Citizen brands only (the public store icon); Responder brands leave it unset. */
export const BRAND_LOGO_VAR = '--app-logo';

export type BrandVarName = (typeof BRAND_VAR_NAMES)[number];
export type CSSVars = CSSProperties & Readonly<Record<`--${string}`, string>>;
export type BrandCssVars = CSSVars & { readonly [Name in BrandVarName]: string } & { readonly [BRAND_LOGO_VAR]?: string };

/** A CSS string literal for `content: var(--app-name)`, with quotes and backslashes escaped. */
export function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\A ')}"`;
}

/** A CSS url() for a public asset: cssUrl('/store/citizen/1hope/play-icon.webp') → url("/store/…"). */
export function cssUrl(path: AssetPath): string {
  return `url(${cssString(path)})`;
}

/**
 * The --app-* variables for one brand, for a BrandVars / BrandScope wrapper's inline style.
 * Every brand gets the six colour and name variables (BRAND_VAR_NAMES). Citizen brands also get
 * '--app-logo': url("<CitizenBrand.icon>"), their PUBLIC store icon path
 * (/store/citizen/<brand>/play-icon.webp), never a repo logo or seal file. Responder brands get
 * no --app-logo (they use monograms), so replicas read it as var(--app-logo, none).
 */
export function brandVars(brand: Brand): BrandCssVars {
  const { primary, secondary, accent, titleInk, lightText } = brand.palette;
  const vars = {
    '--app-primary': primary,
    '--app-secondary': secondary,
    '--app-accent': accent,
    '--app-lighttext': lightText ?? secondary,
    '--app-title-ink': titleInk,
    '--app-name': cssString(brand.name),
  };
  return brand.app === 'citizen' ? { ...vars, [BRAND_LOGO_VAR]: cssUrl(brand.icon) } : vars;
}
