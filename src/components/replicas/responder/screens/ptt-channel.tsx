import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { ChannelComposer } from '@/components/replicas/responder/parts/channel-composer';
import { ChannelHeader } from '@/components/replicas/responder/parts/channel-header';
import { ChannelThread } from '@/components/replicas/responder/parts/channel-thread';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { PTT_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import type { FigureState } from '@/content/apps/figures';

/**
 * 'thread' plays the push-to-talk glimpse while active: the mic is held (● 0:07 · Slide to
 * cancel), released, and the own voice note lands. 'recording' is the held moment, still.
 */
const VIEWS = {
  thread: { recording: false, animated: true },
  recording: { recording: true, animated: false },
} as const satisfies Record<FigureState<'3.5'>, { readonly recording: boolean; readonly animated: boolean }>;

const STATES = stateTuple(VIEWS);

/**
 * FIG 3.5 Channels: the Rescue Ops – Alpha thread with the agent's staging call, an URGENT
 * reroute and a mention, the responder's transcribed voice note, and the hold-to-talk composer.
 * Own bubbles, the accent glyphs and the mic follow the brand.
 */
export function PttChannelScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  return (
    <div className="rx-responder-channel">
      <ChannelHeader />
      <ChannelThread sent={!view.recording} landsAt={view.animated ? PTT_TIMELINE.landAt : undefined} />
      <ChannelComposer recording={view.recording} timeline={view.animated ? PTT_TIMELINE : undefined} />
    </div>
  );
}
