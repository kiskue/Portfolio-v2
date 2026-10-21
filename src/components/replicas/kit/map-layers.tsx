import { Fuel, GraduationCap, Landmark, type LucideIcon, Plus, ShoppingBasket, Trees } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { renderLucideSvg } from '@/lib/lucide-node';
import { mergedGlyphPath } from './kit-glyph';
import {
  boundsOf,
  clipRuns,
  fmt,
  growRect,
  inRect,
  type MapPoint,
  type MapRect,
  overlapsAny,
  pathData,
  polylineLength,
  unionRect,
} from './map-geometry';
import type { RMapRoute } from './map-scenes';
import { RIVER_WIDTH, TOWN, type TownAreaKind, type TownLabel, type TownLabelKind, type TownPoi, type TownPoiKind, type TownRoadKind, type TrafficLevel } from './map-town';

/*
 * The layers RMapCanvas stacks inside its world: the town (one SVG, culled to what the view can
 * show), the place labels and points of interest (HTML text, since replicas draw no SVG text),
 * and the route. Colours come from map.css (--rx-map-* per theme).
 */

/** How much of the town to draw: everything, or no buildings and small labels when zoomed out. */
export type MapDetail = 'full' | 'coarse';

const ROAD_KINDS: readonly TownRoadKind[] = ['minor', 'major', 'highway'];
const AREA_KINDS: readonly TownAreaKind[] = ['park', 'school', 'hospital', 'market', 'plaza', 'pitch'];
const TRAFFIC_LEVELS: readonly TrafficLevel[] = ['free', 'slow', 'jam'];

const POI_ICONS: Readonly<Record<TownPoiKind, LucideIcon>> = {
  hospital: Plus,
  school: GraduationCap,
  market: ShoppingBasket,
  park: Trees,
  plaza: Landmark,
  fuel: Fuel,
};

/**
 * What a map instance can show, as rectangles of the town: `coarse` for land, water, roads,
 * traffic and labels, `detail` for buildings, landmarks, footpaths and points of interest (a
 * tilted map only needs those near the camera; the fog hides the rest). A follow camera gives
 * one rectangle per camera position along its drive.
 */
export interface MapCull {
  readonly coarse: readonly MapRect[];
  readonly detail: readonly MapRect[];
}

const grown = (rects: readonly MapRect[], by: number): readonly MapRect[] => rects.map((rect) => growRect(rect, by));

function runsPath(lines: readonly (readonly MapPoint[])[], rects: readonly MapRect[]): string {
  return lines
    .flatMap((line) => clipRuns(line, rects))
    .map((run) => pathData(run))
    .join(' ');
}

function polygonsPath(polygons: readonly (readonly MapPoint[])[], rects: readonly MapRect[]): string {
  return polygons
    .filter((polygon) => overlapsAny(boundsOf(polygon), rects))
    .map((polygon) => pathData(polygon, true))
    .join(' ');
}

function buildingsPath(rects: readonly MapRect[]): string {
  return TOWN.buildings
    .filter((b) => overlapsAny({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }, rects))
    .map((b) => `M${fmt(b.x)} ${fmt(b.y)}h${fmt(b.w)}v${fmt(b.h)}h${fmt(-b.w)}Z`)
    .join('');
}

/** A path element, or nothing when the culled data is empty. */
function Layer({ d, className, ...rest }: { readonly d: string; readonly className: string } & Readonly<Record<`data-${string}`, string>>): ReactNode {
  return d === '' ? null : <path d={d} className={className} {...rest} />;
}

export interface MapTownLayerProps {
  readonly cull: MapCull;
  readonly detail: MapDetail;
  readonly traffic: boolean;
}

