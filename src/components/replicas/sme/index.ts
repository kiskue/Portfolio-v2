import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import type { SmeFigureId } from '@/content/types';

/**
 * SME Panindio replicas, one per figure 1.1–1.9 (exhaustive by type). W3 replaces each
 * PendingReplica with its screen in wave 2a; pendingFigureIds() counts what is left.
 */
export const smeReplicas = {
  '1.1': PendingReplica,
  '1.2': PendingReplica,
  '1.3': PendingReplica,
  '1.4': PendingReplica,
  '1.5': PendingReplica,
  '1.6': PendingReplica,
  '1.7': PendingReplica,
  '1.8': PendingReplica,
  '1.9': PendingReplica,
} satisfies Record<SmeFigureId, ReplicaComponent>;
