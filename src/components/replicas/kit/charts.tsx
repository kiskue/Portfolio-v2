import './charts.css';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ms, px, rStyle, rToken } from './tokens';
import type { RBoxProps, RColor } from './types';

/*
 * Replica charts: deterministic, hook-free SVG and spans with tabular labels. Lines are drawn in
 * an SVG stretched to the plot (non-scaling strokes keep their width), while dots and labels are
 * spans placed by percentage, so the chart fills any card width without distorting.
 */

/** Width of the drawing space the line chart's x positions use (0..1000). */
const PLOT_UNITS = 1000;

/** One decimal, no "-0". */
function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** A fraction (0–1) as a CSS percentage with one decimal ("58.1%"). */
function percent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

/** A label's number when it is a plain amount ("₱3,200" → 3200, "2.5k" → null). */
export function parseChartValue(label: string): number | null {
  const cleaned = label.replace(/[₱$€£¥,\s%]/g, '');
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
}

/**
 * The y range of a line chart: explicit yMin/yMax, else the first and last y-labels when both
 * read as numbers (labels run top to bottom), else the data's range with 8% headroom.
 */
export function lineChartRange(
  values: readonly number[],
  yLabels: readonly string[],
  yMin?: number,
  yMax?: number,
): { readonly min: number; readonly max: number } {
  const top = yLabels.length >= 2 ? parseChartValue(yLabels[0] ?? '') : null;
  const bottom = yLabels.length >= 2 ? parseChartValue(yLabels.at(-1) ?? '') : null;
  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const dataMax = values.length > 0 ? Math.max(...values) : 1;
  const pad = (dataMax - dataMin || Math.abs(dataMax) || 1) * 0.08;
  const min = yMin ?? (top !== null && bottom !== null && top > bottom ? bottom : dataMin - pad);
  const max = yMax ?? (top !== null && bottom !== null && top > bottom ? top : dataMax + pad);
  return max > min ? { min, max } : { min, max: min + 1 };
}

/**
 * Where an x-label sits in the combined series (history, then projection): "6" is day 6 of the
 * history (index 5), "+7" is seven points past the last history point. Null for other labels.
 */
export function lineChartXIndex(label: string, historyLength: number): number | null {
  const ahead = /^\+(\d+)$/.exec(label.trim());
  if (ahead) return historyLength - 1 + Number(ahead[1]);
  const day = /^(\d+)$/.exec(label.trim());
  return day ? Number(day[1]) - 1 : null;
}

export interface RLineChartProps extends RBoxProps {
  /** Daily values drawn as a solid line with dots. */
  readonly history: readonly number[];
  /** Projected values continuing dashed from the last history point. */
  readonly projected?: readonly number[];
  readonly color: RColor;
  readonly projColor: RColor;
  /** Plot height in px (1.7 uses 180). */
  readonly height: number;
  /** Y-axis labels from top to bottom, e.g. ["₱2,100", "₱1,750", "₱1,400"]. One gridline each. */
  readonly yLabels: readonly string[];
  /** X-axis labels from left to right, e.g. ["1", "6", "11", "16", "+1", "+7", "+14"]. */
  readonly xLabels: readonly string[];
  /** Value at the bottom gridline (default: read from the last y-label, else from the data). */
  readonly yMin?: number;
  /** Value at the top gridline (default: read from the first y-label, else from the data). */
  readonly yMax?: number;
  /**
   * Series index of each x-label. Default: read from the labels ("6" is day 6, "+7" seven points
   * past the last day) when every label lands on the series, else spread evenly.
   */
  readonly xLabelAt?: readonly number[];
  /** Dots on every point (default true, 2.5 px radius as in the app). */
  readonly dots?: boolean;
  /** Width of the y-label column in px (default 46). */
  readonly labelWidth?: number;
  readonly gridColor?: RColor;
  readonly axisColor?: RColor;
  readonly labelColor?: RColor;
  /** Draw the lines in from the left while active (poster: fully drawn). */
  readonly reveal?: { readonly startMs: number; readonly durationMs: number };
}

