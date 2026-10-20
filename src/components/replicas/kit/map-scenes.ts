import type { LucideIcon } from 'lucide-react';
import { fractionNearest, type MapPoint, type MapPose, poseAt, pt, roundCorners } from './map-geometry';
import type { RColor } from './types';

export type { MapPoint, MapPose, MapRect } from './map-geometry';
export { TOWN_EXTENT } from './map-town';

/*
 * The shared map is ONE fictional-town SVG drawn in town coordinates (architecture D4): logical
 * px with y down, where the window 0..390 × 0..844 is the 390×844 canvas. A full-height map
 * with no view shows exactly that window, so town coordinates are canvas px there. Replicas
 * refer to routes by key and place pins and the puck in the same coordinates. The town itself
 * is in map-town.ts; this module holds the routes, the per-figure scenes and the data types.
 * Route keys are never renamed (replicas use them); new keys may be added.
 */

/** Named routes on the town map: the SME delivery leg (1.5) and the responder drive (3.3). */
export const MAP_ROUTE_KEYS = ['delivery', 'en-route'] as const;
export type MapRouteKey = (typeof MAP_ROUTE_KEYS)[number];

export type MapPinKind = 'you' | 'hazard' | 'incident' | 'peer' | 'store' | 'home' | 'rider';

/**
 * How a pin is drawn: a teardrop map pin, the blue "you are here" dot, or a round badge (the
 * SME rider). Each kind has a default look (MAP_PIN_DEFAULTS in map-markers.tsx).
 */
export type MapPinLook = 'pin' | 'dot' | 'badge';

/** Where a pin's label sits relative to its head. */
export type MapLabelSide = 'right' | 'left' | 'top' | 'bottom';

export interface MapPin {
  /** Town coordinates (logical px of the 390×844 canvas). */
  readonly x: number;
  readonly y: number;
  readonly kind: MapPinKind;
  /** Pin colour; each kind has a default. */
  readonly color?: string;
  /** A short label drawn beside the pin, e.g. "Your Location". */
  readonly label?: string;
  /** Overrides the kind's look, e.g. a red 'pin' for Citizen's "Your Location". */
  readonly look?: MapPinLook;
  /** Label placement (default: right, or left for pins in the right part of the view). */
  readonly labelSide?: MapLabelSide;
  /** Overrides the kind's glyph inside a pin or badge. */
  readonly icon?: LucideIcon;
  /** Pulse rings while active (the 'dot' look pulses by default). */
  readonly pulse?: boolean;
}

/**
 * The window of the town a map shows: town point (cx, cy) sits at the centre of the map box,
 * drawn at `zoom` (default 1: one town px per canvas px). Pins and the puck keep their size.
 */
export interface MapView {
  readonly cx: number;
  readonly cy: number;
  readonly zoom?: number;
}

/**
 * The follow camera (3.3): the puck stays pinned at this point of the box, as fractions of its
 * width and height (default 0.5 and 2/3, the lower third), and the town slides under it.
 */
export interface MapFollow {
  readonly x?: number;
  readonly y?: number;
}

/** A moment of a glide: at `atMs` after activation, the puck is at `at` (0–1) of its route. */
export interface RMapGlideStop {
  readonly atMs: number;
  readonly at: number;
}

/**
 * The puck moving along its route while active (offset-path), piecewise linear between stops
 * (2 to 7 stops, ascending atMs). Before the first stop it waits at the first stop's position;
 * after the last it stays at the last one. Not active, or with reduced motion, it shows its
 * static x, y and heading (the poster).
 */
export interface RMapGlide {
  readonly stops: readonly RMapGlideStop[];
}

export interface RMapRoute {
  readonly path: MapRouteKey;
  readonly color: RColor;
  /** A wider stroke under the route (e.g. the SME sky route's #0369A1 casing). */
  readonly casing?: RColor;
  /** Stroke width in px. */
  readonly width: number;
  readonly dashed?: true;
  /** Recolour the route while active (the responder FAR → NEAR → ON SITE zones). Up to 6 stops. */
  readonly recolorAt?: readonly { readonly atMs: number; readonly color: RColor }[];
  /** Casing width in px (default width + 3: 1.5 px each side, as in the SME route style). */
  readonly casingWidth?: number;
  /**
   * Hide the part already travelled: the route starts at the puck (its poster position, and its
   * glide while active). Solid routes only.
   */
  readonly trim?: true;
}

