import type { CSSProperties, ReactNode } from 'react';
import type { Tap } from '@/content/types';

/*
 * The glimpse tap ring (design §5.3): a 44px logical ring, white fill at 35%, a 2px white
 * border and a 1px navy outer ring, so it reads on light and dark screens. It scales .6 → 1
 * over 180ms, then fades over 270ms; a hold keeps the ring for its holdMs first.
 *
 * CSS only (src/components/showcase/glimpse.css), under the motion contract: it shows only
 * inside a [data-active] frame (from `atMs` after the frame becomes active), freezes under
 * [data-paused], and never shows under reduced motion. Hook-free, so it renders anywhere.
 */

type TapStyle = CSSProperties & Readonly<Record<`--${string}`, string>>;

export interface TapIndicatorProps {
  readonly tap: Tap;
}

/** One tap or hold, positioned in logical px on the 390×844 canvas. */
export function TapIndicator({ tap }: TapIndicatorProps): ReactNode {
  const style: TapStyle = {
    '--tap-x': `${tap.x}px`,
    '--tap-y': `${tap.y}px`,
    '--tap-at': `${Math.max(tap.atMs, 0)}ms`,
    '--tap-hold': `${tap.kind === 'hold' ? Math.max(tap.holdMs ?? 0, 0) : 0}ms`,
  };
  return <span className="gl-tap" data-kind={tap.kind} style={style} />;
}

export interface TapLayerProps {
  readonly taps: readonly Tap[];
}

/**
 * A step's taps on a 390×844 layer laid over the phone's screen and scaled with it (--ps), so a
 * tap point matches the replica's own coordinates. Decorative: aria-hidden.
 */
export function TapLayer({ taps }: TapLayerProps): ReactNode {
  if (taps.length === 0) return null;
  return (
    <span className="gl-taps" aria-hidden="true">
      {taps.map((tap) => (
        <TapIndicator key={`${tap.atMs}-${tap.x}-${tap.y}`} tap={tap} />
      ))}
    </span>
  );
}
