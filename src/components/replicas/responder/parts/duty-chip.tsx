import type { ReactNode } from 'react';
import { ms, RStateSequence, rStyle } from '@/components/replicas/kit';
import { DUTY, type DutyStatus } from './palette';
import { DUTY_TIMELINE } from './timeline';

function DutyLabel({ status }: { readonly status: DutyStatus }): ReactNode {
  return (
    <span className="rx-responder-duty__label">
      <span className="rx-responder-duty__dot" style={{ background: DUTY[status].dot }} />
      <span className="rx-responder-duty__text">{DUTY[status].label}</span>
    </span>
  );
}

/**
 * The native Switch, drawn: a 36×14 track with a 20px white thumb. `flipAt` (ms) slides it on
 * at that moment while active; its poster is the on position.
 */
function DutySwitch({ on, flipAt }: { readonly on: boolean; readonly flipAt?: number }): ReactNode {
  return (
    <span
      className="rx-responder-switch"
      data-on={on ? '' : undefined}
      data-flip={flipAt === undefined ? undefined : ''}
      style={rStyle({ '--rx-responder-flip-at': flipAt === undefined ? undefined : ms(flipAt) })}
    >
      <span className="rx-responder-switch__track" />
      <span className="rx-responder-switch__thumb" />
    </span>
  );
}

export interface DutyChipProps {
  readonly status: DutyStatus;
  /**
   * Play the 3.1 glimpse while active: You're Offline → (tap) Connecting… for 0.4 s → You're
   * Online, with the switch sliding on. The poster is You're Online.
   */
  readonly animated?: boolean;
}

/**
 * The duty chip in the map header (OnlineStatusToggle): the dot and label show the live socket
 * state, the switch shows the responder's intent, so Connecting… keeps the switch on.
 */
export function DutyChip({ status, animated = false }: DutyChipProps): ReactNode {
  if (!animated) {
    return (
      <span className="rx-responder-duty">
        <DutyLabel status={status} />
        <DutySwitch on={DUTY[status].on} />
      </span>
    );
  }
  return (
    <span className="rx-responder-duty">
      <RStateSequence
        frames={[
          { atMs: 0, node: <DutyLabel status="offline" /> },
          { atMs: DUTY_TIMELINE.flipAt, node: <DutyLabel status="connecting" /> },
          { atMs: DUTY_TIMELINE.onlineAt, node: <DutyLabel status="online" /> },
        ]}
        posterFrame={2}
        fadeMs={0}
      />
      <DutySwitch on flipAt={DUTY_TIMELINE.flipAt} />
    </span>
  );
}
