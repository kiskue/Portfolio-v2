import type { ReactNode } from 'react';
import { ms, RBottomSheet, rStyle } from '@/components/replicas/kit';
import { cn } from '@/lib/cn';
import { DispatchBand, DispatchToolbar } from './dispatch-band';
import type { TicketStage } from './dispatch-footer';
import { MAP_AREA } from './map-scene';
import { DISPATCH } from './palette';

/** The sheet's container is the map area under the status bar and the header. */
const SHEET_CONTAINER = MAP_AREA.height;

/** Snap points 18% / 50% / 85% of the container (the 18% peek is not drawn). */
export const SHEET_SNAP = {
  half: Math.round(SHEET_CONTAINER * 0.5),
  full: Math.round(SHEET_CONTAINER * 0.85),
} as const;

export type SheetSnap = keyof typeof SHEET_SNAP;

/** How far above the canvas bottom the map FABs sit for a snap (52% / 87% of the container). */
export const FAB_BOTTOM = {
  half: Math.round(SHEET_CONTAINER * 0.52),
  full: Math.round(SHEET_CONTAINER * 0.87),
} as const satisfies Record<SheetSnap, number>;

export interface DispatchSheetProps {
  readonly snap: SheetSnap;
  readonly stage: TicketStage;
  readonly footer: ReactNode;
  /** Rise from below to the snap at this time while active (3.2 'toast'); the poster is risen. */
  readonly riseAt?: number;
  readonly children?: ReactNode;
}

/**
 * The assigned-ticket sheet (AssignedTicketBottomSheet): #f2f5f9, top radius 22, a 40×5 navy
 * handle, the navy band and the toolbar, a scrolling body, and the pinned two-button footer.
 * The dispatch UI is the same in every brand.
 */
export function DispatchSheet({ snap, stage, footer, riseAt, children }: DispatchSheetProps): ReactNode {
  return (
    <RBottomSheet
      height={SHEET_SNAP[snap]}
      radius={22}
      handle={{ color: DISPATCH.navy, width: 40, height: 5 }}
      bg="#f2f5f9"
      className={cn('rx-responder-sheet', riseAt === undefined ? undefined : 'rx-responder-sheet--rise')}
      style={rStyle({ '--rx-responder-rise-at': riseAt === undefined ? undefined : ms(riseAt) })}
      header={
        <>
          <DispatchBand join={stage !== 'new'} />
          <DispatchToolbar accepted={stage !== 'new'} />
        </>
      }
      footer={footer}
    >
      <div className="rx-responder-sheet__content">{children}</div>
    </RBottomSheet>
  );
}
