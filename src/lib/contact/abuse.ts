import { MIN_FILL_MS } from '@/lib/contact/fields';

/*
 * Abuse controls for the contact form (PLAN → Contact: honeypot, minimum fill time, length
 * caps; the caps live in the schema). Pure, so they are unit-tested without a server.
 *
 * - Honeypot: a text field that people never see or reach. Anything in it means a bot filled
 *   every field it found.
 * - Minimum fill time: the form island writes how long the page had been open when the form was
 *   sent (performance.now(), so clock skew cannot matter). The page is static, so nothing on the
 *   server knows when it was loaded; without JavaScript the field stays empty and is not checked.
 */

export type AbuseVerdict =
  /** Nothing suspicious. */
  | 'ok'
  /** The honeypot has a value. */
  | 'honeypot'
  /** The timing field holds something the island never writes. */
  | 'malformed-timing'
  /** Sent sooner than the minimum fill time: probably automated, but a person can simply resend. */
  | 'too-fast';

export interface AbuseInput {
  readonly honeypot: string;
  readonly fillMs: string;
}

export function checkAbuse(input: AbuseInput, minFillMs: number = MIN_FILL_MS): AbuseVerdict {
  if (input.honeypot.trim() !== '') return 'honeypot';
  const fill = input.fillMs.trim();
  if (fill === '') return 'ok';
  if (!/^\d+$/.test(fill) || !Number.isSafeInteger(Number(fill))) return 'malformed-timing';
  return Number(fill) < minFillMs ? 'too-fast' : 'ok';
}
