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
 * The native Switch, drawn: a 36×14 track with a 20px white thumb. With `flipAt` (ms) it slides
 * on at that moment while active; its static position is `on`.
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
   * Going on duty (the 3.1 glimpse, from 'offline'): while active the switch is tapped, slides on
   * with Connecting… for 0.4 s, then the chip reads You're Online (DUTY_TIMELINE). The static
   * picture stays `status`.
   */
  readonly goesOnline?: boolean;
}

/**
 * The duty chip in the map header (OnlineStatusToggle): the dot and label show the live socket
 * state, the switch shows the responder's intent, so Connecting… keeps the switch on.
 */
export function DutyChip({ status, goesOnline = false }: DutyChipProps): ReactNode {
  if (!goesOnline) {
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
          { atMs: 0, node: <DutyLabel status={status} /> },
          { atMs: DUTY_TIMELINE.flipAt, node: <DutyLabel status="connecting" /> },
          { atMs: DUTY_TIMELINE.onlineAt, node: <DutyLabel status="online" /> },
        ]}
        fadeMs={0}
      />
      <DutySwitch on={DUTY[status].on} flipAt={DUTY_TIMELINE.flipAt} />
    </span>
  );
}
