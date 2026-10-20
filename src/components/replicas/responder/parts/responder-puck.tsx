import type { ReactNode } from 'react';
import { px, rBrand, RRipple } from '@/components/replicas/kit';

/** The puck is 44 logical px (navTokens PUCK_SIZE). */
const PUCK = 44;

export interface ResponderPuckProps {
  /** Centre in canvas px. */
  readonly x: number;
  readonly y: number;
  /** Heading in degrees, 0 = up. */
  readonly heading: number;
  /** Accuracy circle radius in px (drawn only when wider than the puck). */
  readonly accuracy?: number;
  /** Moving: two halo rings pulse out every 2 s while active. */
  readonly moving?: boolean;
}

/**
 * The responder's heading puck (ResponderPuckArt): a plate with a nose arrow in the brand
 * primary, a white ring and the white van glyph with cut-outs. In the app it is an overlay
 * drawn over the map (markers cannot rotate), so it is drawn here too, in screen px.
 */
export function ResponderPuck({ x, y, heading, accuracy, moving }: ResponderPuckProps): ReactNode {
  const halo = accuracy !== undefined && accuracy > PUCK / 2 ? accuracy : null;
  return (
    <span className="rx-responder-puck" style={{ left: px(x - PUCK / 2), top: px(y - PUCK / 2) }}>
      {halo === null ? null : (
        <span
          className="rx-responder-puck__accuracy"
          style={{ width: px(halo * 2), height: px(halo * 2), margin: `${px(-halo)} 0 0 ${px(-halo)}` }}
        />
      )}
      {moving ? <RRipple size={PUCK} count={2} periodMs={2000} color={rBrand.primary} /> : null}
      <svg className="rx-responder-puck__art" viewBox="0 0 100 100" width={PUCK} height={PUCK} style={{ transform: `rotate(${heading}deg)` }}>
        <path d="M50 6 36 32h28z" fill="currentColor" stroke="#ffffff" strokeWidth={5} strokeLinejoin="round" />
        <circle cx={50} cy={57} r={38} fill="currentColor" stroke="#ffffff" strokeWidth={5} />
        <rect x={33} y={31} width={34} height={52} rx={9} fill="#ffffff" />
        <rect x={38} y={36} width={24} height={11} rx={4} fill="currentColor" />
        <rect x={38} y={52} width={24} height={4} rx={2} fill="currentColor" />
        <rect x={38} y={67} width={24} height={9} rx={4} fill="currentColor" />
      </svg>
    </span>
  );
}
