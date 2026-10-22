import 'server-only';
import type { BrandOption, BrandScopeProps } from '@/components/showcase/brand-scope';
import { STORE_NAME } from '@/components/ui/store-link';
import { listingsForBrand } from '@/content/apps/store';
import { brandsFor, defaultBrand, screenshotsByBrand } from '@/content/derived';
import type { CitizenBrand, ResponderBrand, Segments, StoreListing, StorePlatform } from '@/content/types';
import { brandVars } from '@/lib/brand-vars';
import { ph } from '@/lib/placeholder';

/*
 * Server-side data for BrandScope (design §5.5): one serialisable option per public brand, with
 * its --app-* variables, its mark, its kept store screenshot count (for SourceToggle, from
 * screenshotsByBrand in src/content/derived.ts: counts are never computed here) and an honest
 * status line. Server-only: it reads the store data.
 */

/** A store as it reads after "on": "Google Play", "the App Store". */
export function storeAfterOn(platform: StorePlatform): string {
  return platform === 'appstore' ? `the ${STORE_NAME.appstore}` : STORE_NAME.play;
}

/** "On Google Play and the App Store", from the brand's listings (never hard-coded). */
function storePresence(listings: readonly StoreListing[]): Segments {
  const stores = [...new Set(listings.map((listing) => storeAfterOn(listing.platform)))];
  if (stores.length === 0) return [];
  return [`On ${stores.join(' and ')}`];
}

/**
 * Responder builds are privately distributed. Deployment is stated only where it is confirmed:
 * a build with an open confirm note shows a placeholder (hidden once the site goes public).
 */
function responderStatus(brand: ResponderBrand): Segments {
  switch (brand.status) {
    case 'platform':
      return ['Private distribution', 'platform build'];
    case 'in-setup':
      return ['Private distribution', brand.tag ?? 'In setup'];
    case 'deployed':
      return ['Private distribution', 'LGU build', ...(brand.confirm ? [ph('deployment to confirm')] : ['deployed'])];
  }
}

function citizenOption(brand: CitizenBrand): BrandOption {
  const listings = listingsForBrand(brand.id);
  return {
    id: brand.id,
    name: brand.name,
    vars: brandVars(brand),
    icon: brand.icon,
    screenshots: screenshotsByBrand[brand.id],
    status: storePresence(listings),
  };
}

function responderOption(brand: ResponderBrand): BrandOption {
  return {
    id: brand.id,
    name: brand.name,
    vars: brandVars(brand),
    icon: null,
    monogram: brand.monogram,
    screenshots: 0,
    status: responderStatus(brand),
  };
}

/** The switcher options for one white-label app, in brands.ts order. */
export function brandOptions(app: 'citizen' | 'responder'): readonly BrandOption[] {
  return app === 'citizen' ? brandsFor('citizen').map(citizenOption) : brandsFor('responder').map(responderOption);
}

/** Everything a BrandScope needs but its children: `<BrandScope {...brandScopeProps('citizen')}>`. */
export function brandScopeProps(app: 'citizen' | 'responder'): Omit<BrandScopeProps, 'children'> {
  return { app, defaultBrand: defaultBrand(app).id, options: brandOptions(app) };
}
