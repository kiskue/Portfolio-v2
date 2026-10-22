import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { ChannelComposer } from '@/components/replicas/responder/parts/channel-composer';
import { ChannelHeader } from '@/components/replicas/responder/parts/channel-header';
import { ChannelThread } from '@/components/replicas/responder/parts/channel-thread';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { PTT_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import type { FigureState } from '@/content/apps/figures';

/**
 * 'thread' (the glimpse poster) is the thread with the sent voice note, still. 'recording' is the
 * held moment (● 0:07 · Slide to cancel, the note not yet sent) and the glimpse step (recording
 * → thread): while active the mic is pressed at the hold, released when the finger lifts, and
 * the own voice note lands.
 */
const VIEWS = {
  thread: { recording: false },
  recording: { recording: true },
} as const satisfies Record<FigureState<'3.5'>, { readonly recording: boolean }>;

const STATES = stateTuple(VIEWS);

/**
 * FIG 3.5 Channels: the Rescue Ops – Alpha thread with the agent's staging call, an URGENT
 * reroute and a mention, the responder's transcribed voice note, and the hold-to-talk composer.
 * Own bubbles, the accent glyphs and the mic follow the brand.
 */
export function PttChannelScreen({ state }: ReplicaProps): ReactNode {
  const { recording } = VIEWS[pickState(STATES, state)];
  return (
    <div className="rx-responder-channel">
      <ChannelHeader />
      <ChannelThread voiceNote={recording ? { landsAt: PTT_TIMELINE.landAt } : 'sent'} />
      <ChannelComposer recording={recording} hold={recording ? PTT_TIMELINE : undefined} />
    </div>
  );
}
