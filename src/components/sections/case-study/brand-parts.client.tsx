'use client';

import type { ReactNode } from 'react';
import { useBrand, useOptionalBrand } from '@/components/showcase/brand-scope';
import { buttonVariants } from '@/components/ui/button';
import type { BrandId } from '@/content/types';
import type { BrandCssVars } from '@/lib/brand-vars';

/*
 * Small client parts that follow the case study's BrandScope (design §5.5). Like BrandScope, they
 * never re-render a replica: they flip `hidden`, swap CSS variables on a wrapper, or set the
 * shared brand. Everything they show is server-rendered and passed in as children or props.
 */

export interface BrandSlotProps {
  readonly brand: BrandId;
  /** Shown outside a BrandScope (and so in the server HTML when it is the scope's default). */
  readonly isDefault: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Content for one brand (its store row), shown while that brand is selected. */
export function BrandSlot({ brand, isDefault, children, className }: BrandSlotProps): ReactNode {
  const scope = useOptionalBrand();
  const shown = scope ? scope.brand === brand : isDefault;
  return (
    <div className={className} hidden={!shown} data-brand-slot={brand}>
      {children}
    </div>
  );
}

export interface BrandPreviewButtonProps {
  readonly brand: BrandId;
  /** The brand's published name, completing the accessible name ("Preview 1Hope"). */
  readonly name: string;
}

/** The #brands table's "Preview" button: it selects the brand for every phone in the scope. */
export function BrandPreviewButton({ brand, name }: BrandPreviewButtonProps): ReactNode {
  const { brand: selected, setBrand } = useBrand();
  const pressed = selected === brand;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => setBrand(brand)}
      className={buttonVariants({ variant: pressed ? 'primary' : 'secondary', size: 'sm' })}
      data-brand-preview={brand}
    >
      Preview<span className="sr-only"> {name}</span>
    </button>
  );
}

export interface FlankBrandProps {
  /** The flank's own brand variables (as the content names it). */
  readonly vars: BrandCssVars;
  /** Used instead while the selected brand shares the flank's colours. */
  readonly fallback: BrandCssVars;
  /** Brands whose palette matches the flank's own: selecting one of them switches to the fallback. */
  readonly collidesWith: readonly BrandId[];
  readonly children: ReactNode;
}

/**
 * A hero flank phone's colours. A flank shows the same screen in another brand family (design §6:
 * blue, pink and amber side by side); when the selected brand would make the flank a twin of the
 * main phone, the flank takes the fallback brand's colours instead.
 */
export function FlankBrand({ vars, fallback, collidesWith, children }: FlankBrandProps): ReactNode {
  const scope = useOptionalBrand();
  const twin = scope !== null && collidesWith.includes(scope.brand);
  return (
    <div className="contents" style={twin ? fallback : vars} data-flank-brand={twin ? 'fallback' : 'own'}>
      {children}
    </div>
  );
}
