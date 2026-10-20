import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import type { SmeFigureId } from '@/content/types';

/** The AI assistant screens: insight and report, restock and forecast, chat, ROI insight. */
export type SmeAiFigureId = Extract<SmeFigureId, '1.6' | '1.7' | '1.8' | '1.9'>;

/**
 * SME Panindio AI replicas, figures 1.6–1.9 (exhaustive by type; a core figure here fails the
 * check). The wave 2a SME AI builder replaces each PendingReplica with its screen;
 * pendingFigureIds() counts what is left. All four are dark (the AI screen-local set in
 * ../sme.css), and their figures come from ../sample-data.ts.
 */
export const smeAiReplicas = {
  '1.6': PendingReplica,
  '1.7': PendingReplica,
  '1.8': PendingReplica,
  '1.9': PendingReplica,
} satisfies Record<SmeAiFigureId, ReplicaComponent>;
