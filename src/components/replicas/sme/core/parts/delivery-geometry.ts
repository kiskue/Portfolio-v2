/*
 * Where things sit on the 1.5 delivery map, in one place.
 *
 * RMapCanvas (W6) draws the fictional town, the 'delivery' route and the pins in TOWN
 * coordinates (the 390×844 canvas space). This file ASSUMES the canvas frames the town like
 * `preserveAspectRatio="xMidYMid slice"`: scaled to cover its box and centred. The rider marker
 * and its glide are drawn by the screen (core.css, offset-path) in BOX coordinates, so after
 * W6's map lands, check that the route runs under RIDER_GLIDE and adjust these numbers (or
 * derive them from W6's exported route geometry) if its framing differs.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly w: number;
  readonly h: number;
}

const TOWN: Box = { w: 390, h: 844 };

/** The map band (collapsed): 16 px margins on the 390 canvas, 220 tall. */
export const BAND: Box = { w: 358, h: 220 };

/** The expanded map: full width, from under the 112 px header to the 34 px bottom inset. */
export const EXPANDED: Box = { w: 390, h: 698 };

/** A box point as a town point, under the assumed framing. */
export function toTown(box: Box, point: Point): Point {
  const scale = Math.max(box.w / TOWN.w, box.h / TOWN.h);
  const offset = { x: (box.w - TOWN.w * scale) / 2, y: (box.h - TOWN.h * scale) / 2 };
  return { x: Math.round(((point.x - offset.x) / scale) * 10) / 10, y: Math.round(((point.y - offset.y) / scale) * 10) / 10 };
}

/** A town point as a point in another box, under the same framing. */
export function fromTown(box: Box, point: Point): Point {
  const scale = Math.max(box.w / TOWN.w, box.h / TOWN.h);
  const offset = { x: (box.w - TOWN.w * scale) / 2, y: (box.h - TOWN.h * scale) / 2 };
  return { x: Math.round((point.x * scale + offset.x) * 10) / 10, y: Math.round((point.y * scale + offset.y) * 10) / 10 };
}

/**
 * The rider's last stretch of road in the band, oldest point first: the glide runs along it
 * (2.6 s while active) and the static poster sits at its end, heading east-north-east.
 */
export const RIDER_GLIDE: readonly Point[] = [
  { x: 36, y: 182 },
  { x: 88, y: 160 },
  { x: 134, y: 132 },
  { x: 162, y: 118 },
];

/** "Your address" in the band: up the road from the rider, left of the map controls. */
export const DESTINATION_IN_BAND: Point = { x: 232, y: 66 };

/** The glide as an SVG path for CSS offset-path (spaces between numbers, never dotted runs). */
export function glidePath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

/** The heading of the last glide segment in degrees (CSS rotate: 0 = east, clockwise). */
export function finalHeading(points: readonly Point[]): number {
  const end = points.at(-1);
  const before = points.at(-2);
  if (!end || !before) return 0;
  return Math.round((Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI);
}
