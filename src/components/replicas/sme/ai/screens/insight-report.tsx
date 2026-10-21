import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { AI_COPY } from '@/components/replicas/sme/ai/parts/ai-copy';
import { AiScreen } from '@/components/replicas/sme/ai/parts/ai-screen';
import { RestockSection } from '@/components/replicas/sme/ai/parts/hub-data';
import { InsightSection, ReportSection } from '@/components/replicas/sme/ai/parts/hub-insight';
import type { FigureState } from '@/content/apps/figures';

const STATES = ['enhanced', 'idle', 'enhancing'] as const satisfies readonly [FigureState<'1.6'>, ...FigureState<'1.6'>[]];

/**
 * FIG 1.6 · AI Assistant hub, top of the scroll (ai.tsx; research ai-hub-insight-report), dark.
 * - enhanced (default): the AI paragraph under "AI-generated", and a generated report.
 * - idle: the computed line and "Enhance with AI"; the report's idle hint. While active it plays
 *   the Home glimpse (ENHANCE_TIMING): Enhancing…, then the paragraph types out under
 *   "AI-generated". The idle card is the poster.
 * - enhancing: the spinner and "Enhancing…" over the computed line (the body keeps its text
 *   while the request runs, as in the app).
 * Restock starts below the fold.
 */
export function InsightReportScreen({ state }: ReplicaProps): ReactNode {
  const look = pickState(STATES, state);
  return (
    <AiScreen title={AI_COPY.hubTitle}>
      <InsightSection look={look} />
      <ReportSection generated={look === 'enhanced'} />
      {/*
       * Restock starts near the fold: its first row from y 811 under the generated report, its
       * first two from y 615 under the idle hint (the glimpse only pushes them further down).
       */}
      <RestockSection peek={look === 'enhanced' ? 1 : 2} />
    </AiScreen>
  );
}
