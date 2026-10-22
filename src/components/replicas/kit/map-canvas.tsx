import './map.css';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { boundsOf, fmt, growRect, type MapPoint, type MapRect, negate, overlapsAny, pathData, samplePolyline, slicePolyline } from './map-geometry';
import { type MapCull, type MapDetail, type MapGlideVars, MapPlaceLabels, MapRouteLayer, type MapShows, MapTownLayer } from './map-layers';
import { MAP_PUCK_BOX, MapPinMark, MapPuckArt } from './map-markers';
import {
  MAP_SCENES,
  type MapFollow,
  type MapLabelSide,
  type MapPin,
  type MapSceneKey,
  type MapSceneLayers,
  type MapView,
  mapRouteFraction,
  mapRoutePoints,
  type RMapGlide,
  type RMapGlideStop,
  type RMapPuck,
  type RMapRoute,
} from './map-scenes';
import { px, R_CANVAS, rStyle } from './tokens';
import type { RBoxProps } from './types';

export type {
  MapFollow,
  MapLabelSide,
  MapPin,
  MapPinKind,
  MapPinLook,
  MapRouteKey,
  MapSceneKey,
  MapView,
  RMapGlide,
  RMapGlideStop,
  RMapPuck,
  RMapRoute,
} from './map-scenes';
export { MAP_PIN_DEFAULTS, type MapPinStyle } from './map-markers';

export interface RMapCanvasProps extends RBoxProps {
  readonly theme: 'light' | 'dark';
  /** Height in px, or 'full' to fill the parent. The width always fills the parent. */
  readonly height: number | 'full';
  readonly pins?: readonly MapPin[];
  readonly route?: RMapRoute;
  readonly puck?: RMapPuck;
  /** The tilted 3D-follow look (3.3). */
  readonly tilt?: true;
  /** The traffic layer tint on roads. */
  readonly traffic?: true;
  /**
   * A named scene (map-scenes.ts) supplies the view, pins, route, puck, tilt, traffic and follow
   * of a figure; any of those props given here wins over the scene's.
   */
  readonly scene?: MapSceneKey;
  /**
   * The town window to show. Default: the scene's; else, for a full-height map, the canvas window
   * (centre 195, 422, so town coordinates are canvas px); else centred on the pins, route and puck.
   */
  readonly view?: MapView;
  /** Keep the puck pinned in the box (default: centred, lower third) and slide the town under it. */
  readonly follow?: true | MapFollow;
}

/** The 3D follow tilt: the camera's rotateX and the map box's perspective distance. */
export const MAP_TILT = { angle: 52, perspective: 760 } as const;

const MAX_GLIDE_STOPS = 7;
const CULL_MARGIN = 24;

/**
 * How much town a tilted camera sees around its point: ahead (up the map, until the fog is
 * opaque at about 780 px), to the sides (the view widens with distance) and behind. Detail
 * (buildings, landmarks, points of interest) stops sooner, inside the fog.
 */
const TILT_REACH = {
  coarse: { ahead: 800, side: 420, behind: 250 },
  detail: { ahead: 600, side: 310, behind: 250 },
} as const;

interface GlidePlan {
  readonly stops: readonly RMapGlideStop[];
  readonly segments: number;
}

function planGlide(glide: RMapGlide | undefined): GlidePlan | undefined {
  if (!glide) return undefined;
  const stops = glide.stops
    .map((stop) => ({ atMs: Math.max(Math.round(stop.atMs), 0), at: Math.min(Math.max(stop.at, 0), 1) }))
    .sort((a, b) => a.atMs - b.atMs)
    .slice(0, MAX_GLIDE_STOPS);
  return stops.length < 2 ? undefined : { stops, segments: stops.length - 1 };
}

/** Distances (percent of the path) and timings per glide segment, shared by every gliding layer. */
function glideTiming(plan: GlidePlan): MapGlideVars {
  const vars: Record<`--${string}`, string> = {};
  plan.stops.forEach((stop, index) => {
    vars[`--rx-map-g-${index}`] = String(Math.round(stop.at * 10000) / 100);
    const previous = plan.stops[index - 1];
    if (previous) {
      vars[`--rx-map-gt-${index}`] = `${previous.atMs}ms`;
      vars[`--rx-map-gd-${index}`] = `${Math.max(stop.atMs - previous.atMs, 1)}ms`;
    }
  });
  return vars;
}

