import { createElement, isValidElement, type ReactElement, type SVGProps } from 'react';
import type { LucideIcon, LucideIconData, LucideIconNode, LucideProps } from 'lucide-react';

/*
 * Lucide glyphs as plain <svg> elements.
 *
 * lucide-react 1.59 renders every icon through its `Icon` module, which is 'use client'. So
 * `<House />` in a Server Component is a client reference: React hydrates it as a client
 * component and the icon data is serialised into the RSC payload as a prop. Most glyphs on this
 * site are static (replica screens, site icons), so they are drawn here as ordinary SVG instead:
 * no client component, nothing to hydrate. (Next still lists lucide's small Icon module in a
 * route's client chunks while server code imports lucide-react, since it collects every
 * reachable 'use client' module, but nothing references or runs it.)
 *
 * The output matches lucide-react's own markup attribute for attribute: the same defaults
 * (xmlns, 24×24, viewBox, fill none, stroke currentColor, stroke-width 2, round caps and joins),
 * the same class names ("lucide lucide-<name> lucide-<alias> …") and the same aria-hidden rule
 * (tests/unit/glyphs.test.ts compares the two). It works in Server Components and client
 * islands alike, and keeps the `icon: LucideIcon` API: components still receive lucide icons.
 *
 * How the icon data is found: each lucide icon is `forwardRef(render)` and `render` returns
 * `createElement(Icon, { icon: iconData, … })` (lucide-react's createLucideIcon). Calling
 * `render` once returns that element without rendering it, so its `icon` prop is the data;
 * the result is cached per icon.
 */

/** The SVG props lucide's Icon accepts (minus ref, children and nonScalingStroke, unused here). */
export type LucideSvgProps = Omit<LucideProps, 'ref' | 'children' | 'nonScalingStroke'>;

interface ForwardRefIcon {
  readonly render?: (props: Readonly<Record<string, unknown>>, ref: null) => unknown;
  readonly displayName?: string;
}

interface CachedIcon {
  readonly data: LucideIconData;
  /** "lucide", "lucide-<name>", then "lucide-<alias>" for each alias. */
  readonly classNames: readonly string[];
}

/** lucide's defaults (shared/src/build/defaultAttributes): a 24×24 box, stroke width 2. */
const DEFAULT_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

const cache = new WeakMap<LucideIcon, CachedIcon>();

function isIconData(value: unknown): value is LucideIconData {
  return typeof value === 'object' && value !== null && Array.isArray((value as { node?: unknown }).node);
}

/** lucide's mergeClasses: non-blank, first occurrence only, joined by spaces. */
function mergeClasses(...classes: readonly (string | undefined)[]): string {
  return classes
    .filter((name, index, all): name is string => typeof name === 'string' && name.trim() !== '' && all.indexOf(name) === index)
    .join(' ')
    .trim();
}

function nodeElement([tag, attributes, children]: LucideIconNode): ReactElement {
  return children && children.length > 0
    ? createElement(tag, attributes, ...children.map(nodeElement))
    : createElement(tag, attributes);
}

function cached(icon: LucideIcon): CachedIcon {
  const hit = cache.get(icon);
  if (hit) return hit;
  const { render, displayName } = icon as unknown as ForwardRefIcon;
  const element = typeof render === 'function' ? render({}, null) : null;
  const data: unknown = isValidElement(element) ? (element.props as { readonly icon?: unknown }).icon : undefined;
  if (!isIconData(data)) {
    throw new Error(`lucideIconData(): ${displayName ?? 'this value'} is not a lucide-react icon (expected forwardRef(render) with an icon prop)`);
  }
  const aliases = (data.aliases ?? []).filter((alias) => typeof alias === 'string' && alias.trim() !== '').map((alias) => `lucide-${alias}`);
  const entry: CachedIcon = { data, classNames: ['lucide', ...(data.name ? [`lucide-${data.name}`] : []), ...aliases] };
  cache.set(icon, entry);
  return entry;
}

/** The data a lucide icon is drawn from (name, viewBox size, path nodes, aliases). Cached per icon. */
export function lucideIconData(icon: LucideIcon): LucideIconData {
  return cached(icon).data;
}

/** lucide's accessible-name test: any aria-*, role or title attribute (then no aria-hidden). */
function hasA11yProp(props: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(props).some((name) => name.startsWith('aria-') || name === 'role' || name === 'title');
}

/**
 * A lucide icon as a plain <svg> element, identical to what lucide-react renders for the same
 * props (size, width, height, color → stroke, strokeWidth, absoluteStrokeWidth, className, any
 * other SVG attribute such as fill, style, role or aria-label). Decorative by default: without an
 * aria-*, role or title prop it gets aria-hidden="true", as in lucide.
 */
export function renderLucideSvg(icon: LucideIcon, props: LucideSvgProps = {}): ReactElement<SVGProps<SVGSVGElement>> {
  const { data, classNames } = cached(icon);
  const { color, size, width, height, strokeWidth, absoluteStrokeWidth, className, ...rest } = props;
  const viewBoxWidth = data.size ?? data.width ?? DEFAULT_SIZE;
  const viewBoxHeight = data.size ?? data.height ?? DEFAULT_SIZE;
  const finalWidth = width ?? size ?? DEFAULT_SIZE;
  const finalHeight = height ?? size ?? DEFAULT_SIZE;
  const stroke = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const classes = mergeClasses(...classNames, ...(className?.split(' ') ?? []));
  // Key order is lucide's (buildLucideIconNode), so the markup matches attribute for attribute.
  const attributes: Record<string, unknown> = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: finalWidth,
    height: finalHeight,
    viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
    fill: 'none',
    stroke: color || 'currentColor',
    strokeWidth: absoluteStrokeWidth ? (Number(stroke) * Number(viewBoxWidth)) / Number(finalWidth) : stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (classes) attributes.className = classes;
  if (!hasA11yProp(rest)) attributes['aria-hidden'] = 'true';
  Object.assign(attributes, rest);
  // Fresh path elements per glyph: shared element objects would make the RSC payload refer back
  // to the first copy by a long tree path, which compresses worse than the repeated literal.
  return createElement('svg', attributes as SVGProps<SVGSVGElement>, ...data.node.map(nodeElement));
}
