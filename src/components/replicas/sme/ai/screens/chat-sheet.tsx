import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { AI_COPY } from '@/components/replicas/sme/ai/parts/ai-copy';
import { AiSurface } from '@/components/replicas/sme/ai/parts/ai-card';
import { AiScreen, SectionTitle } from '@/components/replicas/sme/ai/parts/ai-screen';
import { ChatSheet } from '@/components/replicas/sme/ai/parts/chat-sheet';
import type { FigureState } from '@/content/apps/figures';

const STATES = ['thread', 'empty', 'offline'] as const satisfies readonly [FigureState<'1.8'>, ...FigureState<'1.8'>[]];

/**
 * FIG 1.8 · "Ask about your business" (AIChatSheet; research ai-chat-sheet), dark, open over the
 * hub. Every answer restates the shop's own figures, and the last one declines to guess the
 * quantities the snapshot does not carry.
 * - thread (default): three questions and their grounded answers.
 * - empty: the greeting and the three suggestion chips.
 * - offline: the question, then "AI needs a connection".
 * Behind the scrim the hub shows its header, the "Business insight" title and the top edge of the
 * insight card (y 148–152, under the sheet), so the card is drawn as its empty shell.
 */
export function ChatSheetScreen({ state }: ReplicaProps): ReactNode {
  const look = pickState(STATES, state);
  return (
    <AiScreen title={AI_COPY.hubTitle} overlay={<ChatSheet look={look} />}>
      <SectionTitle first>{AI_COPY.insightSection}</SectionTitle>
      <AiSurface className="rx-sme-ai-card" style={{ height: 172 }} />
    </AiScreen>
  );
}
