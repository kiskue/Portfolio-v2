import type { CSSProperties, ReactNode } from 'react';

/** Props every replica screen receives. `state` is one of its figure's states in figures.ts. */
export interface ReplicaProps {
  readonly state?: string;
}

/**
 * A replica screen (architecture D4): a hook-free Server Component that draws one figure on the
 * 390×844 canvas. ScreenView renders it inside RCanvas, so it never sets data-app or brand
 * variables itself.
 */
export type ReplicaComponent = (props: ReplicaProps) => ReactNode;

/** Escape hatches shared by kit components: an rx-/r- class from app CSS, or inline layout. */
export interface RBoxProps {
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Any CSS colour: a hex from the app's palette, or a replica token such as rBrand.primary. */
export type RColor = string;

/** Padding in logical px, as in CSS: all sides, [y, x], [top, x, bottom] or [top, right, bottom, left]. */
export type RPad =
  | number
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number];
