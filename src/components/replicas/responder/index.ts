import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import type { ResponderFigureId } from '@/content/types';

/**
 * Defensys Responder replicas, one per figure 3.1–3.6 (exhaustive by type). W5 replaces each
 * PendingReplica with its screen in wave 2a; pendingFigureIds() counts what is left.
 */
export const responderReplicas = {
  '3.1': PendingReplica,
  '3.2': PendingReplica,
  '3.3': PendingReplica,
  '3.4': PendingReplica,
  '3.5': PendingReplica,
  '3.6': PendingReplica,
} satisfies Record<ResponderFigureId, ReplicaComponent>;
