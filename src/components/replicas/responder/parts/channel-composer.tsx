import { ArrowLeft, CirclePlus, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { ms, RGlyph, RStateSequence, rStyle } from '@/components/replicas/kit';
import { responderChannel } from '@/components/replicas/responder/sample-data';
import { CHANNEL } from './palette';
import { PulsingDot } from './pulsing-dot';

/** At rest: attach, the "Message" pill, and the Auto language chip (cycles Auto / EN / TL). */
function IdleBar(): ReactNode {
  return (
    <span className="rx-responder-composer__bar">
      <span className="rx-responder-composer__add">
        <RGlyph icon={CirclePlus} size={24} />
      </span>
      <span className="rx-responder-composer__input">Message</span>
      <span className="rx-responder-composer__lang">Auto</span>
    </span>
  );
}

/** While the mic is held: the pulsing red dot, the clip clock and "Slide to cancel". */
function RecordingBar(): ReactNode {
  return (
    <span className="rx-responder-composer__bar" data-recording="">
      <PulsingDot color={CHANNEL.danger} size={10} />
      <span className="rx-responder-composer__clock">{responderChannel.voiceNote.clock}</span>
      <span className="rx-responder-composer__cancel">
        <RGlyph icon={ArrowLeft} size={14} />
        <span>Slide to cancel</span>
      </span>
    </span>
  );
}

export interface ComposerHold {
  readonly holdAt: number;
  readonly releaseAt: number;
}

export interface ChannelComposerProps {
  /** The static picture: the mic held (recording strip, mic scaled to 1.25) or at rest. */
  readonly recording: boolean;
  /**
   * Play a hold while active (the 3.5 glimpse from 'recording'): at rest, then the mic pressed
   * at holdAt, then released at releaseAt.
   */
  readonly hold?: ComposerHold;
}

/**
 * The composer (ChannelComposer): white, a top hairline, 44px controls, and the hold-to-talk mic
 * in the brand accent. Holding it swaps the bar for the recording strip and scales the mic.
 */
export function ChannelComposer({ recording, hold }: ChannelComposerProps): ReactNode {
  const bar = hold ? (
    <RStateSequence
      frames={[
        { atMs: 0, node: <IdleBar /> },
        { atMs: hold.holdAt, node: <RecordingBar /> },
        { atMs: hold.releaseAt, node: <IdleBar /> },
      ]}
      posterFrame={recording ? 1 : 0}
      fadeMs={0}
    />
  ) : recording ? (
    <RecordingBar />
  ) : (
    <IdleBar />
  );
  return (
    <div className="rx-responder-composer">
      <span className="rx-responder-composer__left">{bar}</span>
      <span
        className="rx-responder-mic"
        data-held={recording ? '' : undefined}
        data-press={hold ? '' : undefined}
        style={rStyle({
          '--rx-responder-hold-at': hold ? ms(hold.holdAt) : undefined,
          '--rx-responder-release-at': hold ? ms(hold.releaseAt) : undefined,
        })}
      >
        <RGlyph icon={Mic} size={22} />
      </span>
    </div>
  );
}
