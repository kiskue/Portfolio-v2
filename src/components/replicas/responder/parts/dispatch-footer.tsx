import type { ReactNode } from 'react';
import { ms, RButton, RStateSequence, rStyle } from '@/components/replicas/kit';
import { DISPATCH } from './palette';

/** The ticket's status in the dispatch lifecycle: 0 new, 2 en route, 3 arrived. */
export type TicketStage = 'new' | 'en-route' | 'arrived';

const LABELS = {
  new: { secondary: 'DECLINE', primary: 'ACCEPT' },
  'en-route': { secondary: 'CANCEL', primary: 'ARRIVE' },
  arrived: { secondary: 'ADD UPDATE', primary: 'RESOLVE' },
} as const satisfies Record<TicketStage, { secondary: string; primary: string }>;

function Buttons({ stage, pressAt }: { readonly stage: TicketStage; readonly pressAt?: number }): ReactNode {
  const danger = stage === 'new';
  return (
    <span className="rx-responder-footer__row">
      <RButton
        look="outline"
        label={LABELS[stage].secondary}
        color={danger ? DISPATCH.danger : DISPATCH.navy}
        borderColor={danger ? 'rgba(239,68,68,0.3)' : 'rgba(8,84,153,0.22)'}
        h={50}
        radius={14}
        fontSize={13}
        className="rx-responder-footbtn"
      />
      <RButton
        look="solid"
        label={LABELS[stage].primary}
        color={DISPATCH.navy}
        h={50}
        radius={14}
        fontSize={13}
        className={pressAt === undefined ? 'rx-responder-footbtn' : 'rx-responder-footbtn rx-responder-footbtn--press'}
        style={rStyle({ '--rx-responder-press-at': pressAt === undefined ? undefined : ms(pressAt) })}
      />
    </span>
  );
}

export interface DispatchFooterProps {
  readonly stage: TicketStage;
  /** Switch from en route to arrived at this time while active (the 3.3 drive); the static picture is `stage`. */
  readonly arrivesAt?: number;
  /** Press the primary button at this time while active (the 3.2 glimpse's ACCEPT tap). */
  readonly pressAt?: number;
}

/**
 * The pinned footer of the dispatch sheet: two equal radius-14 buttons, 13px Bold with 0.9
 * tracking, outline secondary (red DECLINE for a new ticket) and solid navy primary with a glow.
 */
export function DispatchFooter({ stage, arrivesAt, pressAt }: DispatchFooterProps): ReactNode {
  return (
    <div className="rx-responder-footer">
      {arrivesAt === undefined ? (
        <Buttons stage={stage} pressAt={pressAt} />
      ) : (
        <RStateSequence
          frames={[
            { atMs: 0, node: <Buttons stage={stage} /> },
            { atMs: arrivesAt, node: <Buttons stage="arrived" /> },
          ]}
          fadeMs={0}
        />
      )}
    </div>
  );
}
