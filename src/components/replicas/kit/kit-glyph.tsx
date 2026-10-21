import type { LucideIcon, LucideIconNode } from 'lucide-react';
import { cloneElement, createElement, type ReactNode } from 'react';
import { lucideIconData, renderLucideSvg } from '@/lib/lucide-node';
import { RGlyph, type RGlyphProps } from './glyph';

/*
 * The kit's OWN glyphs: the ones a kit part draws from its `icon: LucideIcon` prop or a fixed
 * icon (RTabBar items, RAppBar, RButton, RPill, RIconChip, RGlassButton, fields, rows, toasts,
 * avatars, map pins). Internal: kit/index.ts does not export this module. Replica screens keep
 * drawing their own glyphs through RGlyph, which stays lucide's exact markup
 * (tests/unit/glyphs.test.ts).
 *
 * The <svg> is RGlyph's, attribute for attribute (class "lucide lucide-<name> …", size, stroke,
 * aria-hidden), so every `… > svg` rule still applies. Only its children differ: lucide's shapes
 * (path, circle, ellipse, line, rect, polyline, polygon) become ONE <path> with one subpath per
 * shape. Stroked shapes in one colour draw the same either way, and a glyph costs 2 elements
 * instead of 3–8: about 170 fewer in the Home trio (PLAN DOM budget).
 *
 * Merging is skipped, and RGlyph's markup used as is, when:
 * - `fill` is set: one path fills by the nonzero rule, so overlapping shapes of opposite
 *   direction would cut holes that separate shapes do not;
 * - the icon has a single shape (nothing to gain) or anything but plain geometry.
 * App CSS must therefore not FILL a multi-shape kit glyph (`fill: currentColor` on a `> svg`
 * rule); pass the kit part a single-shape icon, or draw that glyph with RGlyph in the screen.
 */

type Attrs = Readonly<Record<string, unknown>>;

/** The attributes each shape may carry (lucide also sets a React `key`). */
const GEOMETRY: Readonly<Record<string, readonly string[]>> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  polyline: ['points'],
  polygon: ['points'],
};

