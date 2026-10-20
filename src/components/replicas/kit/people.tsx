import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RGlyph } from './glyph';
import { RRipple, type RRippleProps } from './motion';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

/* Initials and glyphs only: a replica never shows a photo of a person. */

export interface RAvatarProps extends RBoxProps {
  readonly initials: string;
  /** Diameter in px. */
  readonly size: number;
  /** Ring and initials hue (default the brand primary). */
  readonly color?: RColor;
  /** Fill: any CSS background, gradients included (default `color` at 18%). */
  readonly bg?: string;
  /** Ring colour, or false for no ring (default `color`). */
  readonly ring?: RColor | false;
  /** Ring width in px (default 2). */
  readonly ringWidth?: number;
  readonly textColor?: RColor;
  /** Initials size in px (default 36% of the diameter). */
  readonly fontSize?: number;
  /** A glyph instead of the initials. */
  readonly icon?: LucideIcon;
  /** Expanding rings while active (ringing, calling). */
  readonly ripple?: Omit<RRippleProps, 'size' | keyof RBoxProps>;
}

/** A monogram circle (call peer, room participant, rank badge, SOS face). */
export function RAvatar({
  initials,
  size,
  color,
  bg,
  ring,
  ringWidth,
  textColor,
  fontSize,
  icon,
  ripple,
  className,
  style,
}: RAvatarProps): ReactNode {
  return (
    <span
      className={cn('rx-avatar', className)}
      data-ring={ring === false ? 'none' : undefined}
      style={rStyle(
        { '--rx-avatar-c': color },
        {
          width: px(size),
          height: px(size),
          background: bg,
          borderColor: ring === false ? undefined : ring,
          borderWidth: ringWidth === undefined || ring === false ? undefined : px(ringWidth),
          color: textColor,
          fontSize: px(fontSize ?? Math.round(size * 0.36)),
          ...style,
        },
      )}
    >
      {ripple ? <RRipple size={size} {...ripple} /> : null}
      {icon ? <RGlyph icon={icon} size={Math.round(size * 0.45)} /> : initials}
    </span>
  );
}

export interface RAvatarStackPerson {
  readonly initials: string;
  readonly color?: RColor;
  readonly bg?: string;
}

export interface RAvatarStackProps extends RBoxProps {
  readonly people: readonly RAvatarStackPerson[];
  /** Diameter in px (default 28). */
  readonly size?: number;
  /** Overlap in px (default 8). */
  readonly overlap?: number;
  /** The ring between avatars, usually the surface behind them. */
  readonly ring?: RColor;
  /** Show at most this many, then a "+N" avatar. */
  readonly max?: number;
}

/** Overlapping avatars (incident-room participants). */
export function RAvatarStack({ people, size = 28, overlap, ring, max, className, style }: RAvatarStackProps): ReactNode {
  const limit = max === undefined ? people.length : Math.max(0, max);
  const shown = people.slice(0, limit);
  const extra = people.length - shown.length;
  return (
    <span
      className={cn('rx-astack', className)}
      style={rStyle({ '--rx-astack-overlap': overlap === undefined ? undefined : px(overlap) }, style)}
    >
      {shown.map((person, index) => (
        <RAvatar
          key={`${index}-${person.initials}`}
          initials={person.initials}
          size={size}
          color={person.color}
          bg={person.bg}
          ring={ring}
          textColor={person.bg ? '#ffffff' : undefined}
        />
      ))}
      {extra > 0 ? <RAvatar initials={`+${extra}`} size={size} ring={ring} /> : null}
    </span>
  );
}
