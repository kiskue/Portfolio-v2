import {
  boundsOf,
  distanceToPolyline,
  growRect,
  inPolygon,
  type MapPoint,
  type MapRect,
  polylineLength,
  poseAt,
  pt,
  rectsOverlap,
  samplePolyline,
  seededRandom,
  segmentProjection,
  segmentsCross,
  segmentToPolyline,
  slicePolyline,
  smoothCurve,
} from './map-geometry';

/*
 * The ONE fictional town every map replica draws (architecture D4, design §5.1). Town
 * coordinates are logical px with y down; the 390×844 canvas window (0..390, 0..844) is the
 * default view, and the town extends well beyond it so other neighbourhoods, tilted views and
 * band-shaped maps have something to show. Everything is invented: no real place or street names
 * (the names follow the research sample data: "Sample", "Example").
 *
 * The town is generated once, deterministically: a street grid with uneven spacing, a diagonal
 * old road, a river with three bridges on the major roads, a coast with a beach, parks and
 * landmarks, and seeded building footprints in every ordinary block.
 */

export type TownRoadKind = 'highway' | 'major' | 'minor';
export type TownAreaKind = 'park' | 'school' | 'hospital' | 'market' | 'plaza' | 'pitch' | 'pond';
export type TownLabelKind = 'street' | 'water' | 'district';
export type TownPoiKind = 'hospital' | 'school' | 'market' | 'park' | 'plaza' | 'fuel';
export type TrafficLevel = 'free' | 'slow' | 'jam';

export interface TownRoad {
  readonly kind: TownRoadKind;
  /** The centreline as a polyline (curved roads are sampled densely). */
  readonly points: readonly MapPoint[];
}

export interface TownArea {
  readonly kind: TownAreaKind;
  readonly points: readonly MapPoint[];
}