function glideMotion(points: readonly MapPoint[], rotate: string, transform: string): MapGlideVars {
  return { '--rx-map-path': `path("${pathData(points)}")`, '--rx-map-rotate': rotate, '--rx-map-glide-transform': transform };
}

/**
 * A marker's transform: its anchor on the town point, standing up on a tilted map, turned to a
 * heading, kept at size when zoomed. `offset` is where the anchor sits in an unmoved marker box
 * (the puck box starts at the world origin, so its centre is 50 px in).
 */
function markerTransform(x: number, y: number, unzoom: number, standUp: boolean, heading?: number, offset = 0): string {
  return [
    `translate(${fmt(x - offset)}px, ${fmt(y - offset)}px)`,
    standUp ? `rotateX(${-MAP_TILT.angle}deg)` : '',
    heading === undefined || heading === 0 ? '' : `rotate(${fmt(heading)}deg)`,
    unzoom === 1 ? '' : `scale(${fmt(unzoom)})`,
  ]
    .filter(Boolean)
    .join(' ');
}

function defaultView(height: number | 'full', points: readonly MapPoint[]): MapView {
  if (height === 'full' || points.length === 0) return { cx: R_CANVAS.width / 2, cy: R_CANVAS.height / 2 };
  const bounds = boundsOf(points);
  return { cx: (bounds.x0 + bounds.x1) / 2, cy: (bounds.y0 + bounds.y1) / 2 };
}

/** Where a follow camera keeps the puck, as fractions of the box. */
interface FollowPoint {
  readonly x: number;
  readonly y: number;
}

interface CullInput {
  readonly view: MapView;
  readonly zoom: number;
  readonly boxHeight: number;
  readonly tilt: boolean;
  readonly follow?: FollowPoint;
  /** The follow camera's positions: the puck, then its drive. */
  readonly cameras: readonly MapPoint[];
}

/**
 * What a map instance can show: its view, or the follow camera's view at each point of its
 * drive, plus the distance a tilted camera sees before the fog. Culling assumes the widest box,
 * the 390 px canvas.
 */
function mapCull({ view, zoom, boxHeight, tilt, follow, cameras }: CullInput): MapCull {
  const boxWidth = R_CANVAS.width;
  if (follow) {
    if (tilt) {
      const around = (reach: { readonly ahead: number; readonly side: number; readonly behind: number }): MapRect[] =>
        cameras.map((at) => ({ x0: at.x - reach.side, y0: at.y - reach.ahead, x1: at.x + reach.side, y1: at.y + reach.behind }));
      return { coarse: around(TILT_REACH.coarse), detail: around(TILT_REACH.detail) };
    }
    const windows = cameras.map((at) =>
      growRect(
        { x0: at.x, y0: at.y, x1: at.x, y1: at.y },
        boxHeight * follow.y + CULL_MARGIN,
        boxWidth * (1 - follow.x) + CULL_MARGIN,
        boxHeight * (1 - follow.y) + CULL_MARGIN,
        boxWidth * follow.x + CULL_MARGIN,
      ),
    );
    return { coarse: windows, detail: windows };
  }
  const halfWidth = (boxWidth / 2 + CULL_MARGIN) / zoom;
  const halfHeight = (boxHeight / 2 + CULL_MARGIN) / zoom;
  const window = { x0: view.cx - halfWidth, y0: view.cy - halfHeight, x1: view.cx + halfWidth, y1: view.cy + halfHeight };
  if (!tilt) return { coarse: [window], detail: [window] };
  return {
    coarse: [growRect(window, TILT_REACH.coarse.ahead, TILT_REACH.coarse.side - boxWidth / 2, 0)],
    detail: [growRect(window, TILT_REACH.detail.ahead, TILT_REACH.detail.side - boxWidth / 2, 0)],
  };
}

/** Room around the box that still counts as showing (a sliver of a name's halo at the edge). */
const SHOW_MARGIN = 4;

/** map.css: the tilted map's perspective origin (50% 30% of the box) and where its fog is opaque. */
const TILT_ORIGIN_Y = 0.3;
const TILT_FOG_OPAQUE = 780;

/**
 * Whether a town box shows on a tilted map whose camera point `at` sits at `anchor` in the box:
 * its corners projected like the CSS (rotateX about the camera, perspective from 50% 30%) land in
 * the box, and it is not wholly beyond the fog. Behind the eye counts as showing (never happens
 * in the scenes; generous by design).
 */
