import { CircleCheck, Clock, Mic, Phone, SwitchCamera, Volume2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RCallBackdrop, RGlassButton, RGlyph, RLoadingDots, RRipple } from '@/components/replicas/kit';
import { czCall, czQueueLine } from '@/components/replicas/citizen/sample-data';

export type CzCallStatus = 'queue' | 'calling' | 'connecting' | 'connected';

/** The status pill per call state (callHelpers statusInfo): glyph, colour, label and the bouncing dots. */
const STATUS: Readonly<Record<CzCallStatus, { readonly icon: LucideIcon; readonly color: string; readonly text: string; readonly dots: boolean }>> = {
  queue: { icon: Clock, color: '#10B981', text: czCall.status.queue, dots: true },
  calling: { icon: Phone, color: '#d8f9ff', text: czCall.status.calling, dots: true },
  connecting: { icon: Phone, color: '#d8f9ff', text: czCall.status.connecting, dots: true },
  connected: { icon: CircleCheck, color: '#10B981', text: czCall.status.connected, dots: false },
};

/** The in-call controls: mic, speaker (on, so it shows its blue), camera flip, end call. */
function CallControls(): ReactNode {
  return (
    <span className="rx-citizen-call__controls">
      <RGlassButton icon={Mic} size={56} iconSize={20} />
      <RGlassButton icon={Volume2} size={56} iconSize={20} iconColor="#3b82f6" className="rx-citizen-callbtn" />
      <RGlassButton icon={SwitchCamera} size={56} iconSize={20} />
      <RGlassButton icon={Phone} size={56} iconSize={20} tone="tint" color="#ef4444" iconColor="#ff0000" className="rx-citizen-hangup" />
    </span>
  );
}

/**
 * One state of the SOS video call (Call.tsx), as a full-screen layer: the abstract dark call
 * background (never a person; when connected a blurred, featureless shape stands in for the
 * dispatcher's video under a lighter scrim), the status pill, the glass agent card with the
 * queue position or the dispatcher's call sign, the pulsing call circle before connect, and
 * the end button or the controls row. The call palette is fixed and never follows the brand.
 */
export function CallScreen({ status }: { readonly status: CzCallStatus }): ReactNode {
  const pill = STATUS[status];
  const connected = status === 'connected';
  return (
    <div className="rx-citizen-call__screen">
      <RCallBackdrop palette="citizen" scrim={connected ? 0.15 : 0.4} silhouette={connected} />
      <div className="rx-citizen-call__ui">
        <span className="rx-citizen-call__top">
          <span className="rx-citizen-call__pill" style={{ color: pill.color }}>
            <RGlyph icon={pill.icon} size={16} />
            <span>{pill.text}</span>
            {pill.dots ? <RLoadingDots color="#ffffff" size={5} className="rx-citizen-call__dots" /> : null}
          </span>
          <span className="rx-citizen-call__card">
            <span className="rx-citizen-call__title">{czCall.title}</span>
            {status === 'queue' ? (
              <>
                <span className="rx-citizen-call__queue">{czQueueLine(czCall.queuePosition)}</span>
                <span className="rx-citizen-call__caption">{czCall.queueCaption}</span>
              </>
            ) : (
              <span className="rx-citizen-call__caption">{czCall.agent}</span>
            )}
          </span>
        </span>
        <span className="rx-citizen-call__center">
          {connected ? null : (
            <span className="rx-citizen-call__pulse">
              <RRipple size={70} color="#ffffff" />
              <RGlyph icon={Phone} size={32} fill="currentColor" />
            </span>
          )}
        </span>
        <span className="rx-citizen-call__bottom">
          {connected ? (
            <CallControls />
          ) : (
            <RGlassButton icon={Phone} size={56} iconSize={28} tone="solid" color="#ef4444" className="rx-citizen-hangup" />
          )}
        </span>
      </div>
    </div>
  );
}
