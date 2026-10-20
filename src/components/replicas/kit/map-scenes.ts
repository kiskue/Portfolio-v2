// STUB — owned by W6, replaced in wave 2a

/*
 * The shared map is ONE fictional-town SVG drawn in the 390×844 canvas coordinate space
 * (architecture D4). Replicas refer to its routes by key and place pins and the puck in the
 * same coordinates. W6 draws the town and the routes and may add keys, but never renames one.
 */

/** Named routes on the town map: the SME delivery leg (1.5) and the responder drive (3.3). */
export const MAP_ROUTE_KEYS = ['delivery', 'en-route'] as const;
export type MapRouteKey = (typeof MAP_ROUTE_KEYS)[number];

export type MapPinKind = 'you' | 'hazard' | 'incident' | 'peer' | 'store' | 'home' | 'rider';

export interface MapPin {
  /** Town coordinates (logical px of the 390×844 canvas). */
  readonly x: number;
  readonly y: number;
  readonly kind: MapPinKind;
  /** Pin colour; each kind has a default. */
  readonly color?: string;
  /** A short label drawn beside the pin, e.g. "Your Location". */
  readonly label?: string;
}
