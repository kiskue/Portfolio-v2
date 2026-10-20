import { ChevronDown, Mic, PhoneOff, SwitchCamera, User, Video, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { RAvatar, RGlassButton, RGlyph } from '@/components/replicas/kit';
import { responderRoom } from '@/components/replicas/responder/sample-data';
import { CALL } from './palette';

/** ROOM · 2026-000123 (red dot), the participant pill (avatars + LIVE) and the minimise button. */
export function RoomHeader(): ReactNode {
  const people = CALL.participants.slice(0, responderRoom.participants);
  return (
    <div className="rx-responder-roomhead">
      <span className="rx-responder-roompill">
        <span className="rx-responder-roompill__dot" />
        <span>{responderRoom.title}</span>
      </span>
      <span className="rx-responder-roomhead__end">
        <span className="rx-responder-people">
          {people.map((color) => (
            <RAvatar key={color} initials="" icon={User} size={22} bg={color} ring="#0F1018" ringWidth={1.5} textColor="#ffffff" />
          ))}
          <span className="rx-responder-people__dot" />
          <span className="rx-responder-people__live">LIVE</span>
        </span>
        <span className="rx-responder-roomhead__min">
          <RGlyph icon={ChevronDown} size={18} />
        </span>
      </span>
    </div>
  );
}

/** The ACTIVITY log: transcripts in #e5e7eb, join and leave events in italic white 50%. */
export function RoomActivity(): ReactNode {
  return (
    <div className="rx-responder-activity">
      <span className="rx-responder-activity__head">
        <span className="rx-responder-activity__dot" />
        <span>ACTIVITY</span>
      </span>
      {responderRoom.log.map((entry) => (
        <span key={entry.text} className="rx-responder-activity__line" data-kind={entry.kind}>
          {entry.text}
        </span>
      ))}
    </div>
  );
}

/** The 100px hold-to-speak button while transmitting: #34D399 with a dark mic and a pulsing glow, and "Speaking…". */
export function PushToTalk(): ReactNode {
  return (
    <div className="rx-responder-ptt">
      <span className="rx-responder-ptt__btn">
        <span className="rx-responder-ptt__glow" />
        <span className="rx-responder-ptt__circle">
          <RGlyph icon={Mic} size={36} color="#06251A" />
        </span>
      </span>
      <span className="rx-responder-ptt__label">Speaking…</span>
    </div>
  );
}

/** The glass control bar: camera, flip, the 64px red end and the speaker (on). */
export function RoomControls(): ReactNode {
  return (
    <div className="rx-responder-roombar">
      <RGlassButton icon={Video} size={52} iconSize={22} />
      <RGlassButton icon={SwitchCamera} size={52} iconSize={22} />
      <RGlassButton icon={PhoneOff} size={64} tone="solid" color={CALL.danger} iconSize={28} className="rx-responder-glow" />
      <RGlassButton icon={Volume2} size={52} iconSize={22} iconColor={CALL.accent} className="rx-responder-glass-on" />
    </div>
  );
}
