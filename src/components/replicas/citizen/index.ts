import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import type { CitizenFigureId } from '@/content/types';

/**
 * Defensys Citizen replicas, one per figure 2.1–2.6 (exhaustive by type). W4 replaces each
 * PendingReplica with its screen in wave 2a; pendingFigureIds() counts what is left.
 */
export const citizenReplicas = {
  '2.1': PendingReplica,
  '2.2': PendingReplica,
  '2.3': PendingReplica,
  '2.4': PendingReplica,
  '2.5': PendingReplica,
  '2.6': PendingReplica,
} satisfies Record<CitizenFigureId, ReplicaComponent>;
