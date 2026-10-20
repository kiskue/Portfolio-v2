import { Headset, Phone, Ticket } from 'lucide-react';
import type { ReactNode } from 'react';
import { RAvatar, RGlyph } from '@/components/replicas/kit';
import { responderCaller } from '@/components/replicas/responder/sample-data';
import { CALL } from './palette';

/** The status pill at the top of the call: Incoming call (accent) or Connected (green dot and edge). */
export function CallStatusPill({ connected }: { readonly connected: boolean }): ReactNode {
  return (
    <span className="rx-responder-callpill" data-live={connected ? '' : undefined}>
      {connected ? <span className="rx-responder-callpill__dot" /> : <RGlyph icon={Phone} size={16} color={CALL.accent} />}
      <span className="rx-responder-callpill__text">{connected ? 'Connected' : 'Incoming call'}</span>
    </span>
  );
}

/**
 * The caller block, anchored in the same place in every state: the 112px monogram in the
 * Agent role colour (#60A5FA at 18% with a 2px ring), two 1.5px rings expanding while it rings
 * (a still 1.3× ring is the poster), and the COMMAND CENTER role chip.
 */
export function CallerIdentity({ ringing }: { readonly ringing: boolean }): ReactNode {
  return (
    <span className="rx-responder-caller">
      <RAvatar
        initials={responderCaller.initials}
        size={112}
        color={CALL.accent}
        bg="rgba(96,165,250,0.18)"
        ringWidth={2}
        fontSize={40}
        className="rx-responder-caller__avatar"
        ripple={ringing ? { count: 2, periodMs: 1600, scale: 1.65, thickness: 1.5, color: CALL.accent } : undefined}
      />
      {ringing ? <span className="rx-responder-caller__still-ring" /> : null}
      <span className="rx-responder-caller__role">
        <RGlyph icon={Headset} size={12} color={CALL.accent} />
        <span>COMMAND CENTER</span>
      </span>
    </span>
  );
}

/** Name (28px Bold) and role line (15px, white 72%). */
export function CallerNames(): ReactNode {
  return (
    <span className="rx-responder-callnames">
      <span className="rx-responder-callnames__name">{responderCaller.name}</span>
      <span className="rx-responder-callnames__role">{responderCaller.subtitle}</span>
    </span>
  );
}

/** The glass context card: the ticket the call is about, and that the agent is on a live citizen call. */
export function CallContextCard(): ReactNode {
  return (
    <span className="rx-responder-callctx">
      <span className="rx-responder-callctx__row">
        <RGlyph icon={Ticket} size={14} color={CALL.text2} />
        <span>{responderCaller.ticket}</span>
      </span>
      <span className="rx-responder-callctx__row" data-warn="">
        <span className="rx-responder-callctx__dot" />
        <span>{responderCaller.citizenState}</span>
      </span>
    </span>
  );
}
