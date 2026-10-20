import type { CSSProperties, ReactNode } from 'react';
import { brandById } from '@/content/derived';
import type { BrandId } from '@/content/types';
import { brandVars } from '@/lib/brand-vars';

export interface BrandVarsProps {
  readonly brand: BrandId;
  readonly children: ReactNode;
}

/**
 * Server wrapper that puts one brand's --app-* variables (src/lib/brand-vars.ts) on a
 * display:contents element, so every replica inside inherits them without a layout box.
 */
export function BrandVars({ brand, children }: BrandVarsProps): ReactNode {
  const style: CSSProperties = { display: 'contents', ...brandVars(brandById(brand)) };
  return (
    <div data-brand={brand} style={style}>
      {children}
    </div>
  );
}