/** The town as one SVG: land, areas, water, buildings, footpaths, roads and traffic. */
export function MapTownLayer({ cull, detail, traffic }: MapTownLayerProps): ReactNode {
  const coarse = cull.coarse;
  const bounds = coarse.reduce((all, rect) => unionRect(all, rect), coarse[0] ?? { x0: 0, y0: 0, x1: 0, y1: 0 });
  const box = { x0: Math.floor(bounds.x0), y0: Math.floor(bounds.y0), x1: Math.ceil(bounds.x1), y1: Math.ceil(bounds.y1) };
  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  const nearRoads = grown(coarse, 12);
  const roadsOf = (kind: TownRoadKind): readonly (readonly MapPoint[])[] =>
    TOWN.roads.filter((road) => road.kind === kind).map((road) => road.points);
  const ponds = TOWN.areas.filter((area) => area.kind === 'pond').map((area) => area.points);
  return (
    <svg
      className="rx-map__base"
      width={width}
      height={height}
      viewBox={`${box.x0} ${box.y0} ${width} ${height}`}
      style={{ left: `${box.x0}px`, top: `${box.y0}px` }}
      aria-hidden="true"
    >
      <rect x={box.x0} y={box.y0} width={width} height={height} className="rx-map__land" />
      {AREA_KINDS.map((kind) => (
        <Layer
          key={kind}
          d={polygonsPath(
            TOWN.areas.filter((area) => area.kind === kind).map((area) => area.points),
            coarse,
          )}
          className="rx-map__area"
          data-kind={kind}
        />
      ))}
      <Layer d={runsPath([TOWN.coast], grown(coarse, 20))} className="rx-map__sand" />
      <Layer d={runsPath([TOWN.river], grown(coarse, RIVER_WIDTH))} className="rx-map__bank" />
      <Layer d={runsPath([TOWN.river], grown(coarse, RIVER_WIDTH))} className="rx-map__river" />
      {/* The bay after the river, so the river mouth opens into it without an end cap. */}
      <Layer d={polygonsPath([TOWN.sea], coarse)} className="rx-map__sea" />
      <Layer d={polygonsPath(ponds, coarse)} className="rx-map__pond" />
      {detail === 'full' ? (
        <>
          <Layer d={buildingsPath(cull.detail)} className="rx-map__buildings" />
          <Layer d={polygonsPath(TOWN.landmarks, cull.detail)} className="rx-map__landmarks" />
          <Layer d={runsPath(TOWN.paths, cull.detail)} className="rx-map__footpath" />
        </>
      ) : null}
      {/* Zoomed out, minor streets lose their casing (it would be a sub-pixel sliver). */}
      {ROAD_KINDS.filter((kind) => detail === 'full' || kind !== 'minor').map((kind) => (
        <Layer key={`edge-${kind}`} d={runsPath(roadsOf(kind), nearRoads)} className="rx-map__road-edge" data-kind={kind} />
      ))}
      {ROAD_KINDS.map((kind) => (
        <Layer key={`road-${kind}`} d={runsPath(roadsOf(kind), nearRoads)} className="rx-map__road" data-kind={kind} />
      ))}
      {traffic
        ? (['major', 'highway'] as const).flatMap((road) =>
            TRAFFIC_LEVELS.map((level) => (
              <Layer
                key={`traffic-${road}-${level}`}
                d={runsPath(
                  TOWN.traffic.filter((stretch) => stretch.road === road && stretch.level === level).map((stretch) => stretch.points),
                  nearRoads,
                )}
                className="rx-map__traffic"
                data-road={road}
                data-level={level}
              />
            )),
          )
        : null}
    </svg>
  );
}

/** Which of a map's layers a box of the town belongs to: the coarse view or the detail view. */
export type MapLayerKind = 'coarse' | 'detail';

/**
 * Whether a box of the town (town px) shows in the map: inside its view after zoom, the follow
 * camera's drive, or the tilted camera's projection and fog (map-canvas.tsx). Labels and points
 * of interest are drawn only where this holds.
 */
export type MapShows = (rect: MapRect, layer: MapLayerKind) => boolean;

/**
 * Generous text metrics in px for the label kinds (map.css: 10px street names, 11px italic
 * water, 9.5px spaced district names, 10px semibold POI names). Widths are per character and
 * above what any system font measures (street ≤ 5.2, water ≤ 6.1, district ≤ 7.0, POI ≤ 5.0
 * px a character in Chrome), so an estimate never culls a name that shows.
 */
const LABEL_METRICS: Readonly<Record<TownLabelKind | 'poi', { readonly char: number; readonly height: number }>> = {
  street: { char: 6.2, height: 12 },
  water: { char: 7, height: 13 },
  district: { char: 8.6, height: 11 },
  poi: { char: 6.2, height: 14 },
};

/** The text halo (map.css text-shadow) plus a pixel of rounding, around every name box. */
const LABEL_HALO = 4;