/** A number for path data: at most 4 decimals, no "-0". */
function n(value: number): string {
  const rounded = Math.round(value * 10_000) / 10_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function num(attrs: Attrs, name: string): number {
  const value = Number(attrs[name] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

/**
 * Path data that may follow another subpath. A path's leading relative moveto is absolute only
 * because it comes first, and its implicit pairs are relative linetos: "m15 18-6-6" becomes
 * "M15 18l-6-6", so it means the same after another shape.
 */
function standalone(d: string): string | null {
  const data = d.trim();
  if (!data.startsWith('m')) return data;
  let index = 1;
  const read = (): string | null => {
    while (index < data.length && /[\s,]/.test(data.charAt(index))) index += 1;
    NUMBER.lastIndex = index;
    const match = NUMBER.exec(data);
    if (!match) return null;
    index = NUMBER.lastIndex;
    return match[0];
  };
  const x = read();
  const y = read();
  if (x === null || y === null) return null;
  while (index < data.length && /[\s,]/.test(data.charAt(index))) index += 1;
  const rest = data.slice(index);
  return `M${x} ${y}${/^[+\-.\d]/.test(rest) ? 'l' : ''}${rest}`;
}

function pointsPath(points: string, close: boolean): string | null {
  const values = points.trim().split(/[\s,]+/).map(Number);
  if (values.length < 4 || values.length % 2 !== 0 || values.some((value) => !Number.isFinite(value))) return null;
  const pairs: string[] = [];
  for (let index = 0; index < values.length; index += 2) pairs.push(`${n(values[index] ?? 0)} ${n(values[index + 1] ?? 0)}`);
  return `M${pairs[0]}L${pairs.slice(1).join(' ')}${close ? 'z' : ''}`;
}

function rectPath(attrs: Attrs): string | null {
  const x = num(attrs, 'x');
  const y = num(attrs, 'y');
  const w = num(attrs, 'width');
  const h = num(attrs, 'height');
  if (w <= 0 || h <= 0) return null;
  // SVG's auto radii: a missing rx or ry takes the other's value; both clamp to half the side.
  const hasRx = attrs.rx !== undefined;
  const hasRy = attrs.ry !== undefined;
  const rx = Math.min(Math.max(hasRx ? num(attrs, 'rx') : hasRy ? num(attrs, 'ry') : 0, 0), w / 2);
  const ry = Math.min(Math.max(hasRy ? num(attrs, 'ry') : hasRx ? num(attrs, 'rx') : 0, 0), h / 2);
  if (rx === 0 || ry === 0) return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;
  const arc = `A${n(rx)} ${n(ry)} 0 0 1`;
  return (
    `M${n(x + rx)} ${n(y)}H${n(x + w - rx)}${arc} ${n(x + w)} ${n(y + ry)}V${n(y + h - ry)}` +
    `${arc} ${n(x + w - rx)} ${n(y + h)}H${n(x + rx)}${arc} ${n(x)} ${n(y + h - ry)}V${n(y + ry)}${arc} ${n(x + rx)} ${n(y)}z`
  );
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string | null {
  if (rx <= 0 || ry <= 0) return null;
  const arc = `a${n(rx)} ${n(ry)} 0 1 0`;
  return `M${n(cx - rx)} ${n(cy)}${arc} ${n(2 * rx)} 0${arc} ${n(-2 * rx)} 0z`;
}

/** One shape as path data, or null when it is not plain geometry this module can convert. */
function shapePath([tag, attrs, children]: LucideIconNode): string | null {
  const allowed = GEOMETRY[tag];
  if (!allowed || (children && children.length > 0)) return null;
  if (Object.keys(attrs).some((name) => name !== 'key' && !allowed.includes(name))) return null;
  switch (tag) {
    case 'path':
      return typeof attrs.d === 'string' ? standalone(attrs.d) : null;
    case 'circle':
      return ellipsePath(num(attrs, 'cx'), num(attrs, 'cy'), num(attrs, 'r'), num(attrs, 'r'));
    case 'ellipse': {
      const rx = attrs.rx === undefined ? num(attrs, 'ry') : num(attrs, 'rx');
      const ry = attrs.ry === undefined ? num(attrs, 'rx') : num(attrs, 'ry');
      return ellipsePath(num(attrs, 'cx'), num(attrs, 'cy'), rx, ry);
    }
    case 'line':
      return `M${n(num(attrs, 'x1'))} ${n(num(attrs, 'y1'))}L${n(num(attrs, 'x2'))} ${n(num(attrs, 'y2'))}`;
    case 'rect':
      return rectPath(attrs);
    case 'polyline':
    case 'polygon':
      return typeof attrs.points === 'string' ? pointsPath(attrs.points, tag === 'polygon') : null;
    default:
      return null;
  }
}

const merged = new WeakMap<LucideIcon, string | null>();

/**
 * All of an icon's shapes as one path's data (cached per icon), or null when the icon has a
 * single shape or one that cannot be converted exactly.
 */
export function mergedGlyphPath(icon: LucideIcon): string | null {
  const hit = merged.get(icon);
  if (hit !== undefined) return hit;
  const nodes = lucideIconData(icon).node;
  const parts = nodes.length > 1 ? nodes.map(shapePath) : [null];
  const d = parts.every((part): part is string => part !== null) ? parts.join('') : null;
  merged.set(icon, d);
  return d;
}

/** A kit part's glyph: RGlyph's <svg>, with lucide's shapes merged into one path when exact. */
export function KitGlyph(props: RGlyphProps): ReactNode {
  const { icon, size, strokeWidth, color, fill, className, style } = props;
  const d = fill === undefined || fill === 'none' ? mergedGlyphPath(icon) : null;
  if (d === null) return <RGlyph {...props} />;
  const svg = renderLucideSvg(icon, {
    size,
    strokeWidth,
    color,
    className,
    ...(fill === undefined ? {} : { fill }),
    ...(style === undefined ? {} : { style }),
  });
  return cloneElement(svg, undefined, createElement('path', { d }));
}
