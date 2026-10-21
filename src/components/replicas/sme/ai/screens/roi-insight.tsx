import { Activity, Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { AI_COPY } from '@/components/replicas/sme/ai/parts/ai-copy';
import { AiAction } from '@/components/replicas/sme/ai/parts/ai-action';
import { AiCard } from '@/components/replicas/sme/ai/parts/ai-card';
import { EnhancePill, RiskBadge } from '@/components/replicas/sme/ai/parts/ai-pills';
import { AiScreen, RoiSectionTitle } from '@/components/replicas/sme/ai/parts/ai-screen';
import { BreakevenSection } from '@/components/replicas/sme/ai/parts/breakeven';
import { InsightText } from '@/components/replicas/sme/ai/parts/insight-text';
import { TopProductsSection } from '@/components/replicas/sme/ai/parts/roi-products';
import { SmeLogo } from '@/components/replicas/sme/parts/sme-logo';
import { smeRoi } from '@/components/replicas/sme/sample-data';
import type { FigureState } from '@/content/apps/figures';

const STATES = ['medium', 'low', 'high'] as const satisfies readonly [FigureState<'1.9'>, ...FigureState<'1.9'>[]];

/**
 * FIG 1.9 · Business ROI scrolled to its AI block (business-roi.tsx sections 5–7 and
 * AIInsightCard; research roi-ai-insight-risk), dark. The header has no title on this route, so
 * the TopNavBar shows the SME wordmark. The rule-based risk sets the badge, the accent bar and
 * the glow; "Enhance with AI" would let the model reword the sentence, and "Ask AI about this"
 * opens the chat scoped to ROI. Below the AI block the screen continues as the app does:
 * Breakeven Progress with its callout, then Top Products by Revenue into the fold.
 * - medium (default): this shop (18.5% ROI on ₱300,000; 7,040 of 11,000 units to break even).
 * - low, high: the app's own example sentences for those levels, with Breakeven Progress sized
 *   to each sentence (smeRoi.breakeven) and the bar and callout in that level's colours.
 */
export function RoiInsightScreen({ state }: ReplicaProps): ReactNode {
  const risk = pickState(STATES, state);
  return (
    <AiScreen logo={<SmeLogo variant="wordmark" size="xs" />}>
      <RoiSectionTitle icon={Activity} color="var(--rx-sme-ai-activity)">
        {AI_COPY.roiSection}
      </RoiSectionTitle>
      <AiCard
        label={AI_COPY.roiLabel}
        icon={Bot}
        right={
          <>
            <EnhancePill look="idle" />
            <RiskBadge risk={risk} />
          </>
        }
        accent={`var(--rx-sme-risk-${risk})`}
        glow={`var(--rx-sme-ai-x-glow-${risk})`}
        style={{ marginBottom: 12 }}
      >
        <InsightText>{smeRoi.insight[risk]}</InsightText>
      </AiCard>
      <AiAction label={AI_COPY.askAbout} pad={12} style={{ marginBottom: 20 }} />
      <BreakevenSection risk={risk} />
      <TopProductsSection />
    </AiScreen>
  );
}
