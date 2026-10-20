import { Check, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RGlyph } from './glyph';
import { RRipple, RSpinner, type RRippleProps } from './motion';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

/*
 * Controls drawn with spans and divs only: replicas are inert pictures, so nothing here is a
 * <button> or <input> (a phone may sit inside a link).
 */

function radiusValue(radius: number | 'full' | undefined): string | undefined {
  if (radius === undefined) return undefined;
  return radius === 'full' ? '999px' : px(radius);
}

export interface RButtonProps extends RBoxProps {
  /** solid fill · outline · soft tint · danger (red) · glass (call screens). */
  readonly look: 'solid' | 'outline' | 'soft' | 'danger' | 'glass';
  readonly label: string;
  /** Fill / border / text hue (default the brand primary; danger defaults to #dc2626). */
  readonly color?: RColor;
  /** Text colour override (e.g. a navy label on a soft tint). */
  readonly textColor?: RColor;
  /** Border colour override (e.g. a red outline at 30%). */
  readonly borderColor?: RColor;
  /** Height in px (default 50; the apps use 44, 50, 52 and 56). */
  readonly h?: number;
  /** Corner radius in px (default 12) or 'full'. */
  readonly radius?: number | 'full';
  readonly full?: boolean;
  readonly icon?: LucideIcon;
  readonly iconSize?: number;
  /** A second line under the label, e.g. "3 items · ₱310.00". */
  readonly sublabel?: string;
  /** Label size in px (default 16). */
  readonly fontSize?: number;
  /** loading swaps the icon for a spinner; success turns the button green with a check. */
  readonly state?: 'idle' | 'loading' | 'success';
}

