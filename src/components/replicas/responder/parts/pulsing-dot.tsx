import type { ReactNode } from 'react';
import { px, rStyle, type RBoxProps, type RColor } from '@/components/replicas/kit';
import { cn } from '@/lib/cn';

export interface PulsingDotProps extends RBoxProps {
  readonly color: RColor;
  /** Dot diameter in px; the box is 8px wider for the ping. */
  readonly size: number;
}

/**
 * The app's PulsingDot (LIVE chip, zone badge, recording dot): a solid dot whose halo pings
 * out to 2.4× every 1.2 s while active. At rest (poster, reduced motion) only the dot shows.
 */
export function PulsingDot({ color, size, className, style }: PulsingDotProps): ReactNode {
  return (
    <span
      className={cn('rx-responder-pdot', className)}
      style={rStyle({ '--rx-responder-pdot-c': color, '--rx-responder-pdot-size': px(size) }, style)}
    >
      <span className="rx-responder-pdot__halo" />
      <span className="rx-responder-pdot__core" />
    </span>
  );
}
