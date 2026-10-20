// STUB — owned by W6, replaced in wave 2a
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { MapPin, MapRouteKey } from './map-scenes';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

export type { MapPin, MapPinKind, MapRouteKey } from './map-scenes';

export interface RMapRoute {
  readonly path: MapRouteKey;
  readonly color: RColor;
  /** A wider stroke under the route (e.g. the SME sky route's #0369A1 casing). */
  readonly casing?: RColor;
  /** Stroke width in px. */
  readonly width: number;
  readonly dashed?: true;
  /** Recolour the route while active (the responder FAR → NEAR → ON SITE zones). */
  readonly recolorAt?: readonly { readonly atMs: number; readonly color: RColor }[];
}

export interface RMapPuck {
  readonly x: number;
  readonly y: number;
  /** Heading in degrees, 0 = north. */
  readonly heading: number;
  readonly color: RColor;
  readonly glyph: 'van' | 'arrow' | 'moto';
}

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
}

/** The fictional-town map (1.5, 2.5, 2.6, 3.1, 3.3, 3.6, 404). Stub: a neutral box of the right size. */
export function RMapCanvas({ theme, height, className, style }: RMapCanvasProps): ReactNode {
  return (
    <div
      className={cn('rx-map', className)}
      data-theme={theme}
      style={rStyle(
        {},
        {
          width: '100%',
          height: height === 'full' ? '100%' : px(height),
          background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
          ...style,
        },
      )}
    />
  );
}
