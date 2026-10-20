import type { ReactNode } from 'react';
import type { ReplicaProps } from './types';

const BLOCKS = [148, 196, 120] as const;

/**
 * The stand-in for a replica that is not built yet: a neutral skeleton of the app's canvas
 * with "Replica pending". Registry entries point at this exact function until the app's
 * screen replaces them, so pendingFigureIds() can count what is left.
 */
export function PendingReplica({ state }: ReplicaProps): ReactNode {
  return (
    <div className="rx-pending">
      <div className="rx-pending__bar" />
      <div className="rx-pending__body">
        <div className="rx-pending__note">
          <span className="rx-pending__title">Replica pending</span>
          {state ? <span className="rx-pending__state">{`State: ${state}`}</span> : null}
        </div>
        {BLOCKS.map((height) => (
          <div key={height} className="rx-pending__block" style={{ height }} />
        ))}
      </div>
    </div>
  );
}
