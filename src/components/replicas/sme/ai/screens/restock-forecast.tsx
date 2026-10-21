import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { AI_COPY } from '@/components/replicas/sme/ai/parts/ai-copy';
import { AiScreen } from '@/components/replicas/sme/ai/parts/ai-screen';
import { AskSection, ForecastSection, RestockSection } from '@/components/replicas/sme/ai/parts/hub-data';
import type { FigureState } from '@/content/apps/figures';

const STATES = ['restock', 'forecast'] as const satisfies readonly [FigureState<'1.7'>, ...FigureState<'1.7'>[]];

/**
 * FIG 1.7 · the AI hub further down (ai.tsx and ForecastSection; research
 * ai-hub-restock-forecast), dark. The phone does the math and draws it; the model narrates only
 * when asked, so both cards show the computed line, with "Get AI advice" and "Explain forecast"
 * waiting below them.
 * - restock (default): scrolled to Restock: the flagged items, the advice line and its button.
 * - forecast: scrolled to Sales forecast: history and projection, the three tiles, the forecast
 *   line, then Ask AI below.
 */
export function RestockForecastScreen({ state }: ReplicaProps): ReactNode {
  const look = pickState(STATES, state);
  return (
    <AiScreen title={AI_COPY.hubTitle}>
      {look === 'restock' ? <RestockSection first /> : null}
      {/* Scrolled to Restock, only the "Sales forecast" title reaches the fold (y 815). */}
      <ForecastSection first={look === 'forecast'} titleOnly={look === 'restock'} />
      {look === 'forecast' ? <AskSection /> : null}
    </AiScreen>
  );
}
