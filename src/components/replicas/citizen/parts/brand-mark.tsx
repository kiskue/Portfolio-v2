import type { ReactNode } from 'react';
import { citizenBrands } from '@/content/apps/brands';
import { cssUrl } from '@/lib/brand-vars';

/**
 * The default Citizen brand's public store icon: the fallback when a phone sits outside any
 * BrandVars / BrandScope wrapper (brands.ts marks exactly one Citizen brand isDefault).
 */
const DEFAULT_BRAND = citizenBrands.find((brand) => brand.isDefault) ?? citizenBrands[0];
const DEFAULT_ICON = DEFAULT_BRAND ? cssUrl(DEFAULT_BRAND.icon) : 'none';

/**
 * The 30 × 30 brand logo at the right of every Citizen nav header. The shipped app paints its
 * per-brand header logo; the replica paints the brand's PUBLIC store icon instead (--app-logo,
 * set by BrandVars / BrandScope; never a repo logo or seal), as a background image because a
 * replica has no <img>. It is drawn as a small app-icon tile so every brand's icon reads at
 * this size: the icons' own padding differs, so citizen.css zooms them 130% and clips them to
 * radius 8 (no icon loses content at that zoom).
 */
export function BrandMark(): ReactNode {
  return <span className="rx-citizen-brandmark" style={{ backgroundImage: `var(--app-logo, ${DEFAULT_ICON})` }} />;
}
