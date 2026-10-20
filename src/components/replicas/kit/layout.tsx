import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { padding, px, rStyle } from './tokens';
import type { RBoxProps, RColor, RPad } from './types';

const FLEX_ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const FLEX_JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
} as const;

export interface RStackProps extends RBoxProps {
  /** Column (default) or row. */
  readonly dir?: 'col' | 'row';
  readonly gap?: number;
  readonly pad?: RPad;
  readonly align?: keyof typeof FLEX_ALIGN;
  readonly justify?: keyof typeof FLEX_JUSTIFY;
  readonly wrap?: boolean;
  /** Take the remaining space in the parent stack (true = flex 1). */
  readonly grow?: boolean | number;
  readonly bg?: RColor;
  readonly radius?: number;
  readonly children?: ReactNode;
}

/** A flex container in logical px: the layout glue between kit parts. */
export function RStack({
  dir = 'col',
  gap,
  pad,
  align,
  justify,
  wrap,
  grow,
  bg,
  radius,
  children,
  className,
  style,
}: RStackProps): ReactNode {
  const layout: CSSProperties = {
    gap: gap === undefined ? undefined : px(gap),
    padding: padding(pad),
    alignItems: align ? FLEX_ALIGN[align] : undefined,
    justifyContent: justify ? FLEX_JUSTIFY[justify] : undefined,
    flexWrap: wrap ? 'wrap' : undefined,
    flex: grow === undefined || grow === false ? undefined : grow === true ? 1 : grow,
    background: bg,
    borderRadius: radius === undefined ? undefined : px(radius),
    ...style,
  };
  return (
    <div className={cn('rx-stack', className)} data-dir={dir} style={rStyle({}, layout)}>
      {children}
    </div>
  );
}

export interface RTextProps extends RBoxProps {
  /** Font size in logical px (replicas keep device sizes; the 12px site minimum does not apply). */
  readonly size: number;
  readonly weight?: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  readonly color?: RColor;
  /** Line height in px. */
  readonly lh?: number;
  /** Letter spacing in px. */
  readonly tracking?: number;
  readonly upper?: boolean;
  readonly align?: 'start' | 'center' | 'end';
  /** Clamp to this many lines. */
  readonly lines?: number;
  /** One line with an ellipsis. */
  readonly nowrap?: boolean;
  readonly tabular?: boolean;
  readonly italic?: boolean;
  /** Inline instead of block. */
  readonly inline?: boolean;
  readonly children?: ReactNode;
}

/** Text at a fixed device size. Renders a span (block unless `inline`). */
export function RText({
  size,
  weight,
  color,
  lh,
  tracking,
  upper,
  align,
  lines,
  nowrap,
  tabular,
  italic,
  inline,
  children,
  className,
  style,
}: RTextProps): ReactNode {
  const type: CSSProperties = {
    fontSize: px(size),
    fontWeight: weight,
    color,
    lineHeight: lh === undefined ? undefined : px(lh),
    letterSpacing: tracking === undefined ? undefined : px(tracking),
    textAlign: align,
    fontStyle: italic ? 'italic' : undefined,
    ...style,
  };
  return (
    <span
      className={cn('rx-text', className)}
      data-upper={upper ? '' : undefined}
      data-tabular={tabular ? '' : undefined}
      data-nowrap={nowrap ? '' : undefined}
      data-clamp={lines ? '' : undefined}
      data-inline={inline ? '' : undefined}
      style={rStyle({ '--rx-text-lines': lines === undefined ? undefined : String(lines) }, type)}
    >
      {children}
    </span>
  );
}

export interface RDividerProps extends RBoxProps {
  readonly color?: RColor;
  readonly vertical?: boolean;
  readonly thickness?: number;
  /** Margin at both ends, in px. */
  readonly inset?: number;
}

/** A hairline (1px by default) in the faint border colour. */
export function RDivider({ color, vertical, thickness, inset, className, style }: RDividerProps): ReactNode {
  const margin = inset === undefined ? undefined : vertical ? `${px(inset)} 0` : `0 ${px(inset)}`;
  const size = thickness === undefined ? undefined : px(thickness);
  const box: CSSProperties = vertical ? { width: size } : { height: size };
  return (
    <span
      className={cn('rx-divider', className)}
      data-vertical={vertical ? '' : undefined}
      style={rStyle({}, { background: color, margin, ...box, ...style })}
    />
  );
}
