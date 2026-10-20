import type { ReactNode } from 'react';
import { pickState, RStateSequence, type ReplicaProps, type RStateFrame } from '@/components/replicas/kit';
import { CallScreen } from '@/components/replicas/citizen/parts/call-screen';
import { figureStates } from './figure-states';

const STATES = figureStates('2.4');

/** The crossfade between call states (the app fades its call UI in over 500 ms). */
const FADE_MS = 400;

/**
 * Glimpse row 2.4: "In queue · You are now #2 in queue" crossfades to "Connected to
 * Dispatcher 07" plus the controls row at 1.5 s. From `calling` the call connects through
 * "Connecting… to Dispatcher 07".
 */
const FRAMES = {
  queue: [
    { atMs: 0, node: <CallScreen status="queue" /> },
    { atMs: 1500, node: <CallScreen status="connected" /> },
  ],
  calling: [
    { atMs: 0, node: <CallScreen status="calling" /> },
    { atMs: 1100, node: <CallScreen status="connecting" /> },
    { atMs: 2100, node: <CallScreen status="connected" /> },
  ],
} as const satisfies Readonly<Record<string, readonly RStateFrame[]>>;

/**
 * FIG 2.4 Live call (citizen.json live-call), on the fixed dark call palette.
 * `queue`: the queue position under "In queue"; `calling`: "Calling Dispatcher 07";
 * `connected`: the dispatcher's (abstract) video with the controls row.
 */
export function LiveCallScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  if (current === 'connected') {
    return (
      <div className="rx-citizen-call">
        <CallScreen status="connected" />
      </div>
    );
  }
  return <RStateSequence className="rx-citizen-call" frames={FRAMES[current]} posterFrame={0} fadeMs={FADE_MS} />;
}
