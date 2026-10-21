import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { RButton, RIconChip, RModalCard, RProgress, RStateSequence } from '@/components/replicas/kit';
import { czSos } from '@/components/replicas/citizen/sample-data';
import { CZ_SOS_TIMELINE } from './timeline';

/** The countdown frames shown: 5s, 4s, 3s (the poster rests on 3s with the bar at 60%). */
const SHOWN = [5, 4, 3] as const;
const POSTER_FRAME = 2;
const TICK_MS = CZ_SOS_TIMELINE.tickMs;

export interface SosConfirmProps {
  /** When the popup appears, in ms after the step becomes active (the countdown ticks from here). */
  readonly startMs: number;
}

/**
 * The SOS confirmation (EmergencyCallPopup.tsx): a full-screen blur over #374151 and a white
 * card, 92% wide, radius 21, padding 28. Header tile #fee2e2 with the red alert, the warning
 * paragraph, "Auto-confirming in" with the seconds, a 7 px #e5e7eb track whose #ec4899 fill
 * shrinks each second, Cancel (#f3f4f6) and Confirm Call (#dc2626), and the footer. Every
 * colour here is the fixed emergency palette: none follows the brand.
 */
export function SosConfirm({ startMs }: SosConfirmProps): ReactNode {
  return (
    <RModalCard scrim="rgb(55 65 81 / 0.86)" blur={20} width="92%" radius={21} pad={28} className="rx-citizen-sosm">
      <span className="rx-citizen-sosm__head">
        <RIconChip icon={CircleAlert} color="#dc2626" bg="#fee2e2" size={42} radius={7} shape="square" iconSize={24} />
        <span className="rx-citizen-sosm__titles">
          <span className="rx-citizen-sosm__title">{czSos.title}</span>
          <span className="rx-citizen-sosm__sub">{czSos.subtitle}</span>
        </span>
      </span>
      <span className="rx-citizen-sosm__body">{czSos.body}</span>
      <span className="rx-citizen-sosm__timer">
        <span className="rx-citizen-sosm__row">
          <span className="rx-citizen-sosm__label">{czSos.timerLabel}</span>
          <RStateSequence
            className="rx-citizen-sosm__count"
            frames={SHOWN.map((seconds, index) => ({ atMs: startMs + index * TICK_MS, node: `${seconds}s` }))}
            posterFrame={POSTER_FRAME}
            fadeMs={90}
          />
        </span>
        <RProgress
          value={(SHOWN[POSTER_FRAME] / czSos.seconds) * 100}
          track="#e5e7eb"
          color="#ec4899"
          h={7}
          className="rx-citizen-sosm__bar"
        />
      </span>
      <span className="rx-citizen-sosm__actions">
        <RButton look="solid" label={czSos.cancel} color="#f3f4f6" textColor="#111827" h={42} radius={7} fontSize={14} className="rx-citizen-sosm__btn" />
        <RButton look="danger" label={czSos.confirm} h={42} radius={7} fontSize={14} className="rx-citizen-sosm__btn rx-citizen-sosm__confirm" />
      </span>
      <span className="rx-citizen-sosm__foot">{czSos.footer}</span>
    </RModalCard>
  );
}