export interface RMapPuck {
  readonly x: number;
  readonly y: number;
  /** Heading in degrees, 0 = north. */
  readonly heading: number;
  readonly color: RColor;
  readonly glyph: 'van' | 'arrow' | 'moto';
  /**
   * 'plate' is the Responder puck (a disc with a nose arrow, white ring and accuracy halo);
   * 'badge' is the SME rider marker (a round badge whose glyph turns with the heading).
   * Default: 'badge' for moto, 'plate' otherwise.
   */
  readonly look?: 'plate' | 'badge';
  /** Glide along the map's route while active (needs `route` on the map). */
  readonly glide?: RMapGlide;
  /** The soft accuracy halo (default true for the plate). */
  readonly halo?: boolean;
  /** Diameter in px (default 44 for the plate, 40 for the badge). */
  readonly size?: number;
}

// ─── Routes ──────────────────────────────────────────────────────────────────────────────

/**
 * Route waypoints at road corners (town coordinates). Every leg runs along a road of the town
 * (tests/unit/map-scenes.test.ts checks it).
 * - delivery: the bakery (Pick up here) east on 560, north on 425, east on 478 to the door.
 * - en-route: the responder north on Example Ave., north-east on Old Rd., north on Sample St.
 *   to the incident (the research address "123 Sample Street").
 */
export const MAP_ROUTE_WAYPOINTS: Readonly<Record<MapRouteKey, readonly MapPoint[]>> = {
  delivery: [pt(365, 560), pt(425, 560), pt(425, 478), pt(590, 478)],
  'en-route': [pt(105, 300), pt(105, 160), pt(345, -80), pt(345, -300)],
};

/** Corner radius of the drawn route, so the puck turns smoothly at junctions. */
const ROUTE_CORNER = 10;

/** The drawn and animated route: the waypoints with rounded corners. */
export function mapRoutePoints(key: MapRouteKey): readonly MapPoint[] {
  return roundCorners(MAP_ROUTE_WAYPOINTS[key], ROUTE_CORNER);
}

/** Where the puck is at `at` (0–1) of a route, with its heading; rounded to 0.1 px. */
export function mapRoutePose(key: MapRouteKey, at: number): MapPose {
  const pose = poseAt(mapRoutePoints(key), at);
  return { x: Math.round(pose.x * 10) / 10, y: Math.round(pose.y * 10) / 10, heading: Math.round(pose.heading) };
}

/** The fraction (0–1) of a route nearest to a point (where a trimmed route starts). */
export function mapRouteFraction(key: MapRouteKey, point: MapPoint): number {
  return fractionNearest(mapRoutePoints(key), point);
}

// ─── Colours shared by scenes ────────────────────────────────────────────────────────────

/**
 * The responder puck colour: the brand primary on light maps and #60a5fa on dark ones (the
 * app's getBrandAccent). Set by map.css on the map root.
 */
export const MAP_BRAND_ACCENT = 'var(--rx-map-accent)';

/** Responder proximity zones (3.3): the route, ETA ribbon edge and distance badge colour. */
export const MAP_ZONE_COLORS = { far: '#f87171', close: '#fb923c', near: '#fbbf24', onSite: '#34d399' } as const;

/**
 * The 3.3 drive while active, for screens that count the distance in step with it: the route
 * turns CLOSE at 1.1 s, NEAR at 2.0 s (80 m) and ON SITE at 2.7 s (18 m), when the puck stops.
 */
export const EN_ROUTE_TIMELINE = { startMs: 300, closeMs: 1100, nearMs: 2000, onSiteMs: 2700 } as const;

const DELIVERY_SKY = '#0EA5E9';
const DELIVERY_DEEP = '#0369A1';
const PIN_RED = '#d84343';