export interface TownBuilding {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface TownLabel {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  /** Rotation in degrees (text reads left to right; −90 runs up a north–south road). */
  readonly angle: number;
  readonly kind: TownLabelKind;
}

export interface TownPoi {
  readonly kind: TownPoiKind;
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

export interface TownTraffic {
  readonly level: TrafficLevel;
  readonly road: 'major' | 'highway';
  readonly points: readonly MapPoint[];
}

export interface Town {
  readonly extent: MapRect;
  readonly roads: readonly TownRoad[];
  /** Footpaths through parks (drawn dashed). */
  readonly paths: readonly (readonly MapPoint[])[];
  readonly areas: readonly TownArea[];
  readonly buildings: readonly TownBuilding[];
  /** Larger footprints for the hospital, market, school and town hall. */
  readonly landmarks: readonly (readonly MapPoint[])[];
  readonly river: readonly MapPoint[];
  readonly sea: readonly MapPoint[];
  /** The shoreline, drawn as the beach. */
  readonly coast: readonly MapPoint[];
  readonly traffic: readonly TownTraffic[];
  readonly labels: readonly TownLabel[];
  readonly pois: readonly TownPoi[];
}

/** Where the town has land, water and roads (beyond it a map shows plain land). */
export const TOWN_EXTENT: MapRect = { x0: -470, y0: -1120, x1: 880, y1: 1340 };

/** Drawn road widths in px; the casing adds 1.5 px each side. */
export const ROAD_WIDTH: Readonly<Record<TownRoadKind, number>> = { highway: 14, major: 11, minor: 7 };

export const RIVER_WIDTH = 44;

// ─── Grid ────────────────────────────────────────────────────────────────────────────────

interface GridLine {
  readonly at: number;
  readonly major?: true;
}

/** North–south avenues, west to east (Example Ave. is x 105, Plaza Ave. 268, Sample St. 345). */
const AVENUES: readonly GridLine[] = [
  { at: -400 }, { at: -318 }, { at: -236 }, { at: -150, major: true }, { at: -66 }, { at: 25 }, { at: 105, major: true }, { at: 190 },
  { at: 268 }, { at: 345, major: true }, { at: 425 }, { at: 505 }, { at: 590, major: true }, { at: 670 }, { at: 750 }, { at: 830 },
];

/**
 * East–west streets, north to south. Streets meet the old diagonal road exactly at the
 * avenues (y = 265 − x), so it runs corner to corner through the grid.
 */
const STREETS: readonly GridLine[] = [
  { at: -1080 }, { at: -995 }, { at: -912, major: true }, { at: -830 }, { at: -745 }, { at: -660 }, { at: -578, major: true },
  { at: -495 }, { at: -412 }, { at: -325 }, { at: -240, major: true }, { at: -160 }, { at: -80 }, { at: -3 }, { at: 75, major: true },
  { at: 160 }, { at: 240 }, { at: 318 }, { at: 400, major: true }, { at: 478 }, { at: 560 }, { at: 640 }, { at: 720, major: true },
  { at: 800 }, { at: 880 }, { at: 960 }, { at: 1040, major: true }, { at: 1120 }, { at: 1200 }, { at: 1290 },
];

/** Grid cells (avenue index range × street index range) that hold an area instead of blocks. */
interface CellArea {
  readonly kind: 'park' | 'school' | 'hospital' | 'market' | 'plaza';
  readonly avenues: readonly [number, number];
  readonly streets: readonly [number, number];
}

const CELL_AREAS: readonly CellArea[] = [
  { kind: 'park', avenues: [7, 9], streets: [18, 20] }, // Riverside Park, x 190–345, y 400–560
  { kind: 'park', avenues: [11, 12], streets: [6, 9] }, // North Park, x 505–590, y −578…−325
  { kind: 'park', avenues: [11, 12], streets: [20, 21] }, // a pocket park, x 505–590, y 560–640
  { kind: 'school', avenues: [10, 12], streets: [22, 23] }, // Central School, x 425–590, y 720–800
  { kind: 'hospital', avenues: [6, 7], streets: [13, 14] }, // Town Hospital, x 105–190, y −3…75
  { kind: 'market', avenues: [8, 9], streets: [14, 15] }, // Public Market, x 268–345, y 75–160
  { kind: 'plaza', avenues: [7, 8], streets: [12, 13] }, // Town Plaza, x 190–268, y −80…−3
];

/**
 * Grid segments left out so the grid reads as a town, not graph paper: dead ends and
 * T-junctions. [avenue index, street index] removes the avenue between streets j and j+1;
 * the same pair under `streets` removes street j between avenues i and i+1.
 */
const GAPS = {
  avenues: [
    [4, 16], [7, 8], [11, 25], [13, 18], [1, 10], [2, 4], [14, 7], [10, 13], [5, 26], [13, 2],
    // South of the river mouth the coastal road replaces avenue −236.
    [2, 23], [2, 24], [2, 25], [2, 26], [2, 27], [2, 28], [2, 29],
  ],
  streets: [[21, 7], [12, 13], [3, 9], [24, 4], [16, 13], [27, 1], [5, 3], [11, 7], [25, 13], [9, 14]],
} as const;

// ─── Water ───────────────────────────────────────────────────────────────────────────────

const RIVER_CONTROL: readonly MapPoint[] = [
  pt(890, 22), pt(770, 78), pt(660, 122), pt(565, 162), pt(480, 205), pt(400, 255), pt(322, 315), pt(250, 382),
  pt(180, 446), pt(105, 497), pt(20, 548), pt(-70, 598), pt(-160, 652), pt(-236, 712), pt(-290, 765), pt(-334, 812),
];

const COAST_CONTROL: readonly MapPoint[] = [
  pt(-480, 532), pt(-430, 590), pt(-380, 640), pt(-338, 700), pt(-306, 770), pt(-282, 845), pt(-262, 925),
  pt(-246, 1005), pt(-216, 1085), pt(-176, 1165), pt(-146, 1245), pt(-128, 1350),
];

const HIGHWAY_CONTROL: readonly MapPoint[] = [
  pt(712, -1130), pt(712, -700), pt(716, -300), pt(722, 60), pt(716, 300), pt(706, 600), pt(708, 900), pt(716, 1350),
];

const COASTAL_ROAD_CONTROL: readonly MapPoint[] = [
  pt(-236, 800), pt(-226, 880), pt(-206, 960), pt(-180, 1040), pt(-150, 1120), pt(-118, 1200), pt(-94, 1290), pt(-84, 1350),
];

/** The old road: a straight diagonal through grid corners, from Bridge St. to North Park. */
const OLD_ROAD: readonly MapPoint[] = [pt(25, 240), pt(590, -325)];

// ─── Generation ──────────────────────────────────────────────────────────────────────────

function lineKind(line: GridLine): TownRoadKind {
  return line.major ? 'major' : 'minor';
}

function inCellArea(i: number, j: number): CellArea | undefined {
  return CELL_AREAS.find((area) => i >= area.avenues[0] && i < area.avenues[1] && j >= area.streets[0] && j < area.streets[1]);
}

function isGap(list: readonly (readonly [number, number])[], a: number, b: number): boolean {
  return list.some(([x, y]) => x === a && y === b);
}

/** Is this grid segment inside an area (an interior road of a park, school…)? */
function interiorToArea(kind: 'avenue' | 'street', line: number, between: number): boolean {
  return CELL_AREAS.some((area) =>
    kind === 'avenue'
      ? line > area.avenues[0] && line < area.avenues[1] && between >= area.streets[0] && between < area.streets[1]
      : line > area.streets[0] && line < area.streets[1] && between >= area.avenues[0] && between < area.avenues[1],
  );
}

interface Water {
  readonly river: readonly MapPoint[];
  readonly sea: readonly MapPoint[];
  readonly seaBounds: MapRect;
  readonly coast: readonly MapPoint[];
}

/**
 * A straight segment cut to its dry parts: minor roads stop at the river bank, every road stops
 * at the sea, and major roads cross the river on bridges.
 */
function dryRuns(a: MapPoint, b: MapPoint, kind: TownRoadKind, water: Water): readonly (readonly MapPoint[])[] {
  const nearSea = rectsOverlap(boundsOf([a, b]), water.seaBounds);
  const nearRiver = kind === 'minor' && segmentToPolyline(a, b, water.river) < RIVER_WIDTH / 2 + 3;
  if (!nearSea && !nearRiver) return [[a, b]];
  const samples = samplePolyline([a, b], 2);
  const runs: MapPoint[][] = [];
  let current: MapPoint[] | null = null;
  for (const sample of samples) {
    const wet = inPolygon(sample, water.sea) || (kind === 'minor' && distanceToPolyline(water.river, sample) < RIVER_WIDTH / 2 + 3);
    if (wet) current = null;
    else if (current) current.push(sample);
    else {
      current = [sample];
      runs.push(current);
    }
  }
  return runs
    .filter((run) => run.length > 5)
    .map((run) => [run[0] ?? a, run.at(-1) ?? b]);
}

/** Grid roads as runs: each avenue and street, broken at gaps, areas and water. */
function gridRoads(water: Water): TownRoad[] {
  const roads: TownRoad[] = [];
  const north = TOWN_EXTENT.y0;
  const south = TOWN_EXTENT.y1;
  const west = TOWN_EXTENT.x0;
  const east = TOWN_EXTENT.x1;
  const push = (kind: TownRoadKind, from: MapPoint, to: MapPoint): void => {
    for (const run of dryRuns(from, to, kind, water)) roads.push({ kind, points: run });
  };

  AVENUES.forEach((avenue, i) => {
    const kind = lineKind(avenue);
    const stops = [north, ...STREETS.map((street) => street.at), south];
    for (let j = 0; j < stops.length - 1; j += 1) {
      const between = j - 1; // the street index this segment starts at (−1 = above the first street)
      if (isGap(GAPS.avenues, i, between) || interiorToArea('avenue', i, between)) continue;
      push(kind, pt(avenue.at, stops[j] ?? 0), pt(avenue.at, stops[j + 1] ?? 0));
    }
  });

  STREETS.forEach((street, j) => {
    const kind = lineKind(street);
    const stops = [west, ...AVENUES.map((avenue) => avenue.at), east];
    for (let i = 0; i < stops.length - 1; i += 1) {
      const between = i - 1;
      if (isGap(GAPS.streets, j, between) || interiorToArea('street', j, between)) continue;
      push(kind, pt(stops[i] ?? 0, street.at), pt(stops[i + 1] ?? 0, street.at));
    }
  });

  return mergeRuns(roads);
}

/** Joins consecutive collinear runs of the same kind (fewer, longer subpaths to draw). */
function mergeRuns(roads: readonly TownRoad[]): TownRoad[] {
  const merged: TownRoad[] = [];
  for (const road of roads) {
    const previous = merged.at(-1);
    const end = previous?.points.at(-1);
    const start = road.points[0];
    const vertical = (points: readonly MapPoint[]): boolean => (points[0]?.x ?? 0) === (points.at(-1)?.x ?? 1);
    if (
      previous &&
      end &&
      start &&
      previous.kind === road.kind &&
      Math.abs(end.x - start.x) < 1e-6 &&
      Math.abs(end.y - start.y) < 1e-6 &&
      vertical(previous.points) === vertical(road.points)
    ) {
      merged[merged.length - 1] = { kind: road.kind, points: [...previous.points, ...road.points.slice(1)] };
    } else merged.push(road);
  }
  return merged;
}

/** A road along the river's north bank, `offset` px from its centreline. */
function riversideDrive(river: readonly MapPoint[], offset: number): readonly MapPoint[] {
  const sampled = samplePolyline(river, 14);
  const shifted: MapPoint[] = [];
  for (let index = 0; index < sampled.length; index += 1) {
    const a = sampled[Math.max(index - 1, 0)];
    const b = sampled[Math.min(index + 1, sampled.length - 1)];
    const p = sampled[index];
    if (!a || !b || !p) continue;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;
    // The river flows west-southwest, so (−dy, dx) points at its north-west bank.
    shifted.push(pt(p.x - offset * dy, p.y + offset * dx));
  }
  return shifted.filter((p) => p.x > -190 && p.x < 800);
}

function rect(x0: number, y0: number, x1: number, y1: number): readonly MapPoint[] {
  return [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 28): readonly MapPoint[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return pt(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
  });
}

function cellRect(area: CellArea): readonly MapPoint[] {
  const x0 = AVENUES[area.avenues[0]]?.at ?? 0;
  const x1 = AVENUES[area.avenues[1]]?.at ?? 0;
  const y0 = STREETS[area.streets[0]]?.at ?? 0;
  const y1 = STREETS[area.streets[1]]?.at ?? 0;
  return rect(x0, y0, x1, y1);
}

/** A road segment buildings must keep clear of, with its reach (half width plus a gap). */
interface Clearance {
  readonly a: MapPoint;
  readonly b: MapPoint;
  readonly bounds: MapRect;
  readonly reach: number;
}

function clearances(roads: readonly TownRoad[]): readonly Clearance[] {
  return roads.flatMap((road) => {
    const reach = ROAD_WIDTH[road.kind] / 2 + 2.5;
    return road.points.slice(1).map((b, index) => {
      const a = road.points[index] ?? b;
      return { a, b, bounds: growRect(boundsOf([a, b]), reach), reach };
    });
  });
}

/** Distance between a rectangle and segment ab (0 when they touch). */
function rectToSegment(box: MapRect, a: MapPoint, b: MapPoint): number {
  const inside = (p: MapPoint): boolean => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1;
  const corners = [pt(box.x0, box.y0), pt(box.x1, box.y0), pt(box.x1, box.y1), pt(box.x0, box.y1)];
  if (inside(a) || inside(b) || corners.some((corner, at) => segmentsCross(a, b, corner, corners[(at + 1) % 4] ?? corner))) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const end of [a, b]) {
    const dx = Math.max(box.x0 - end.x, 0, end.x - box.x1);
    const dy = Math.max(box.y0 - end.y, 0, end.y - box.y1);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  for (const corner of corners) best = Math.min(best, segmentProjection(corner, a, b).distance);
  return best;
}

/** Does the box come within reach of any of the clearances? */
function blocked(box: MapRect, list: readonly Clearance[]): boolean {
  return list.some((clear) => rectsOverlap(clear.bounds, box) && rectToSegment(box, clear.a, clear.b) < clear.reach);
}

/** Seeded building footprints for every ordinary block, kept clear of water and odd roads. */
function blockBuildings(water: Water, obstacles: readonly TownRoad[]): TownBuilding[] {
  const buildings: TownBuilding[] = [];
  const half = (line: GridLine): number => ROAD_WIDTH[lineKind(line)] / 2 + 3;
  // Keep clear of the curved and diagonal roads, the river (and its bank) and the beach.
  const clear = [
    ...clearances(obstacles),
    ...clearances([{ kind: 'minor', points: water.river }]).map((segment) => ({ ...segment, reach: RIVER_WIDTH / 2 + 4, bounds: growRect(segment.bounds, RIVER_WIDTH / 2) })),
    ...clearances([{ kind: 'minor', points: water.coast }]).map((segment) => ({ ...segment, reach: 16, bounds: growRect(segment.bounds, 16) })),
  ];
  for (let i = 0; i < AVENUES.length - 1; i += 1) {
    for (let j = 0; j < STREETS.length - 1; j += 1) {
      if (inCellArea(i, j)) continue;
      const west = AVENUES[i];
      const east = AVENUES[i + 1];
      const north = STREETS[j];
      const south = STREETS[j + 1];
      if (!west || !east || !north || !south) continue;
      const x0 = west.at + half(west);
      const x1 = east.at - half(east);
      const y0 = north.at + half(north);
      const y1 = south.at - half(south);
      const random = seededRandom(i * 7919 + j * 104729 + 17);
      const rows = y1 - y0 > 46 ? 2 : 1;
      const rowHeight = (y1 - y0 - (rows - 1) * 4) / rows;
      for (let row = 0; row < rows; row += 1) {
        const top = y0 + row * (rowHeight + 4);
        const lotWidth = 15 + random() * 9;
        const lots = Math.max(1, Math.round((x1 - x0) / lotWidth));
        const width = (x1 - x0) / lots;
        for (let lot = 0; lot < lots; lot += 1) {
          if (random() < 0.12) continue;
          const inset = 1 + random() * 2;
          const depth = rowHeight * (rows === 2 ? 0.6 + random() * 0.35 : 0.7 + random() * 0.3);
          const bx = x0 + lot * width + inset;
          const bw = width - inset * 2;
          // Row 0 faces the street to the north, row 1 the street to the south.
          const by = row === 0 ? top + inset * 0.5 : top + rowHeight - depth - inset * 0.5;
          const bh = depth;
          if (bw < 5 || bh < 5) continue;
          const box = { x0: bx, y0: by, x1: bx + bw, y1: by + bh };
          if (blocked(box, clear)) continue;
          if (rectsOverlap(box, water.seaBounds) && [pt(box.x0, box.y0), pt(box.x1, box.y0), pt(box.x1, box.y1), pt(box.x0, box.y1)].some((corner) => inPolygon(corner, water.sea))) continue;
          // Whole pixels: indistinguishable on screen, and a quarter less markup per footprint.
          const x = Math.round(bx);
          const y = Math.round(by);
          buildings.push({ x, y, w: Math.max(Math.round(bx + bw) - x, 4), h: Math.max(Math.round(by + bh) - y, 4) });
        }
      }
    }
  }
  return buildings;
}

/** Text angle that keeps a label upright along a road with this heading. */
function readableAngle(heading: number): number {
  const angle = (((heading - 90) % 360) + 360) % 360;
  return angle > 90 && angle < 270 ? angle - 180 : angle > 180 ? angle - 360 : angle;
}

function labelAlong(text: string, points: readonly MapPoint[], fraction: number, kind: TownLabelKind): TownLabel {
  const pose = poseAt(points, fraction);
  return { text, x: Math.round(pose.x), y: Math.round(pose.y), angle: Math.round(readableAngle(pose.heading)), kind };
}

/**
 * The traffic layer for the major roads and the highway, in ~85 px stretches: mostly free, some
 * slow, and a jam around the junction where the field report (3.6) is filed.
 */
function trafficFor(roads: readonly TownRoad[]): TownTraffic[] {
  const traffic: TownTraffic[] = [];
  const jam = pt(105, 720);
  roads.forEach((road, index) => {
    if (road.kind === 'minor') return;
    const stretches = Math.max(1, Math.round(polylineLength(road.points) / 85));
    for (let stretch = 0; stretch < stretches; stretch += 1) {
      const middle = poseAt(road.points, (stretch + 0.5) / stretches);
      const near = Math.hypot(middle.x - jam.x, middle.y - jam.y);
      const random = seededRandom(index * 131 + stretch * 977 + 5)();
      const level: TrafficLevel =
        near < 75 ? 'jam' : near < 150 ? 'slow' : random < 0.14 ? 'slow' : random < 0.19 && road.kind === 'major' ? 'jam' : 'free';
      traffic.push({ level, road: road.kind, points: slicePolyline(road.points, stretch / stretches, (stretch + 1) / stretches) });
    }
  });
  return traffic;
}

function buildTown(): Town {
  const river = smoothCurve(RIVER_CONTROL, 10);
  const coast = smoothCurve(COAST_CONTROL, 10);
  const sea: readonly MapPoint[] = [...coast, pt(-520, 1360), pt(-520, 520)];
  const water: Water = { river, sea, seaBounds: boundsOf(sea), coast };

  const highway = smoothCurve(HIGHWAY_CONTROL, 10);
  const coastal = smoothCurve(COASTAL_ROAD_CONTROL, 8);
  const drive = riversideDrive(river, 54);
  const curved: TownRoad[] = [
    { kind: 'highway', points: highway },
    { kind: 'major', points: coastal },
    { kind: 'minor', points: drive },
    { kind: 'major', points: OLD_ROAD },
  ];
  const roads = [...gridRoads(water), ...curved];

  const areas: TownArea[] = CELL_AREAS.map((area) => ({ kind: area.kind, points: cellRect(area) }));
  areas.push({ kind: 'pitch', points: ellipse(470, 760, 36, 22) });
  areas.push({ kind: 'pond', points: ellipse(548, -470, 26, 18) });
  areas.push({ kind: 'pond', points: ellipse(229, -42, 7, 7, 16) });

  const landmarks: readonly (readonly MapPoint[])[] = [
    // Town Hospital: an H-shaped block.
    [pt(118, 8), pt(134, 8), pt(134, 28), pt(160, 28), pt(160, 8), pt(176, 8), pt(176, 64), pt(160, 64), pt(160, 44), pt(134, 44), pt(134, 64), pt(118, 64)],
    // Public Market: a long hall with an annex.
    [pt(278, 86), pt(334, 86), pt(334, 128), pt(318, 128), pt(318, 148), pt(278, 148)],
    // Central School: an L-shaped wing beside the track.
    [pt(520, 730), pt(578, 730), pt(578, 790), pt(560, 790), pt(560, 746), pt(520, 746)],
    // Town hall on the plaza's north side.
    [pt(203, -70), pt(255, -70), pt(255, -58), pt(203, -58)],
  ];

  const paths: readonly (readonly MapPoint[])[] = [
    smoothCurve([pt(196, 552), pt(240, 520), pt(262, 470), pt(306, 452), pt(338, 410)], 6),
    smoothCurve([pt(296, 552), pt(286, 500), pt(240, 470)], 6),
    ellipse(548, -470, 44, 34, 32).concat([pt(592, -470)]),
    [pt(229, -76), pt(229, -6)],
    [pt(194, -41), pt(264, -41)],
  ];

  const obstacles = curved;
  const buildings = blockBuildings(water, obstacles);

  const labels: TownLabel[] = [
    // Names follow the research sample addresses: the incident (3.2, 3.3) is on Sample St.,
    // the citizen report (2.6) by Sample Rd., the delivery (1.5) in Brgy. Sample.
    { text: 'Example Ave.', x: 105, y: 612, angle: -90, kind: 'street' },
    { text: 'Example Ave.', x: 105, y: -420, angle: -90, kind: 'street' },
    { text: 'Sample St.', x: 345, y: 632, angle: -90, kind: 'street' },
    { text: 'Sample St.', x: 345, y: -455, angle: -90, kind: 'street' },
    { text: 'Plaza Ave.', x: 268, y: 690, angle: -90, kind: 'street' },
    { text: 'Plaza Ave.', x: 268, y: -210, angle: -90, kind: 'street' },
    { text: 'Bridge St.', x: 48, y: 400, angle: 0, kind: 'street' },
    { text: 'Bridge St.', x: 470, y: 400, angle: 0, kind: 'street' },
    { text: 'School St.', x: 300, y: 720, angle: 0, kind: 'street' },
    { text: 'Sample Rd.', x: 470, y: 75, angle: 0, kind: 'street' },
    { text: 'Hill St.', x: 300, y: -240, angle: 0, kind: 'street' },
    { text: 'Old Rd.', x: 465, y: -200, angle: -45, kind: 'street' },
    { text: 'Old Rd.', x: 62, y: 203, angle: -45, kind: 'street' },
    labelAlong('Riverside Dr.', drive, 0.42, 'street'),
    labelAlong('North Hwy.', highway, 0.3, 'street'),
    labelAlong('Coastal Rd.', coastal, 0.45, 'street'),
    labelAlong('Sample River', river, 0.33, 'water'),
    labelAlong('Sample River', river, 0.72, 'water'),
    { text: 'Example Bay', x: -322, y: 1000, angle: 0, kind: 'water' },
    { text: 'BRGY. EXAMPLE', x: 222, y: 232, angle: 0, kind: 'district' },
    { text: 'BRGY. SAMPLE', x: 470, y: 600, angle: 0, kind: 'district' },
    { text: 'BRGY. NORTH', x: 300, y: -620, angle: 0, kind: 'district' },
    { text: 'BRGY. COAST', x: -120, y: 860, angle: 0, kind: 'district' },
  ];

  const pois: readonly TownPoi[] = [
    { kind: 'hospital', x: 147, y: 36, label: 'Town Hospital' },
    { kind: 'market', x: 306, y: 117, label: 'Public Market' },
    { kind: 'plaza', x: 229, y: -26, label: 'Town Plaza' },
    { kind: 'school', x: 470, y: 760, label: 'Central School' },
    { kind: 'park', x: 286, y: 512, label: 'Riverside Park' },
    { kind: 'park', x: 548, y: -404, label: 'North Park' },
    { kind: 'fuel', x: 686, y: 352, label: 'Gas Station' },
  ];

  return {
    extent: TOWN_EXTENT,
    roads,
    paths,
    areas,
    buildings,
    landmarks,
    river,
    sea,
    coast,
    traffic: trafficFor(roads),
    labels,
    pois,
  };
}

/** The town, built once (deterministic: same input, same output). */
export const TOWN: Town = buildTown();
