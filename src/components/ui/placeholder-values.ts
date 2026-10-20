import type { Field, Placeholder, PlaceholderMode } from '@/content/types';
import { orPlaceholder, ph } from '@/lib/placeholder';

/*
 * The two nullable facts that still show as placeholders in label mode (review amendment 3):
 * years of experience and the CV. Everything else that is null renders nothing.
 */

/** Shown for unknown years in label mode: "[[N]]+ years". */
export const YEARS_TOKEN: Placeholder = ph('N');

/** The years count as a field: the number when set, "[[N]]" in label mode, null in hide mode. */
export function yearsValue(years: number | null, mode: PlaceholderMode): Field | null {
  return orPlaceholder(years === null ? null : String(years), YEARS_TOKEN, mode);
}

/** What a CV control renders: a real link, a placeholder chip (label mode), or nothing. */
export type CvState =
  | { readonly kind: 'link'; readonly href: string; readonly download: boolean }
  | { readonly kind: 'placeholder' }
  | { readonly kind: 'none' };

/** Same-origin files ("/cv.pdf") download; any other URL opens in a new tab. */
export function cvState(cvUrl: string | null, mode: PlaceholderMode): CvState {
  const href = cvUrl?.trim();
  if (href) return { kind: 'link', href, download: href.startsWith('/') && !href.startsWith('//') };
  return mode === 'label' ? { kind: 'placeholder' } : { kind: 'none' };
}
