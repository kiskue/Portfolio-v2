import type { ReactNode } from 'react';
import { pickState, RCallBackdrop, type ReplicaProps } from '@/components/replicas/kit';
import { ConnectedControls, IncomingControls } from '@/components/replicas/responder/parts/call-controls';
import { CallContextCard, CallerIdentity, CallerNames, CallStatusPill } from '@/components/replicas/responder/parts/call-identity';
import { PushToTalk, RoomActivity, RoomControls, RoomHeader } from '@/components/replicas/responder/parts/incident-room';
import { CALL } from '@/components/replicas/responder/parts/palette';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import type { FigureState } from '@/content/apps/figures';

const VIEWS = {
  incoming: 'incoming',
  connected: 'connected',
  room: 'room',
} as const satisfies Record<FigureState<'3.4'>, FigureState<'3.4'>>;

const STATES = stateTuple(VIEWS);

/** The 1:1 call surface: status pill on top, the caller anchored in the middle, controls at the bottom. */
function CallSurface({ connected }: { readonly connected: boolean }): ReactNode {
  return (
    <>
      {connected ? (
        <RCallBackdrop palette="responder" scrim={0.45} silhouette />
      ) : (
        <RCallBackdrop palette="responder" orbs={CALL.accent} />
      )}
      <div className="rx-responder-call">
        <CallStatusPill connected={connected} />
        <span className="rx-responder-call__middle">
          <CallerIdentity ringing={!connected} />
          <CallerNames />
          <CallContextCard />
        </span>
        {connected ? <ConnectedControls /> : <IncomingControls />}
      </div>
    </>
  );
}

/** The incident room joined through JOIN STREAM, while the responder holds to speak. */
function IncidentRoom(): ReactNode {
  return (
    <>
      <RCallBackdrop palette="responder" silhouette className="rx-responder-room__video" />
      <span className="rx-responder-room__shade" />
      <RoomHeader />
      <RoomActivity />
      <PushToTalk />
      <RoomControls />
    </>
  );
}

/**
 * FIG 3.4 Video call with the command center, on the fixed dark call palette (the same in every
 * brand): 'incoming' rings with Decline and Answer, 'connected' shows the own camera under a
 * scrim with Mute / Speaker / Flip / End, 'room' is the incident room with push-to-talk.
 */
export function VideoCallScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  if (view === 'room') return <IncidentRoom />;
  return <CallSurface connected={view === 'connected'} />;
}