/** A place name's box in town px: centred on its point, turned by its angle, kept at size when zoomed. */
function labelRect(label: TownLabel, unzoom: number): MapRect {
  const metrics = LABEL_METRICS[label.kind];
  const width = (label.text.length * metrics.char + LABEL_HALO * 2) * unzoom;
  const height = (metrics.height + LABEL_HALO * 2) * unzoom;
  const angle = (label.angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfWidth = (width * cos + height * sin) / 2;
  const halfHeight = (width * sin + height * cos) / 2;
  return { x0: label.x - halfWidth, y0: label.y - halfHeight, x1: label.x + halfWidth, y1: label.y + halfHeight };
}

/** A point of interest's box in town px: the 16px icon disc (and its halo ring) and the name to its right. */
function poiRect(poi: TownPoi, unzoom: number): MapRect {
  const right = POI_LABEL_X + poi.label.length * LABEL_METRICS.poi.char + LABEL_HALO;
  const reach = POI_ICON / 2 + LABEL_HALO;
  return { x0: poi.x - reach * unzoom, y0: poi.y - reach * unzoom, x1: poi.x + right * unzoom, y1: poi.y + reach * unzoom };
}

/** The POI icon disc (px) and where its name starts, right of the point (map.css). */
const POI_ICON = 16;
const POI_LABEL_X = 11;

/** The 10px POI glyph centred in the 16px disc: lucide's 24-unit box drawn at 10px. */
const POI_GLYPH_VIEWBOX = `${fmt((24 * (POI_ICON / 10) - 24) / -2)} ${fmt((24 * (POI_ICON / 10) - 24) / -2)} ${fmt(24 * (POI_ICON / 10))} ${fmt(24 * (POI_ICON / 10))}`;

/**
 * A POI glyph as one white path (kit-glyph.tsx merges lucide's shapes), or lucide's shapes as
 * they are when an icon cannot be merged.
 */
function PoiGlyph({ icon }: { readonly icon: LucideIcon }): ReactNode {
  const d = mergedGlyphPath(icon);
  return (
    <svg
      className="rx-map-poi__icon"
      width={POI_ICON}
      height={POI_ICON}
      viewBox={POI_GLYPH_VIEWBOX}
      fill="none"
      stroke="#ffffff"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d === null ? lucideShapes(icon) : <path d={d} />}
    </svg>
  );
}

/** lucide's own shapes for an icon, as plain SVG elements (the unmerged fallback). */
function lucideShapes(icon: LucideIcon): ReactNode {
  return renderLucideSvg(icon).props.children;
}

export interface MapPlaceLabelsProps {
  readonly cull: MapCull;
  readonly detail: MapDetail;
  /** 1 / zoom, so names and points of interest keep their size when the map is zoomed out. */
  readonly unzoom: number;
  /** Whether a name's box shows in the map; names and POIs elsewhere are not drawn. Default: all near the cull. */
  readonly shows?: MapShows;
}

/**
 * Street, water, park and district names, and the points of interest, as positioned spans. A
 * name is drawn only where it shows: near the culled town AND, by its estimated box, inside the
 * map's view (`shows`). A point of interest is three elements: the name span, its icon disc (an
 * svg) and one glyph path.
 */
export function MapPlaceLabels({ cull, detail, unzoom, shows }: MapPlaceLabelsProps): ReactNode {
  const near = (point: MapPoint, rects: readonly MapRect[]): boolean => rects.some((rect) => inRect(point, growRect(rect, 60)));
  const visible = (rect: MapRect, layer: MapLayerKind): boolean => shows?.(rect, layer) ?? true;
  const labels = TOWN.labels.filter(
    (label) =>
      near(label, cull.coarse) &&
      (detail === 'full' || label.kind === 'water' || label.kind === 'district') &&
      visible(labelRect(label, unzoom), 'coarse'),
  );
  const pois = detail === 'full' ? TOWN.pois.filter((poi) => near(poi, cull.detail) && visible(poiRect(poi, unzoom), 'detail')) : [];
  return (
    <>
      {labels.map((label) => (
        <span
          key={`${label.text}-${label.x}-${label.y}`}
          className="rx-map-label"
          data-kind={label.kind}
          style={{
            // Names keep their size at any zoom, as on a real map.
            transform: `translate(${label.x}px, ${label.y}px) rotate(${label.angle}deg)${unzoom === 1 ? '' : ` scale(${fmt(unzoom)})`} translate(-50%, -50%)`,
          }}
        >
          {label.text}
        </span>
      ))}
      {pois.map((poi) => (
        // The span is the name itself, 11px right of the point; the disc hangs back over the point.
        <span
          key={`${poi.kind}-${poi.x}-${poi.y}`}
          className="rx-map-poi"
          data-kind={poi.kind}
          style={{ transform: `translate(${poi.x}px, ${poi.y}px)${unzoom === 1 ? '' : ` scale(${fmt(unzoom)})`}` }}
        >
          <PoiGlyph icon={POI_ICONS[poi.kind]} />
          {poi.label}
        </span>
      ))}
    </>
  );
}

