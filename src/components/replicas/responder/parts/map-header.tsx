import type { ReactNode } from 'react';
import { RAppBar } from '@/components/replicas/kit';
import { DutyChip } from './duty-chip';
import type { DutyStatus } from './palette';

export interface MapHeaderProps {
  readonly duty: DutyStatus;
  /** Play going on duty while active (the 3.1 glimpse from 'offline'). */
  readonly goesOnline?: boolean;
}

/**
 * The Emergency Map stack header: hamburger and the 14px SemiBold title in the brand
 * secondary (title ink), on #f8f9fa, with the duty chip on the right.
 */
export function MapHeader({ duty, goesOnline }: MapHeaderProps): ReactNode {
  return (
    <RAppBar
      look="responder"
      title="Emergency Map"
      leading="menu"
      trailing={<DutyChip status={duty} goesOnline={goesOnline} />}
      className="rx-responder-appbar"
    />
  );
}