function tiltShows(rect: MapRect, at: MapPoint, anchor: MapPoint, height: number, zoom: number): boolean {
  if ((rect.y1 - at.y) * zoom < -TILT_FOG_OPAQUE) return false;
  const angle = (MAP_TILT.angle * Math.PI) / 180;
  const depth = MAP_TILT.perspective;
  const origin = { x: R_CANVAS.width / 2, y: height * TILT_ORIGIN_Y };
  const xs: number[] = [];
  const ys: number[] = [];
  for (const x of [rect.x0, rect.x1]) {
    for (const y of [rect.y0, rect.y1]) {
      const dx = (x - at.x) * zoom;
      const dy = (y - at.y) * zoom;
      const z = dy * Math.sin(angle);
      if (z >= depth - 1) return true;
      const scale = depth / (depth - z);
      xs.push(origin.x + (anchor.x + dx - origin.x) * scale);
      ys.push(origin.y + (anchor.y + dy * Math.cos(angle) - origin.y) * scale);
    }
  }
  return (
    Math.max(...xs) > -SHOW_MARGIN &&
    Math.min(...xs) < R_CANVAS.width + SHOW_MARGIN &&
    Math.max(...ys) > -SHOW_MARGIN &&
    Math.min(...ys) < height + SHOW_MARGIN
  );
}

/**
 * Where names and points of interest show: the box around the camera (the view centre, or each
 * point of a follow camera's drive) after zoom, or, tilted, the projected ground and its fog.
 * Like the cull, it assumes the widest box, the 390 px canvas, so a narrower map keeps a little
 * more than it shows and never less.
 */
function mapShows({ view, zoom, boxHeight, tilt, follow, cameras }: CullInput): MapShows {
  const anchor = { x: R_CANVAS.width * (follow ? follow.x : 0.5), y: boxHeight * (follow ? follow.y : 0.5) };
  const points: readonly MapPoint[] = follow && cameras.length > 0 ? cameras : [{ x: view.cx, y: view.cy }];
  if (tilt) return (rect) => points.some((at) => tiltShows(rect, at, anchor, boxHeight, zoom));
  const windows = points.map((at) => ({
    x0: at.x - (anchor.x + SHOW_MARGIN) / zoom,
    y0: at.y - (anchor.y + SHOW_MARGIN) / zoom,
    x1: at.x + (R_CANVAS.width - anchor.x + SHOW_MARGIN) / zoom,
    y1: at.y + (boxHeight - anchor.y + SHOW_MARGIN) / zoom,
  }));
  return (rect) => overlapsAny(rect, windows);
}

/** The props, falling back to the scene's layers. */
function resolveLayers(props: RMapCanvasProps): MapSceneLayers & { readonly pins: readonly MapPin[] } {
  const scene = props.scene ? MAP_SCENES[props.scene] : undefined;
  return {
    view: props.view ?? scene?.view,
    pins: props.pins ?? scene?.pins ?? [],
    route: props.route ?? scene?.route,
    puck: props.puck ?? scene?.puck,
    tilt: props.tilt ?? scene?.tilt,
    traffic: props.traffic ?? scene?.traffic,
    follow: props.follow ?? scene?.follow,
  };
}

/**
 * The fictional-town map (1.5, 2.5, 2.6, 3.1–3.3, 3.6, 404): a hook-free Server Component of
 * div, span and svg. One town SVG (culled to the view), the route with its casing, pins and a
 * heading-aware puck. While an ancestor has [data-active] the puck glides along the route
 * (offset-path), a trimmed route shrinks behind it, recolorAt stops recolour the route and the
 * follow camera slides the town; the static markup is the poster (MOTION CONTRACT).
 */
