import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ms, px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

/*
 * Motion parts. All of them follow the motion contract in src/styles/replica.css: they animate
 * only under an ancestor with [data-active] (times count from when it appears), freeze under
 * [data-paused], and show their static poster otherwise and under reduced motion.
 */

export interface RStateFrame {
  /** When this frame appears, in ms after the step becomes active. */
  readonly atMs: number;
  readonly node: ReactNode;
}

export interface RStateSequenceProps extends RBoxProps {
  /** Frames in ascending atMs order. They stack in one grid cell, so the box never jumps. */
  readonly frames: readonly RStateFrame[];
  /** The frame shown when not active and under reduced motion (default 0). */
  readonly posterFrame?: number;
  /** Crossfade length between frames (default 240ms; a frame at 0ms cuts in). */
  readonly fadeMs?: number;
}

/**
 * In-screen state changes (countdown, queue → connected, duty switch, distance, button
 * states) as CSS-only frames: frame i fades in at its atMs and leaves once frame i+1 has
 * faded in over it.
 */
export function RStateSequence({ frames, posterFrame = 0, fadeMs = 240, className, style }: RStateSequenceProps): ReactNode {
  const poster = Math.min(Math.max(Math.round(posterFrame), 0), Math.max(frames.length - 1, 0));
  return (
    <div className={cn('rx-seq', className)} style={style}>
      {frames.map((frame, index) => {
        const next = frames[index + 1];
        const at = Math.max(frame.atMs, 0);
        return (
          <div
            key={`${index}-${frame.atMs}`}
            className="rx-seq__frame"
            data-poster={index === poster ? '' : undefined}
            data-last={next ? undefined : ''}
            style={rStyle({
              '--rx-frame-in': ms(at),
              '--rx-frame-fade': ms(at === 0 ? 0 : fadeMs),
              '--rx-frame-out': next ? ms(Math.max(next.atMs, at) + fadeMs) : undefined,
            })}
          >
            {frame.node}
          </div>
        );
      })}
    </div>
  );
}

export interface RTypewriterProps extends RBoxProps {
  readonly text: string;
  /** When typing starts, in ms after the step becomes active. */
  readonly startMs: number;
  /** Typing speed (default 18ms per character, as in the SME AI cards). */
  readonly msPerChar?: number;
}

/** The text split into words and runs of whitespace, each with the time it starts typing. */
function typedParts(text: string, startMs: number, msPerChar: number): readonly { readonly part: string; readonly at: number }[] {
  const parts: { part: string; at: number }[] = [];
  let typed = 0;
  for (const part of text.split(/(\s+)/)) {
    parts.push({ part, at: startMs + typed * msPerChar });
    typed += part.length;
  }
  return parts;
}

/** Text revealed word by word while active; the full text is the poster. Renders an inline span. */
export function RTypewriter({ text, startMs, msPerChar = 18, className, style }: RTypewriterProps): ReactNode {
  return (
    <span className={cn('rx-tw', className)} style={style}>
      {typedParts(text, startMs, msPerChar).map(({ part, at }, index) =>
        part.trim() === '' ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <span key={index} className="rx-tw__w" style={rStyle({ '--rx-word-at': ms(at) })}>
            {part}
          </span>
        ),
      )}
    </span>
  );
}

export interface RAutoScrollProps extends RBoxProps {
  /** How far the content scrolls down, in logical px (the sign is ignored). */
  readonly distance: number;
  readonly startMs: number;
  readonly durationMs: number;
  /** The poster offset: 'start' (default, unscrolled) or 'end' (scrolled by `distance`). */
  readonly poster?: 'start' | 'end';
  readonly children?: ReactNode;
}

/** A clipped viewport whose content scrolls by `distance` while active (ease-in-out). */
export function RAutoScroll({ distance, startMs, durationMs, poster = 'start', children, className, style }: RAutoScrollProps): ReactNode {
  return (
    <div
      className={cn('rx-autoscroll', className)}
      data-poster={poster}
      style={rStyle(
        {
          '--rx-scroll-dist': px(-Math.abs(distance)),
          '--rx-scroll-start': ms(startMs),
          '--rx-scroll-dur': ms(durationMs),
        },
        style,
      )}
    >
      <div className="rx-autoscroll__inner">{children}</div>
    </div>
  );
}

export interface RSpinnerProps extends RBoxProps {
  /** Diameter in px (default 16). */
  readonly size?: number;
  /** Default: the current text colour. */
  readonly color?: RColor;
  readonly thickness?: number;
}

/** A ring spinner; it turns only while active. */
export function RSpinner({ size, color, thickness, className, style }: RSpinnerProps): ReactNode {
  return (
    <span
      className={cn('rx-spinner', className)}
      style={rStyle(
        { '--rx-spin-c': color },
        {
          width: size === undefined ? undefined : px(size),
          height: size === undefined ? undefined : px(size),
          borderWidth: thickness === undefined ? undefined : px(thickness),
          ...style,
        },
      )}
    />
  );
}

export interface RRippleProps extends RBoxProps {
  /** Diameter of the circle the rings start from, in px. Place it inside a positioned element. */
  readonly size: number;
  readonly count?: number;
  /** Default: the current text colour. */
  readonly color?: RColor;
  /** Final ring scale (default 1.3). */
  readonly scale?: number;
  readonly periodMs?: number;
  readonly thickness?: number;
}

/** Rings that expand and fade from a circle while active (call and ringing states); none at rest. */
export function RRipple({ size, count = 3, color, scale, periodMs = 2000, thickness, className, style }: RRippleProps): ReactNode {
  const rings = Math.max(1, Math.round(count));
  return (
    <span
      className={cn('rx-ripple', className)}
      style={rStyle(
        {
          '--rx-ripple-c': color,
          '--rx-ripple-scale': scale === undefined ? undefined : String(scale),
          '--rx-ripple-period': ms(periodMs),
          '--rx-ripple-th': thickness === undefined ? undefined : px(thickness),
        },
        { width: px(size), height: px(size), marginTop: px(-size / 2), marginLeft: px(-size / 2), ...style },
      )}
    >
      {Array.from({ length: rings }, (_, index) => (
        <span key={index} className="rx-ripple__ring" style={rStyle({ '--rx-ring-delay': ms((index * periodMs) / rings) })} />
      ))}
    </span>
  );
}

export interface RLoadingDotsProps extends RBoxProps {
  /** Default: the current text colour. */
  readonly color?: RColor;
  /** Dot diameter in px (default 4). */
  readonly size?: number;
}

/** Three dots that bounce in turn while active ("Calling…", "In queue"). */
export function RLoadingDots({ color, size, className, style }: RLoadingDotsProps): ReactNode {
  return (
    <span
      className={cn('rx-dots', className)}
      style={rStyle({ '--rx-dots-c': color, '--rx-dots-size': size === undefined ? undefined : px(size) }, style)}
    >
      {[0, 1, 2].map((index) => (
        <span key={index} className="rx-dots__dot" style={rStyle({ '--rx-dot-delay': ms(index * 160) })} />
      ))}
    </span>
  );
}