// ─── Scenes ──────────────────────────────────────────────────────────────────────────────

export const MAP_SCENE_KEYS = [
  'town',
  'delivery',
  'hazards',
  'report',
  'duty',
  'dispatch',
  'en-route',
  'en-route-near',
  'en-route-on-site',
  'field-report',
  'lost',
] as const;
export type MapSceneKey = (typeof MAP_SCENE_KEYS)[number];

/** Everything RMapCanvas draws for a scene, apart from theme and height. */
export interface MapSceneLayers {
  readonly view?: MapView;
  readonly pins?: readonly MapPin[];
  readonly route?: RMapRoute;
  readonly puck?: RMapPuck;
  readonly tilt?: true;
  readonly traffic?: true;
  readonly follow?: true | MapFollow;
}

export interface MapScene extends MapSceneLayers {
  readonly key: MapSceneKey;
  readonly title: string;
  /** The figures (or page) that show this scene. */
  readonly usedBy: readonly string[];
  /** The map's height in that figure: px, or 'full' for the whole canvas. */
  readonly height: number | 'full';
  readonly note: string;
}

const DUTY_PUCK: RMapPuck = { x: 105, y: 300, heading: 40, color: MAP_BRAND_ACCENT, glyph: 'van' };
const INCIDENT: MapPin = { x: 345, y: -300, kind: 'incident' };

function enRoute(key: MapSceneKey, at: number, color: RColor, extra: Partial<RMapRoute> = {}): Omit<MapScene, 'title' | 'note'> {
  return {
    key,
    usedBy: ['3.3'],
    height: 'full',
    tilt: true,
    follow: true,
    pins: [INCIDENT],
    route: { path: 'en-route', color, width: 5, trim: true, ...extra },
    puck: { ...mapRoutePose('en-route', at), color: MAP_BRAND_ACCENT, glyph: 'van' },
  };
}

