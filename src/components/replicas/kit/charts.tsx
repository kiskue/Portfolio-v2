// STUB — owned by W6, replaced in wave 2a
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

export interface RLineChartProps extends RBoxProps {
  /** Daily values drawn as a solid line with dots. */
  readonly history: readonly number[];
  /** Projected values continuing dashed from the last history point. */
  readonly projected?: readonly number[];
  readonly color: RColor;
  readonly projColor: RColor;
  /** Plot height in px (1.7 uses 180). */
  readonly height: number;
  /** Y-axis labels from top to bottom, e.g. ["₱2,100", "₱1,750", "₱1,400"]. */
  readonly yLabels: readonly string[];
  /** X-axis labels from left to right, e.g. ["1", "6", "11", "16", "+1", "+7", "+14"]. */
  readonly xLabels: readonly string[];
}

/** The SME sales forecast line chart (1.7). Stub: a neutral box of the right size. */
export function RLineChart({ height, className, style }: RLineChartProps): ReactNode {
  return (
    <div
      className={cn('rx-chart', className)}
      data-chart="line"
      style={rStyle({}, { width: '100%', height: px(height), background: '#e5e7eb', borderRadius: px(8), ...style })}
    />
  );
}

export interface RBarPairsProps extends RBoxProps {
  /** One [first, second] pair per period, e.g. [sales, costs]. */
  readonly pairs: readonly (readonly [number, number])[];
  /** Colours for the first and second bar of each pair. */
  readonly colors: readonly [RColor, RColor];
  /** Plot height in px (default 120). */
  readonly height?: number;
  /** One label per pair. */
  readonly labels?: readonly string[];
}

/** Paired bars with rounded tops (the SME "Sales vs Costs" card, 1.1). Stub: a neutral box. */
export function RBarPairs({ height = 120, className, style }: RBarPairsProps): ReactNode {
  return (
    <div
      className={cn('rx-chart', className)}
      data-chart="bar-pairs"
      style={rStyle({}, { width: '100%', height: px(height), background: '#e5e7eb', borderRadius: px(8), ...style })}
    />
  );
}