/** CTAs, ACCEPT / DECLINE, Checkout, Submit Report. */
export function RButton({
  look,
  label,
  color,
  textColor,
  borderColor,
  h,
  radius,
  full,
  icon,
  iconSize = 18,
  sublabel,
  fontSize,
  state = 'idle',
  className,
  style,
}: RButtonProps): ReactNode {
  const glyph =
    state === 'loading' ? (
      <RSpinner size={iconSize - 2} />
    ) : state === 'success' ? (
      <RGlyph icon={Check} size={iconSize} strokeWidth={2.5} />
    ) : icon ? (
      <RGlyph icon={icon} size={iconSize} />
    ) : null;
  return (
    <div
      className={cn('rx-btn', className)}
      data-look={look}
      data-state={state}
      data-full={full ? '' : undefined}
      style={rStyle(
        { '--rx-btn-c': color },
        {
          color: textColor,
          borderColor,
          height: h === undefined ? undefined : px(h),
          borderRadius: radiusValue(radius),
          fontSize: fontSize === undefined ? undefined : px(fontSize),
          ...style,
        },
      )}
    >
      {glyph}
      {sublabel ? (
        <span className="rx-btn__text">
          <span>{label}</span>
          <span className="rx-btn__sub">{sublabel}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

export interface RGlassButtonProps extends RBoxProps {
  readonly icon: LucideIcon;
  /** Circle diameter in px (the apps use 52, 56, 68 and 80). */
  readonly size: number;
  /** glass (white 10%, default), solid (filled with `color`) or tint (`color` at 20%). */
  readonly tone?: 'glass' | 'solid' | 'tint';
  /** Fill for solid, hue for tint (default red #ef4444). */
  readonly color?: RColor;
  readonly iconColor?: RColor;
  readonly iconSize?: number;
  /** A caption under the circle, e.g. "Answer". */
  readonly caption?: string;
  /** Expanding rings while active (ringing). */
  readonly ripple?: Omit<RRippleProps, 'size' | keyof RBoxProps>;
}

/** The round call controls: mute, speaker, flip, end, answer and decline. */
export function RGlassButton({
  icon,
  size,
  tone = 'glass',
  color,
  iconColor,
  iconSize,
  caption,
  ripple,
  className,
  style,
}: RGlassButtonProps): ReactNode {
  return (
    <div
      className={cn('rx-gbtn', className)}
      data-tone={tone}
      style={rStyle({ '--rx-gbtn-c': color, '--rx-gbtn-ink': iconColor, '--rx-gbtn-size': px(size) }, style)}
    >
      <span className="rx-gbtn__circle">
        {ripple ? <RRipple size={size} {...ripple} /> : null}
        <RGlyph icon={icon} size={iconSize ?? Math.round(size * 0.42)} />
      </span>
      {caption ? <span className="rx-gbtn__caption">{caption}</span> : null}
    </div>
  );
}

export interface RPillProps extends RBoxProps {
  readonly label: string;
  /** The pill's hue (default the brand primary). */
  readonly color?: RColor;
  /** tint (default) · solid · outline · glass (white on dark imagery). */
  readonly fill?: 'tint' | 'solid' | 'outline' | 'glass';
  /** Tint strength in percent (default 12). */
  readonly tint?: number;
  /** A 1px border in the hue at 28% (tint fill). */
  readonly border?: boolean;
  readonly icon?: LucideIcon;
  readonly iconSize?: number;
  /** xs 18px · sm 22px (default) · md 28px tall. */
  readonly size?: 'xs' | 'sm' | 'md';
  /** A leading dot in the hue; 'pulse' pulses while active (LIVE). */
  readonly dot?: true | 'pulse';
  readonly dotColor?: RColor;
  readonly textColor?: RColor;
  /** Background override (e.g. white behind an outline pill). */
  readonly bg?: RColor;
  readonly upper?: boolean;
  /** Corner radius in px (default fully rounded). */
  readonly radius?: number | 'full';
}

/** Status, zone, risk, filter and LIVE chips. */
export function RPill({
  label,
  color,
  fill = 'tint',
  tint,
  border,
  icon,
  iconSize,
  size = 'sm',
  dot,
  dotColor,
  textColor,
  bg,
  upper,
  radius,
  className,
  style,
}: RPillProps): ReactNode {
  const glyphSize = iconSize ?? (size === 'xs' ? 10 : size === 'md' ? 14 : 12);
  return (
    <span
      className={cn('rx-pill', className)}
      data-fill={fill}
      data-size={size}
      data-border={border ? '' : undefined}
      data-upper={upper ? '' : undefined}
      style={rStyle(
        {
          '--rx-pill-c': color,
          '--rx-pill-t': tint === undefined ? undefined : `${tint}%`,
          '--rx-pill-dot': dotColor,
        },
        { color: textColor, background: bg, borderRadius: radiusValue(radius), ...style },
      )}
    >
      {dot ? <span className="rx-pill__dot" data-pulse={dot === 'pulse' ? '' : undefined} /> : null}
      {icon ? <RGlyph icon={icon} size={glyphSize} /> : null}
      <span>{label}</span>
    </span>
  );
}

export interface RIconChipProps extends RBoxProps {
  readonly icon: LucideIcon;
  readonly color: RColor;
  /** Tile size in px (the apps use 26, 28, 32, 35, 36, 38, 40, 42 and 49). */
  readonly size: number;
  readonly shape: 'square' | 'circle';
  /** Tint strength in percent (default 10). */
  readonly tint?: number;
  /** Corner radius for squares (default size × 0.28). */
  readonly radius?: number;
  readonly iconSize?: number;
  /** Explicit background (e.g. #FFEDD5 behind an orange glyph). */
  readonly bg?: RColor;
  /** Solid fill in `color` with a white glyph. */
  readonly solid?: boolean;
}

/** A tinted icon tile (the apps' 10% chips). */
export function RIconChip({
  icon,
  color,
  size,
  shape,
  tint,
  radius,
  iconSize,
  bg,
  solid,
  className,
  style,
}: RIconChipProps): ReactNode {
  return (
    <span
      className={cn('rx-ichip', className)}
      data-solid={solid ? '' : undefined}
      style={rStyle(
        { '--rx-ichip-c': color, '--rx-ichip-t': tint === undefined ? undefined : `${tint}%` },
        {
          width: px(size),
          height: px(size),
          borderRadius: shape === 'circle' ? '50%' : px(radius ?? Math.round(size * 0.28)),
          background: bg,
          ...style,
        },
      )}
    >
      <RGlyph icon={icon} size={iconSize ?? Math.round(size * 0.57)} />
    </span>
  );
}

export interface RSegmentedProps extends RBoxProps {
  readonly options: readonly string[];
  /** Index of the selected option. */
  readonly active: number;
  /** pills (period pills) · toggle (EN / FIL) · tabs (top tabs with an underline). */
  readonly look: 'pills' | 'toggle' | 'tabs';
  /** The selected hue (default the brand primary). */
  readonly color?: RColor;
}

/** A segmented choice, drawn (not interactive). The selected option carries data-on. */
export function RSegmented({ options, active, look, color, className, style }: RSegmentedProps): ReactNode {
  return (
    <div className={cn('rx-seg', className)} data-look={look} style={rStyle({ '--rx-seg-c': color }, style)}>
      {options.map((option, index) => (
        <span key={`${index}-${option}`} className="rx-seg__opt" data-on={index === active ? '' : undefined}>
          {option}
        </span>
      ))}
    </div>
  );
}

export interface RCountBadgeProps extends RBoxProps {
  readonly count: number;
  /** Fill (default amber #F5A623). */
  readonly color?: RColor;
  readonly textColor?: RColor;
  /** A 1.5px ring in this colour (e.g. the header behind it). */
  readonly ring?: RColor;
  /** Height in px (default 18). */
  readonly size?: number;
  /** Shows "max+" above this (default 99). */
  readonly max?: number;
}

/** A notification count badge. */
export function RCountBadge({ count, color, textColor, ring, size, max = 99, className, style }: RCountBadgeProps): ReactNode {
  return (
    <span
      className={cn('rx-badge', className)}
      style={rStyle(
        {},
        {
          background: color,
          color: textColor,
          borderColor: ring,
          minWidth: size === undefined ? undefined : px(size),
          height: size === undefined ? undefined : px(size),
          ...style,
        },
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
