import type { CSSProperties } from 'react';
import type { Brand } from '@/content/types';

/**
 * The bridge from a brand palette to CSS. BrandVars / BrandScope wrappers put these on an
 * element's style; tokens.css maps them to Tailwind (`bg-r-primary`, `text-r-accent`, …) and
 * replicas inherit them, so switching brands re-renders no replica tree.
 *
 * Every brand sets all six variables, so a nested scope fully overrides an outer one.
 * There is deliberately no --app-logo: no logo or seal files are copied from the repos.
 */
export const BRAND_VAR_NAMES = [
  '--app-primary',
  '--app-secondary',
  '--app-accent',
  '--app-lighttext',
  '--app-title-ink',
  '--app-name',
] as const;

export type BrandVarName = (typeof BRAND_VAR_NAMES)[number];
export type CSSVars = CSSProperties & Readonly<Record<`--${string}`, string>>;
export type BrandCssVars = CSSVars & { readonly [Name in BrandVarName]: string };

/** A CSS string literal for `content: var(--app-name)`, with quotes and backslashes escaped. */
export function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\A ')}"`;
}

export function brandVars(brand: Brand): BrandCssVars {
  const { primary, secondary, accent, titleInk, lightText } = brand.palette;
  return {
    '--app-primary': primary,
    '--app-secondary': secondary,
    '--app-accent': accent,
    '--app-lighttext': lightText ?? secondary,
    '--app-title-ink': titleInk,
    '--app-name': cssString(brand.name),
  };
}
