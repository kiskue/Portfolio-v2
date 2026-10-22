import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { czSos } from '@/components/replicas/citizen/sample-data';

export interface SosButtonProps {
  /**
   * idle: the red dome · press: the red dome that the screen presses while active (it carries
   * the one-shot commit ring) · offline: the paused grey face with the WifiOff badge.
   */
  readonly state?: 'idle' | 'press' | 'offline';
}

/**
 * The SOS control docked on the tab bar (SosButton.tsx): an 80 px white collar around a 72 px
 * core whose red gradient keeps #d84343 for the top quarter and fades to #b02b2b, a 1 px
 * specular lip and a red glow. The emergency palette is fixed in citizen.css and never
 * follows the brand. No idle animation (the app has none); the press, the commit ring and the
 * countdown are the screen's motion, declared under [data-active] in citizen.css.
 */
export function SosButton({ state = 'idle' }: SosButtonProps): ReactNode {
  return (
    <span className="rx-citizen-sos" data-state={state}>
      {state === 'press' ? <span className="rx-citizen-sos__ring" /> : null}
      <span className="rx-citizen-sos__face">
        <span className="rx-citizen-sos__label">{czSos.label}</span>
      </span>
      {state === 'offline' ? (
        <span className="rx-citizen-sos__badge">
          <RGlyph icon={WifiOff} size={13} strokeWidth={2.5} />
        </span>
      ) : null}
    </span>
  );
}
