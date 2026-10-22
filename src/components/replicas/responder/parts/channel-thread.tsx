import type { ReactNode } from 'react';
import { ms, RBubble, rStyle } from '@/components/replicas/kit';
import { responderChannel } from '@/components/replicas/responder/sample-data';

const { staging, urgent, mention, voiceNote } = responderChannel;

export interface ChannelThreadProps {
  /**
   * The responder's own voice note: 'sent' shows it; `{ landsAt }` keeps it unsent (still being
   * recorded) and, while active, lands it at that time, pushing the list up.
   */
  readonly voiceNote: 'sent' | { readonly landsAt: number };
}

/**
 * The thread, newest at the bottom: one run from the agent (2px apart, 6px corners inside the
 * run) — the staging call, the URGENT reroute (2px #c62828 edge) and the amber mention — then
 * the responder's own voice note with its transcript and English chip.
 */
export function ChannelThread({ voiceNote: note }: ChannelThreadProps): ReactNode {
  const landsAt = note === 'sent' ? undefined : note.landsAt;
  return (
    <div className="rx-responder-thread">
      <RBubble from="them" sender={staging.sender} className="rx-responder-msg">
        {staging.text}
      </RBubble>
      <RBubble from="them" urgent className="rx-responder-msg rx-responder-msg--run">
        {urgent.text}
      </RBubble>
      <RBubble from="them" mention tail={false} className="rx-responder-msg rx-responder-msg--run rx-responder-msg--last">
        <span>
          <span className="rx-responder-mention">{mention.handle}</span> {mention.text}
        </span>
      </RBubble>
      <div
        className="rx-responder-land"
        data-land={landsAt === undefined ? undefined : ''}
        style={rStyle({ '--rx-responder-land-at': landsAt === undefined ? undefined : ms(landsAt) })}
      >
        <div className="rx-responder-land__inner">
          <RBubble
            from="me"
            voice={{ seconds: voiceNote.seconds, played: 0, seed: 7 }}
            transcript={voiceNote.transcript}
            lang={voiceNote.language}
            tail={false}
            className="rx-responder-msg rx-responder-msg--block"
          />
        </div>
      </div>
    </div>
  );
}
