import { CircleAlert, Languages, Play, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RPill } from './controls';
import { KitGlyph } from './kit-glyph';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

/** A deterministic 0–1 generator (mulberry32). Render never calls Math.random. */
function seeded(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bar heights in percent (28–100) for a voice note: the same seed always gives the same shape. */
export function waveformHeights(seed: number, bars: number): readonly number[] {
  const next = seeded(seed);
  const count = Math.max(1, Math.round(bars));
  return Array.from({ length: count }, (_, index) => {
    const envelope = 0.55 + 0.45 * Math.sin((Math.PI * (index + 0.5)) / count);
    return Math.round((0.28 + 0.72 * next() * envelope) * 100);
  });
}

export interface RWaveformProps extends RBoxProps {
  readonly seed: number;
  /** Number of bars (default 22, as in Channels). */
  readonly bars?: number;
  /** Share already played, 0–1. */
  readonly played?: number;
  /** Unplayed bar colour (default the text colour at 40%). */
  readonly color?: RColor;
  /** Played bar colour (default the text colour). */
  readonly playedColor?: RColor;
  /** Height in px (default 28). */
  readonly height?: number;
  readonly barWidth?: number;
  readonly gap?: number;
}

/** A voice-note waveform with seeded, deterministic bar heights. */
export function RWaveform({ seed, bars = 22, played = 0, color, playedColor, height, barWidth, gap, className, style }: RWaveformProps): ReactNode {
  const heights = waveformHeights(seed, bars);
  const playedBars = Math.round(Math.min(Math.max(played, 0), 1) * heights.length);
  return (
    <span
      className={cn('rx-wave', className)}
      style={rStyle(
        {
          '--rx-wave-c': color,
          '--rx-wave-played': playedColor,
          '--rx-wave-bw': barWidth === undefined ? undefined : px(barWidth),
        },
        { height: height === undefined ? undefined : px(height), gap: gap === undefined ? undefined : px(gap), ...style },
      )}
    >
      {heights.map((value, index) => (
        <span
          key={index}
          className="rx-wave__bar"
          data-played={index < playedBars ? '' : undefined}
          style={{ height: `${value}%` }}
        />
      ))}
    </span>
  );
}

/** Seconds as m:ss (0:07). */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface RBubbleProps extends RBoxProps {
  readonly from: 'me' | 'them';
  /** Sender name above an incoming bubble. */
  readonly sender?: string;
  /** The message text (or any content). */
  readonly children?: ReactNode;
  /** A voice note: its length and how much has played, both in seconds. */
  readonly voice?: { readonly seconds: number; readonly played: number; readonly seed?: number };
  /** The transcript under a voice note. */
  readonly transcript?: string;
  /** A language chip, e.g. "English". */
  readonly lang?: string;
  /** A 2px red border and an URGENT chip. */
  readonly urgent?: true;
  /** The amber "mentions me" wash. */
  readonly mention?: true;
  /** The small 6px corner on the sender's side (default true). */
  readonly tail?: boolean;
  /** error: the pale-red failure bubble (SME AI offline). */
  readonly tone?: 'default' | 'error';
  /** A leading status glyph, e.g. WifiOff on an error bubble. */
  readonly icon?: LucideIcon;
}

/** Chat bubbles for Channels (3.5) and the SME AI chat (1.8). */
export function RBubble({
  from,
  sender,
  children,
  voice,
  transcript,
  lang,
  urgent,
  mention,
  tail = true,
  tone = 'default',
  icon,
  className,
  style,
}: RBubbleProps): ReactNode {
  const playedShare = voice && voice.seconds > 0 ? voice.played / voice.seconds : 0;
  return (
    <div className={cn('rx-bubble-row', className)} data-from={from} style={style}>
      {sender && from === 'them' ? <span className="rx-bubble__sender">{sender}</span> : null}
      <div
        className="rx-bubble"
        data-from={from}
        data-tail={tail ? '' : undefined}
        data-urgent={urgent ? '' : undefined}
        data-mention={mention ? '' : undefined}
        data-tone={tone}
      >
        {urgent ? <RPill label="URGENT" fill="solid" color="#c62828" icon={CircleAlert} size="xs" /> : null}
        {voice ? (
          <span className="rx-voice">
            <span className="rx-voice__play">
              <KitGlyph icon={Play} size={18} fill="currentColor" />
            </span>
            <RWaveform seed={voice.seed ?? Math.round(voice.seconds * 97)} played={playedShare} />
            <span className="rx-voice__time">{clock(voice.seconds)}</span>
          </span>
        ) : null}
        {icon ? (
          <span className="rx-bubble__status">
            <KitGlyph icon={icon} size={16} />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
        {transcript ? <span>{transcript}</span> : null}
        {lang ? (
          <span className="rx-bubble__lang">
            <KitGlyph icon={Languages} size={12} />
            {lang}
          </span>
        ) : null}
      </div>
    </div>
  );
}
