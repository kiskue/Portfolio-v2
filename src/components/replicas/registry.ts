import { citizenReplicas } from '@/components/replicas/citizen';
import { PendingReplica, type ReplicaComponent } from '@/components/replicas/kit';
import { responderReplicas } from '@/components/replicas/responder';
import { smeReplicas } from '@/components/replicas/sme';
import { figures } from '@/content/apps/figures';
import type { FigureId } from '@/content/types';

export type { ReplicaComponent, ReplicaProps } from '@/components/replicas/kit';

/**
 * Every replica screen by figure id: exhaustive at compile time (a figure without a screen, or
 * a screen without a figure, fails the type check). ScreenView is the only consumer: it renders
 * replicas[figure] inside RCanvas inside PhoneFrame.
 */
export const replicas = { ...smeReplicas, ...citizenReplicas, ...responderReplicas } satisfies Record<
  FigureId,
  ReplicaComponent
>;

/** Figures (in figures.ts order) still drawn by PendingReplica. Wave 3 brings this to zero. */
export function pendingFigureIds(): readonly FigureId[] {
  return figures.filter((figure) => replicas[figure.id] === PendingReplica).map((figure) => figure.id);
}
