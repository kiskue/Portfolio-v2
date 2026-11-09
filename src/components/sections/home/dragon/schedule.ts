/*
 * When the dragon flies (design §3.3): once per browser session, about 1.2 s after Home first
 * paints, and again 1.6 s after every theme switch. Pure rules; scene.ts owns the clock and timers.
 * Times are on the performance.now() clock.
 */

/** sessionStorage key: '1' once the session's opening flight has started. */
export const FLOWN_KEY = 'gm.dragon';
/** The opening flight starts this long after first contentful paint. */
export const OPENING_DELAY_MS = 1200;
/** A theme switch sends the dragon out this long after the switch. */
export const SWITCH_DELAY_MS = 1600;
/** No opening flight when the dragon is ready more than this long after first paint. */
export const OPENING_GIVE_UP_MS = 8000;

/** Whether the opening flight is still due. Without storage (missing or throwing) it always is. */
export function openingFlightDue(storage: { getItem(key: string): string | null } | null): boolean {
  try {
    return storage?.getItem(FLOWN_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Remembers the opening flight for this session. Without storage it is simply not remembered. */
export function markFlown(storage: { setItem(key: string, value: string): void } | null): void {
  try {
    storage?.setItem(FLOWN_KEY, '1');
  } catch {
    // Blocked or full storage: a reload may replay the opening flight.
  }
}

/** When the opening flight starts: 1.2 s after first paint, or once ready; null when ready too late. */
export function openingStartAt(paintedAt: number, readyAt: number): number | null {
  if (readyAt > paintedAt + OPENING_GIVE_UP_MS) return null;
  return Math.max(paintedAt + OPENING_DELAY_MS, readyAt);
}

export type FlightPlan = { readonly kind: 'idle' } | { readonly kind: 'scheduled'; readonly at: number } | { readonly kind: 'flying' };

/** A theme switch: a flight in progress carries on; otherwise one is scheduled 1.6 s from now. */
export function onThemeSwitch(plan: FlightPlan, now: number): FlightPlan {
  if (plan.kind === 'flying') return plan;
  return { kind: 'scheduled', at: now + SWITCH_DELAY_MS };
}
