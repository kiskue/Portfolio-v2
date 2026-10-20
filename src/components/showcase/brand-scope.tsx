// STUB — owned by W7, replaced in wave 2a
'use client';

import { createContext, use, type ReactNode } from 'react';
import type { AssetPath, BrandId } from '@/content/types';
import type { BrandCssVars } from '@/lib/brand-vars';

/*
 * Brand switching for a section of phones (design §5.5): BrandScope puts the selected brand's
 * --app-* variables on one wrapper (so no replica re-renders), BrandSwitcher is the native-radio
 * chip group, and useBrand reads the selection. Phones inside use ScreenView brandMode="inherit".
 * The real version syncs ?brand= with history.replaceState; the stub fixes the default brand.
 */

/** A switcher choice. Everything is serialisable: the server computes `vars` with brandVars(). */
export interface BrandOption {
  readonly id: BrandId;
  /** Exactly as published, e.g. "1Hope". */
  readonly name: string;
  readonly vars: BrandCssVars;
  /** The public store icon (Citizen), or null when the brand shows a monogram (Responder). */
  readonly icon: AssetPath | null;
  readonly monogram?: string;
}

export interface BrandScopeProps {
  readonly app: 'citizen' | 'responder';
  readonly defaultBrand: BrandId;
  readonly options: readonly BrandOption[];
  /** The search param that keeps the selection (default 'brand'). */
  readonly param?: 'brand';
  readonly children: ReactNode;
}

export interface BrandState {
  readonly app: 'citizen' | 'responder';
  readonly brand: BrandId;
  readonly options: readonly BrandOption[];
  readonly setBrand: (brand: BrandId) => void;
}

const BrandContext = createContext<BrandState | null>(null);

function keepBrand(): void {
  // The stub never switches brands.
}

export function BrandScope({ app, defaultBrand, options, children }: BrandScopeProps): ReactNode {
  const selected = options.find((option) => option.id === defaultBrand) ?? options[0];
  const brand = selected?.id ?? defaultBrand;
  return (
    <BrandContext value={{ app, brand, options, setBrand: keepBrand }}>
      <div data-brand-scope={app} data-brand={brand} style={selected?.vars}>
        {children}
      </div>
    </BrandContext>
  );
}

/** The selected brand of the nearest BrandScope. */
export function useBrand(): BrandState {
  const state = use(BrandContext);
  if (state === null) throw new Error('useBrand must be used inside a BrandScope');
  return state;
}

export interface BrandSwitcherProps {
  /** Group label (default "App brand"). */
  readonly label?: string;
}

/** The brand chips. Stub: names the selected brand as plain text. */
export function BrandSwitcher({ label = 'App brand' }: BrandSwitcherProps): ReactNode {
  const { brand, options } = useBrand();
  const name = options.find((option) => option.id === brand)?.name ?? brand;
  return (
    <p className="text-meta text-ink-3">
      {label}: {name}
    </p>
  );
}
