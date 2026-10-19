import type { ISODate, InstallBand } from '@/content/types';

/**
 * Display formatting. Deterministic on purpose: no current time, no runtime locale or time zone,
 * so server and client output always match.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateParts {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  readonly day: number;
}

/** Parses "YYYY-MM-DD", rejecting impossible dates such as 2026-02-30. */
export function parseISODate(value: string): DateParts | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function isISODate(value: string): value is ISODate {
  return parseISODate(value) !== null;
}

/** "2026-10-19" → "Oct 19, 2026". */
export function formatDate(iso: ISODate): string {
  const parts = parseISODate(iso);
  if (!parts) throw new Error(`formatDate(): not a valid ISO date: ${iso}`);
  return `${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

const numberFormats = new Map<number, Intl.NumberFormat>();

/** en-US grouping: 1240 → "1,240"; fractions are rounded to `maximumFractionDigits`. */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  let format = numberFormats.get(maximumFractionDigits);
  if (!format) {
    format = new Intl.NumberFormat('en-US', { maximumFractionDigits });
    numberFormats.set(maximumFractionDigits, format);
  }
  return format.format(value);
}

const INSTALL_BAND = /^(\d+(?:\.\d+)?)([KM]?)\+$/;
const BAND_MULTIPLIER = { '': 1, K: 1_000, M: 1_000_000 } as const;

/** The lower bound of a Google Play install band: "5K+" → 5000. */
export function installBandValue(band: InstallBand): number {
  const match = INSTALL_BAND.exec(band);
  if (!match) throw new Error(`installBandValue(): not an install band: ${band}`);
  const unit = (match[2] ?? '') as keyof typeof BAND_MULTIPLIER;
  return Number(match[1]) * BAND_MULTIPLIER[unit];
}

/** "5K+" → "5K+ installs", as the store writes it. */
export function formatInstalls(band: InstallBand): string {
  return `${band} installs`;
}

/** A store rating to one decimal: 4.2222 → "4.2", 5 → "5.0". */
export function formatRatingValue(value: number): string {
  return value.toFixed(1);
}

/** 27 → "27 ratings", 1 → "1 rating". */
export function formatRatingCount(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'rating' : 'ratings'}`;
}
