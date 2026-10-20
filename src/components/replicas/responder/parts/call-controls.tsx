import { Mic, Phone, PhoneOff, SwitchCamera, Volume1 } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlassButton } from '@/components/replicas/kit';
import { CALL } from './palette';

/**
 * Incoming: Decline (68px #F43F5E, call-end) on the left and Answer (80px #34D399, call) on the
 * right, 80px apart, then "Tap to answer or decline".
 */
export function IncomingControls(): ReactNode {
  return (
    <span className="rx-responder-callctl">
      <span className="rx-responder-callctl__row" data-gap="wide">
        <RGlassButton icon={PhoneOff} size={68} tone="solid" color={CALL.danger} iconSize={28} caption="Decline" className="rx-responder-glow" />
        <RGlassButton
          icon={Phone}
          size={80}
          tone="solid"
          color={CALL.live}
          iconSize={32}
          caption="Answer"
          className="rx-responder-glow rx-responder-glow--live"
        />
      </span>
      <span className="rx-responder-callctl__hint">Tap to answer or decline</span>
    </span>
  );
}

/** Connected: 52px glass Mute, Speaker and Flip, then the 68px red End, 20px apart. */
export function ConnectedControls(): ReactNode {
  return (
    <span className="rx-responder-callctl">
      <span className="rx-responder-callctl__row">
        <RGlassButton icon={Mic} size={52} iconSize={20} caption="Mute" />
        <RGlassButton icon={Volume1} size={52} iconSize={18} caption="Speaker" />
        <RGlassButton icon={SwitchCamera} size={52} iconSize={20} caption="Flip" />
        <RGlassButton icon={PhoneOff} size={68} tone="solid" color={CALL.danger} iconSize={22} caption="End" className="rx-responder-glow" />
      </span>
    </span>
  );
}