export const MAP_SCENES: Readonly<Record<MapSceneKey, MapScene>> = {
  town: {
    key: 'town',
    title: 'Town, default view',
    usedBy: [],
    height: 'full',
    view: { cx: 195, cy: 422 },
    note: 'The canvas window of the town: what a full-height map shows when no view is given.',
  },
  delivery: {
    key: 'delivery',
    title: 'Delivery on the way',
    usedBy: ['1.5'],
    height: 220,
    view: { cx: 504, cy: 500 },
    traffic: true,
    pins: [
      { x: 365, y: 560, kind: 'store', label: 'Pick up here' },
      { x: 590, y: 478, kind: 'home', label: 'Your address', labelSide: 'left' },
    ],
    route: { path: 'delivery', color: DELIVERY_SKY, casing: DELIVERY_DEEP, width: 7, trim: true },
    puck: {
      ...mapRoutePose('delivery', 0.55),
      color: DELIVERY_SKY,
      glyph: 'moto',
      glide: { stops: [{ atMs: 200, at: 0.34 }, { atMs: 2800, at: 0.55 }] },
    },
    note: 'A 7 px sky route on a #0369A1 casing from the bakery to the door, trimmed behind the rider; the rider glides for 2.6 s and stops where the poster shows it. Fits the 358 × 220 band clear of the ETA chip, the control column and the Call pill; the same view works full screen (expanded).',
  },
  hazards: {
    key: 'hazards',
    title: 'Hazard near you',
    usedBy: ['2.5'],
    height: 'full',
    view: { cx: 165, cy: 657 },
    pins: [
      { x: 120, y: 535, kind: 'hazard', label: 'Flood' },
      { x: 230, y: 775, kind: 'you', look: 'pin', color: PIN_RED, label: 'Your Location' },
    ],
    note: 'Two red pins, as the native map draws them: a flood by the river bridge and the citizen 1.2 km away. Both sit between the title strip and the bottom card.',
  },
  report: {
    key: 'report',
    title: 'Citizen report location',
    usedBy: ['2.6'],
    height: 182,
    view: { cx: 229, cy: 112 },
    pins: [{ x: 229, y: 124, kind: 'you', look: 'pin', color: PIN_RED, label: 'Current Location' }],
    note: 'The 182 px live map of the report form: one Current Location pin by the market and the old road, centred, clear of the Live Location pill.',
  },
  duty: {
    key: 'duty',
    title: 'Responder on duty',
    usedBy: ['3.1'],
    height: 'full',
    view: { cx: 190, cy: 380 },
    traffic: true,
    pins: [
      { x: 268, y: 200, kind: 'peer' },
      { x: 25, y: 330, kind: 'peer' },
      { x: 345, y: 520, kind: 'peer' },
    ],
    puck: DUTY_PUCK,
    note: 'The van puck (heading 40°) by the river with three fellow responders, clear of the glass stack, the locate FAB and the bottom pill.',
  },
  dispatch: {
    key: 'dispatch',
    title: 'Incoming dispatch',
    usedBy: ['3.2'],
    height: 'full',
    view: { cx: 225, cy: 380, zoom: 0.4 },
    pins: [INCIDENT],
    puck: DUTY_PUCK,
    note: 'Zoomed out so the new incident and the responder both show above the half-height dispatch sheet.',
  },
  'en-route': {
    ...enRoute('en-route', 0, MAP_ZONE_COLORS.far, {
      recolorAt: [
        { atMs: EN_ROUTE_TIMELINE.closeMs, color: MAP_ZONE_COLORS.close },
        { atMs: EN_ROUTE_TIMELINE.nearMs, color: MAP_ZONE_COLORS.near },
        { atMs: EN_ROUTE_TIMELINE.onSiteMs, color: MAP_ZONE_COLORS.onSite },
      ],
    }),
    puck: {
      ...mapRoutePose('en-route', 0),
      color: MAP_BRAND_ACCENT,
      glyph: 'van',
      glide: {
        stops: [
          { atMs: EN_ROUTE_TIMELINE.startMs, at: 0 },
          { atMs: EN_ROUTE_TIMELINE.nearMs, at: 0.86 },
          { atMs: EN_ROUTE_TIMELINE.onSiteMs, at: 0.975 },
        ],
      },
    },
    title: 'En route (far, animated)',
    note: 'Tilted 3D follow: the puck stays in the lower third while the town slides under it. Poster FAR; while active it drives to 18 m and the route turns CLOSE, NEAR and ON SITE (EN_ROUTE_TIMELINE).',
  },
  'en-route-near': {
    ...enRoute('en-route-near', 0.86, MAP_ZONE_COLORS.near),
    title: 'En route (near)',
    note: 'The NEAR moment (80 m): yellow route, the incident just ahead.',
  },
  'en-route-on-site': {
    ...enRoute('en-route-on-site', 0.975, MAP_ZONE_COLORS.onSite),
    title: 'En route (on site)',
    note: 'The ON SITE moment (18 m): the puck at the incident, the last metres of route in green.',
  },
  'field-report': {
    key: 'field-report',
    title: 'Responder report location',
    usedBy: ['3.6'],
    height: 192,
    view: { cx: 105, cy: 706 },
    traffic: true,
    pins: [{ x: 105, y: 720, kind: 'you', look: 'pin', color: PIN_RED, label: 'Current Location' }],
    note: 'The 192 px live map of the report form: the Current Location pin at a junction with the traffic layer on (a jam at the scene).',
  },
  lost: {
    key: 'lost',
    title: 'This page isn’t on the map',
    usedBy: ['404'],
    height: 'full',
    view: { cx: -170, cy: 860 },
    pins: [{ x: -190, y: 900, kind: 'you', label: 'You are here' }],
    note: 'The 404 phone: the blue location dot at the edge of town, where the map runs out into the bay.',
  },
};

/** The RMapCanvas layers of a scene (spread them, then override any prop). */
export function mapScene(key: MapSceneKey): MapSceneLayers {
  const { view, pins, route, puck, tilt, traffic, follow } = MAP_SCENES[key];
  return { view, pins, route, puck, tilt, traffic, follow };
}
