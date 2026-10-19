import type { InstallBand, StoreRating } from '@/content/types';
import { installBandValue } from '@/lib/format';

/**
 * Display thresholds for store facts (design §5.5): small numbers read as weakness, so an
 * install band shows only from 1K+ and a rating only from 5 ratings.
 */
export const MIN_INSTALLS = 1_000;
export const MIN_RATINGS = 5;

export function showInstalls(band: InstallBand | null | undefined): boolean {
  return band != null && installBandValue(band) >= MIN_INSTALLS;
}

export function showRating(rating: StoreRating | null | undefined): boolean {
  return rating != null && rating.count >= MIN_RATINGS;
}
