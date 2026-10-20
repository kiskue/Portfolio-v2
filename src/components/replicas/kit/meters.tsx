import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RGlyph } from './glyph';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

function percent(value: number): string {
  return `${Math.min(Math.max(value, 0), 100)}%`;
}

export interface RProgressProps extends RBoxProps {
  /** 0–100. */
  readonly value: number;
  readonly color?: RColor;
  /** Track colour (default #f3f4f6). */
  readonly track?: RColor;
  /** Bar height in px (default 8). */
  readonly h?: number;
}

/** A rounded progress bar (sales target, share paid, stock health). */
export function RProgress({ value, color, track, h, className, style }: RProgressProps): ReactNode {
  return (
    <span
      className={cn('rx-progress', className)}
      style={rStyle({ '--rx-progress-c': color }, { background: track, height: h === undefined ? undefined : px(h), ...style })}
    >
      <span className="rx-progress__fill" style={{ width: percent(value) }} />
    </span>
  );
}

export interface RSegment {
  /** Relative width (flex grow), e.g. the heat-index bands 5 / 9 / 10 / 9. */
  readonly flex: number;
  readonly color: RColor;
}

export interface RSegmentBarProps extends RBoxProps {
  readonly segments: readonly RSegment[];
  /** A white marker ringed in `color` at `at` percent (0–100) along the bar. */
  readonly marker?: { readonly at: number; readonly color: RColor };
  /** One label per segment (aligned to each segment's start), or any number spread evenly. */
  readonly ticks?: readonly string[];
  /** Bar height in px (default 10). */
  readonly h?: number;
}

/** A banded bar with a marker (the PAGASA heat-index bar). */
export function RSegmentBar({ segments, marker, ticks, h, className, style }: RSegmentBarProps): ReactNode {
  const aligned = ticks !== undefined && ticks.length === segments.length;
  return (
    <div className={cn('rx-segbar', className)} style={style}>
      <span className="rx-segbar__track" style={rStyle({}, { height: h === undefined ? undefined : px(h) })}>
        {segments.map((segment, index) => (
          <span
            key={`${index}-${segment.color}`}
            className="rx-segbar__seg"
            style={{ flex: `${segment.flex} 1 0`, background: segment.color }}
          />
        ))}
        {marker ? <span className="rx-segbar__marker" style={{ left: percent(marker.at), color: marker.color }} /> : null}
      </span>
      {ticks && ticks.length > 0 ? (
        <span className="rx-segbar__ticks" data-even={aligned ? undefined : ''}>
          {ticks.map((tick, index) => (
            <span
              key={`${index}-${tick}`}
              className="rx-segbar__tick"
              style={aligned ? { flex: `${segments[index]?.flex ?? 1} 1 0` } : undefined}
            >
              {tick}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

export interface RTimelineStep {
  readonly label: string;
  readonly state: 'done' | 'active' | 'pending';
  /** A second line, e.g. a time. */
  readonly meta?: string;
}

export interface RVTimelineProps extends RBoxProps {
  readonly steps: readonly RTimelineStep[];
  /** Dot colours (defaults: done #27AE60, active #075985, pending #D1D5DB). */
  readonly colors?: { readonly done?: RColor; readonly active?: RColor; readonly pending?: RColor };
}

/** A vertical status timeline: 22px dots, a check on done steps and a 2px connector. */
export function RVTimeline({ steps, colors, className, style }: RVTimelineProps): ReactNode {
  return (
    <div
      className={cn('rx-tl', className)}
      style={rStyle(
        { '--rx-tl-done': colors?.done, '--rx-tl-active': colors?.active, '--rx-tl-pending': colors?.pending },
        style,
      )}
    >
      {steps.map((step, index) => (
        <div key={`${index}-${step.label}`} className="rx-tl__step" data-state={step.state}>
          <span className="rx-tl__rail">
            <span className="rx-tl__dot">
              {step.state === 'done' ? <RGlyph icon={Check} size={13} strokeWidth={3} /> : null}
              {step.state === 'active' ? <span className="rx-tl__core" /> : null}
            </span>
            {index < steps.length - 1 ? <span className="rx-tl__line" /> : null}
          </span>
          <span className="rx-tl__text">
            <span className="rx-tl__label">{step.label}</span>
            {step.meta ? <span className="rx-tl__meta">{step.meta}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