interface PlotPoint {
  /** Fraction of the plot width (0–1). */
  readonly x: number;
  /** px from the top of the plot. */
  readonly y: number;
}

function polyline(points: readonly PlotPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round1(point.x * PLOT_UNITS)} ${round1(point.y)}`).join(' ');
}

/** The SME sales forecast line chart (1.7): history with dots, a dashed projection, gridlines and labels. */
export function RLineChart({
  history,
  projected = [],
  color,
  projColor,
  height,
  yLabels,
  xLabels,
  yMin,
  yMax,
  xLabelAt,
  dots = true,
  labelWidth = 46,
  gridColor,
  axisColor,
  labelColor,
  reveal,
  className,
  style,
}: RLineChartProps): ReactNode {
  const total = history.length + projected.length;
  const range = lineChartRange([...history, ...projected], yLabels, yMin, yMax);
  const xOf = (index: number): number => (total <= 1 ? 0.5 : index / (total - 1));
  const yOf = (value: number): number => ((range.max - value) / (range.max - range.min)) * height;
  const past = history.map((value, index) => ({ x: xOf(index), y: yOf(value) }));
  const bridge = past.at(-1);
  const ahead = projected.map((value, index) => ({ x: xOf(history.length + index), y: yOf(value) }));
  const future = bridge && ahead.length > 0 ? [bridge, ...ahead] : ahead;
  const rules = yLabels.length > 1 ? yLabels.map((_, index) => (index / (yLabels.length - 1)) * height) : [];
  // Labels read as days only when every one of them lands on the series; otherwise spread them.
  const parsed = xLabels.map((label) => lineChartXIndex(label, history.length));
  const byDay = parsed.every((value) => value !== null && value >= 0 && value <= total - 1);
  const xAt = xLabels.map((_, index) => {
    const at = xLabelAt?.[index] ?? (byDay ? parsed[index] : null);
    return at === null || at === undefined ? (xLabels.length <= 1 ? 0.5 : index / (xLabels.length - 1)) : xOf(at);
  });

  return (
    <div
      className={cn('rx-chart', 'rx-line', className)}
      data-chart="line"
      data-reveal={reveal ? '' : undefined}
      style={rStyle(
        {
          '--rx-chart-label-w': px(labelWidth),
          '--rx-chart-h': px(height),
          '--rx-chart-c': color,
          '--rx-chart-pc': projColor,
          '--rx-chart-grid': gridColor ?? rToken.borderFaint,
          '--rx-chart-axis': axisColor ?? rToken.border,
          '--rx-chart-label': labelColor ?? rToken.ink3,
          '--rx-chart-rs': reveal ? ms(reveal.startMs) : undefined,
          '--rx-chart-rd': reveal ? ms(reveal.durationMs) : undefined,
        },
        style,
      )}
    >
      <div className="rx-line__y">
        {yLabels.map((label, index) => (
          <span key={`${label}-${index}`} className="rx-line__ylabel" style={{ top: px(round1(rules[index] ?? 0)) }}>
            {label}
          </span>
        ))}
      </div>
      <div className="rx-line__plot">
        {rules.map((top, index) => (
          <span key={index} className="rx-line__rule" style={{ top: px(round1(top)) }} />
        ))}
        <span className="rx-line__axis" />
        <div className="rx-line__draw">
          <svg className="rx-line__svg" width="100%" height={height} viewBox={`0 0 ${PLOT_UNITS} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            {past.length > 1 ? <path d={polyline(past)} className="rx-line__history" vectorEffect="non-scaling-stroke" /> : null}
            {future.length > 1 ? <path d={polyline(future)} className="rx-line__projection" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {dots
            ? [...past.map((point) => ({ ...point, kind: 'history' })), ...ahead.map((point) => ({ ...point, kind: 'projection' }))].map(
                (point, index) => (
                  <span
                    key={index}
                    className="rx-line__dot"
                    data-kind={point.kind}
                    style={{ left: percent(point.x), top: px(round1(point.y)) }}
                  />
                ),
              )
            : null}
        </div>
      </div>
      <div className="rx-line__x">
        {xLabels.map((label, index) => (
          <span key={`${label}-${index}`} className="rx-line__xlabel" style={{ left: percent(xAt[index] ?? 0) }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Bar heights for value pairs: proportional to the largest value, at least 2 px (as in the app). */
export function barPairHeights(pairs: readonly (readonly [number, number])[], height: number): readonly (readonly [number, number])[] {
  const max = Math.max(1, ...pairs.flatMap(([a, b]) => [a, b]));
  const scale = (value: number): number => round1(Math.max(2, (Math.max(value, 0) / max) * height));
  return pairs.map(([a, b]) => [scale(a), scale(b)] as const);
}

export interface RBarPairsProps extends RBoxProps {
  /** One [first, second] pair per period, e.g. [sales, costs]. */
  readonly pairs: readonly (readonly [number, number])[];
  /** Colours for the first and second bar of each pair. */
  readonly colors: readonly [RColor, RColor];
  /** Plot height in px (default 120): the tallest bar. The SME dashboard card uses 80. */
  readonly height?: number;
  /** One label per pair. */
  readonly labels?: readonly string[];
  /** Bar width in px (default 10) and the gap inside a pair (default 6). */
  readonly barWidth?: number;
  readonly gap?: number;
  /** Width of each pair's slot in px (default: two bars, the gap and 16 px). */
  readonly slot?: number;
  readonly baselineColor?: RColor;
  readonly labelColor?: RColor;
  /** Grow the bars from the baseline while active (poster: full height). */
  readonly reveal?: { readonly startMs: number; readonly durationMs: number };
}

/**
 * Paired bars with rounded tops (the SME "Sales vs Costs" card, 1.1): fixed-width slots from the
 * left on a hairline baseline, labels under each pair, as the app's chart draws them.
 */
export function RBarPairs({
  pairs,
  colors,
  height = 120,
  labels,
  barWidth = 10,
  gap = 6,
  slot,
  baselineColor,
  labelColor,
  reveal,
  className,
  style,
}: RBarPairsProps): ReactNode {
  const slotWidth = slot ?? barWidth * 2 + gap + 16;
  const heights = barPairHeights(pairs, height);
  return (
    <div
      className={cn('rx-chart', 'rx-bars', className)}
      data-chart="bar-pairs"
      data-reveal={reveal ? '' : undefined}
      style={rStyle(
        {
          '--rx-bars-h': px(height),
          '--rx-bars-w': px(barWidth),
          '--rx-bars-gap': px(gap),
          '--rx-bars-slot': px(slotWidth),
          '--rx-bars-a': colors[0],
          '--rx-bars-b': colors[1],
          '--rx-bars-base': baselineColor ?? rToken.borderFaint,
          '--rx-chart-label': labelColor ?? rToken.ink3,
          '--rx-chart-rs': reveal ? ms(reveal.startMs) : undefined,
          '--rx-chart-rd': reveal ? ms(reveal.durationMs) : undefined,
        },
        style,
      )}
    >
      <div className="rx-bars__plot">
        <span className="rx-bars__base" style={{ width: px(pairs.length * slotWidth) }} />
        {heights.map(([first, second], index) => (
          <div key={index} className="rx-bars__pair">
            <span className="rx-bars__bar" data-series="a" style={{ height: px(first) }} />
            <span className="rx-bars__bar" data-series="b" style={{ height: px(second) }} />
          </div>
        ))}
      </div>
      {labels && labels.length > 0 ? (
        <div className="rx-bars__labels">
          {pairs.map((_, index) => (
            <span key={index} className="rx-bars__label">
              {labels[index] ?? ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
