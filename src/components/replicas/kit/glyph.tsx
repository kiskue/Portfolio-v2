import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { renderLucideSvg } from '@/lib/lucide-node';
import type { RColor } from './types';

export interface RGlyphProps {
  /** The lucide icon standing in for the app's Ionicon. */
  readonly icon: LucideIcon;
  /** Size in logical px (default 24). */
  readonly size?: number;
  /** Stroke width in px at 24 (default 2, lucide's). */
  readonly strokeWidth?: number;
  /** Stroke colour (default currentColor, i.e. the surrounding text colour). */
  readonly color?: RColor;
  /** Fill, e.g. 'currentColor' for a solid play triangle (default none). */
  readonly fill?: RColor;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * The one way a replica draws a glyph: a lucide icon as plain server-rendered SVG
 * (src/lib/lucide-node.ts). Rendering `<Bell />` from lucide-react directly would make every
 * glyph a client component that hydrates; tests/unit/glyphs.test.ts fails on any replica file
 * that does. Decorative (aria-hidden), like everything inside the inert phone canvas.
 */
export function RGlyph({ icon, size, strokeWidth, color, fill, className, style }: RGlyphProps): ReactNode {
  return renderLucideSvg(icon, {
    size,
    strokeWidth,
    color,
    className,
    ...(fill === undefined ? {} : { fill }),
    ...(style === undefined ? {} : { style }),
  });
}
