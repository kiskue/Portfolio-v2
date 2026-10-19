// STUB — owned by W12, replaced in wave 1
import type { CitizenBrandId, StoreListing, StoreListingId } from '@/content/types';
import listings from './store-listings.json';

/*
 * Contract the real module keeps: `storeListings` (zod-validated, joined with the generated
 * asset manifest), `listingById` and `listingsForBrand`. src/content/derived.ts builds every
 * store count from these, so the stub's empty array yields zero counts.
 */

export const storeListings: readonly StoreListing[] = listings;

export function listingById(id: StoreListingId): StoreListing | undefined {
  return storeListings.find((listing) => listing.id === id);
}

export function listingsForBrand(brand: CitizenBrandId): readonly StoreListing[] {
  return storeListings.filter((listing) => listing.brand === brand);
}