export function RMapCanvas(props: RMapCanvasProps): ReactNode {
  const { theme, height, className, style } = props;
  const { pins, route, puck, tilt, traffic, ...layers } = resolveLayers(props);

  const routePoints = route ? mapRoutePoints(route.path) : undefined;
  const plan = puck && routePoints ? planGlide(puck.glide) : undefined;
  const follow: FollowPoint | undefined =
    layers.follow && puck
      ? { x: layers.follow === true ? 0.5 : (layers.follow.x ?? 0.5), y: layers.follow === true ? 2 / 3 : (layers.follow.y ?? 2 / 3) }
      : undefined;

  const content: MapPoint[] = [...pins, ...(puck ? [puck] : []), ...(routePoints ?? [])];
  const view = follow && puck ? { cx: puck.x, cy: puck.y, zoom: 1 } : (layers.view ?? defaultView(height, content));
  const zoom = Math.min(Math.max(view.zoom ?? 1, 0.2), 4);
  const unzoom = Math.round((1 / zoom) * 1000) / 1000;
  const detail: MapDetail = zoom >= 0.75 ? 'full' : 'coarse';

  const ats = plan?.stops.map((stop) => stop.at) ?? [];
  const drive = routePoints && ats.length > 0 ? samplePolyline(slicePolyline(routePoints, Math.min(...ats), Math.max(...ats)), 110) : [];
  const cullInput: CullInput = {
    view,
    zoom,
    boxHeight: height === 'full' ? R_CANVAS.height : height,
    tilt: tilt === true,
    follow,
    cameras: puck ? [puck, ...drive] : [],
  };
  const cull = mapCull(cullInput);
  const shows = mapShows(cullInput);

  // One glide timing drives the puck, a trimmed route and the follow camera.
  const glide = plan && routePoints ? { segments: plan.segments, vars: glideTiming(plan) } : undefined;
  const worldStyle = {
    transform: `${zoom === 1 ? '' : `scale(${Math.round(zoom * 1000) / 1000}) `}translate(${fmt(-view.cx)}px, ${fmt(-view.cy)}px)`,
    ...(follow && glide && routePoints ? { ...glide.vars, ...glideMotion(negate(routePoints), '0deg', 'none') } : {}),
  } as CSSProperties;

  const screenX = (x: number): number => (x - view.cx) * zoom + R_CANVAS.width * (follow ? follow.x : 0.5);
  const sideOf = (pin: MapPin): MapLabelSide => pin.labelSide ?? (screenX(pin.x) > R_CANVAS.width * 0.62 ? 'left' : 'right');
  const orderedPins = [...pins].sort((a, b) => a.y - b.y);

  const look = puck?.look ?? (puck?.glyph === 'moto' ? 'badge' : 'plate');
  const puckSize = puck?.size ?? 44;
  const trimFrom = route?.trim && puck ? mapRouteFraction(route.path, puck) : undefined;

  return (
    <div
      className={cn('rx-map', className)}
      data-theme={theme}
      data-detail={detail}
      data-tilt={tilt ? '' : undefined}
      data-follow={follow ? '' : undefined}
      style={rStyle(
        { '--rx-map-perspective': tilt ? px(MAP_TILT.perspective) : undefined },
        { height: height === 'full' ? '100%' : px(height), ...style },
      )}
    >
      <div
        className="rx-map__cam"
        style={{
          left: follow ? `${fmt(follow.x * 100)}%` : '50%',
          top: follow ? `${fmt(follow.y * 100)}%` : '50%',
          transform: tilt ? `rotateX(${MAP_TILT.angle}deg)` : undefined,
        }}
      >
        <div className="rx-map__world" data-glide={follow && glide ? String(glide.segments) : undefined} style={worldStyle}>
          <MapTownLayer cull={cull} detail={detail} traffic={traffic === true} />
          <MapPlaceLabels cull={cull} detail={detail} unzoom={unzoom} shows={shows} />
          {route && routePoints ? <MapRouteLayer route={route} points={routePoints} trimFrom={trimFrom} glide={glide} /> : null}
          {orderedPins.map((pin, index) => (
            <MapPinMark
              key={`${pin.kind}-${index}-${pin.x}-${pin.y}`}
              pin={pin}
              side={sideOf(pin)}
              transform={markerTransform(pin.x, pin.y, unzoom, tilt === true)}
            />
          ))}
          {puck ? (
            <span
              className="rx-map-puck"
              data-look={look}
              data-glyph={puck.glyph}
              data-glide={glide ? String(glide.segments) : undefined}
              style={
                {
                  transform: markerTransform(puck.x, puck.y, unzoom, false, puck.heading, MAP_PUCK_BOX / 2),
                  '--rx-map-puck-c': puck.color,
                  '--rx-map-puck-size': px(puckSize),
                  ...(glide && routePoints
                    ? { ...glide.vars, ...glideMotion(routePoints, 'auto 90deg', unzoom === 1 ? 'none' : `scale(${fmt(unzoom)})`) }
                    : {}),
                } as CSSProperties
              }
            >
              <MapPuckArt puck={puck} look={look} size={puckSize} />
            </span>
          ) : null}
        </div>
        {tilt ? <span className="rx-map__fog" /> : null}
      </div>
    </div>
  );
}
