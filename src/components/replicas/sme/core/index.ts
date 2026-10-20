import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import type { SmeFigureId } from '@/content/types';

/** The owner, customer and rider screens: dashboard, POS, credit ledger, storefront and delivery. */
export type SmeCoreFigureId = Extract<SmeFigureId, '1.1' | '1.2' | '1.3' | '1.4' | '1.5'>;

/**
 * SME Panindio core replicas, figures 1.1–1.5 (exhaustive by type; an AI figure here fails the
 * check). The wave 2a SME core builder replaces each PendingReplica with its screen;
 * pendingFigureIds() counts what is left. Copy and figures come from ../sample-data.ts.
 */
export const smeCoreReplicas = {
  '1.1': PendingReplica,
  '1.2': PendingReplica,
  '1.3': PendingReplica,
  '1.4': PendingReplica,
  '1.5': PendingReplica,
} satisfies Record<SmeCoreFigureId, ReplicaComponent>;