/** Custom properties for a glide (puck, follow camera and trimmed route share them). */
export type MapGlideVars = Readonly<Record<`--${string}`, string>>;

export interface MapRouteLayerProps {
  readonly route: RMapRoute;
  readonly points: readonly MapPoint[];
  /** Where the trimmed route starts in the poster (0–1), when route.trim is set. */
  readonly trimFrom?: number;
  /** Glide variables and segment count, for a trimmed route that follows a gliding puck. */
  readonly glide?: { readonly segments: number; readonly vars: MapGlideVars };
}

const MAX_RECOLOR = 6;

/** The route: an optional casing under a core line, recoloured and trimmed while active. */
export function MapRouteLayer({ route, points, trimFrom, glide }: MapRouteLayerProps): ReactNode {
  const width = Math.max(route.width, 1);
  const casingWidth = route.casing ? Math.max(route.casingWidth ?? width + 3, width) : 0;
  const reach = Math.max(width, casingWidth) / 2 + 2;
  const bounds = growRect(boundsOf(points), reach);
  const box = { x0: Math.floor(bounds.x0), y0: Math.floor(bounds.y0), x1: Math.ceil(bounds.x1), y1: Math.ceil(bounds.y1) };
  const d = pathData(points);
  const trim = route.trim && !route.dashed;

  const stops = (route.recolorAt ?? []).slice().sort((a, b) => a.atMs - b.atMs).slice(0, MAX_RECOLOR);
  const recolor: Record<`--${string}`, string> = {};
  stops.forEach((stop, index) => {
    const at = Math.max(Math.round(stop.atMs), 0);
    recolor[`--rx-map-rc-${index + 1}`] = stop.color;
    recolor[`--rx-map-rct-${index + 1}`] = `${at}ms`;
    recolor[`--rx-map-rcd-${index + 1}`] = at === 0 ? '0ms' : '220ms';
  });

  // Dashes in px for a dashed route: 2w on, 1.6w off; the casing keeps the period and closes
  // each dash (the SME onward leg: 10/8 on a 5 px core, 13/5 on its 8 px casing).
  const dash = route.dashed ? { on: width * 2, off: width * 1.6 } : null;
  const overhang = (casingWidth - width) / 2;
  const coreDash = dash ? `${fmt(dash.on)} ${fmt(dash.off)}` : undefined;
  const casingDash = dash ? `${fmt(dash.on + overhang * 2)} ${fmt(Math.max(dash.off - overhang * 2, 0.5))}` : undefined;
  const pathLength = trim ? 100 : undefined;
  const trimStyle = trim
    ? ({
        strokeDasharray: '100 100',
        strokeDashoffset: fmt(-(trimFrom ?? 0) * 100),
        ...(glide?.vars ?? {}),
      } as CSSProperties)
    : undefined;

  return (
    <svg
      className="rx-map__route"
      width={box.x1 - box.x0}
      height={box.y1 - box.y0}
      viewBox={`${box.x0} ${box.y0} ${box.x1 - box.x0} ${box.y1 - box.y0}`}
      style={{ left: `${box.x0}px`, top: `${box.y0}px` }}
      aria-hidden="true"
      data-length={Math.round(polylineLength(points))}
    >
      <g
        className="rx-map-route"
        data-recolor={stops.length > 0 ? String(stops.length) : undefined}
        style={{ color: route.color, ...recolor } as CSSProperties}
      >
        <g className="rx-map-route__trim" data-glide={trim && glide ? String(glide.segments) : undefined} style={trimStyle}>
          {route.casing ? (
            <path
              d={d}
              pathLength={pathLength}
              className="rx-map-route__casing"
              stroke={route.casing}
              strokeWidth={casingWidth}
              strokeDasharray={casingDash}
            />
          ) : null}
          <path d={d} pathLength={pathLength} className="rx-map-route__core" strokeWidth={width} strokeDasharray={coreDash} />
        </g>
      </g>
    </svg>
  );
}
