import { Bot, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { smeInsight } from '@/components/replicas/sme/sample-data';
import { AI_COPY } from './ai-copy';
import { AiAction } from './ai-action';
import { AiCard } from './ai-card';
import { EnhancePill, EnhanceSequence } from './ai-pills';
import { SectionTitle } from './ai-screen';
import { ENHANCE_TIMING } from './enhance-timing';
import { InsightText, TypedSwap } from './insight-text';
import { ReportBullets } from './report-bullets';

/*
 * The top of the AI Assistant hub (ai.tsx): Business insight, then Business report. The hub is
 * one scroll; a screen stacks the sections its slice shows, top first, and the canvas clips the
 * rest (hub-data.tsx has the sections further down).
 */

/** The insight card's moment: the computed line, waiting for the model, or the AI paragraph. */
export type InsightLook = 'idle' | 'enhancing' | 'enhanced';

/**
 * Business insight: the computed line that always works offline, upgraded by "Enhance with AI".
 * Idle is the 1.6 glimpse's poster: while active it plays Enhancing…, then the AI paragraph
 * types out under "AI-generated" (ENHANCE_TIMING). Enhancing and enhanced are still pictures.
 */
export function InsightSection({ look }: { readonly look: InsightLook }): ReactNode {
  return (
    <>
      <SectionTitle first>{AI_COPY.insightSection}</SectionTitle>
      <AiCard
        label={AI_COPY.insightLabel}
        icon={Bot}
        right={look === 'idle' ? <EnhanceSequence /> : <EnhancePill look={look === 'enhancing' ? 'loading' : 'done'} />}
      >
        {look === 'idle' ? (
          <TypedSwap
            from={smeInsight.computed}
            to={smeInsight.enhanced}
            atMs={ENHANCE_TIMING.arrivedAtMs}
            typingMs={ENHANCE_TIMING.typingMs}
          />
        ) : (
          <InsightText>{look === 'enhanced' ? smeInsight.enhanced : smeInsight.computed}</InsightText>
        )}
      </AiCard>
    </>
  );
}

/** Business report: the idle hint, or the generated bullets; Generate report stays for a regenerate. */
export function ReportSection({ generated }: { readonly generated: boolean }): ReactNode {
  return (
    <>
      <SectionTitle>{AI_COPY.reportSection}</SectionTitle>
      <AiCard
        label={AI_COPY.reportLabel}
        icon={FileText}
        look="report"
        footer={<AiAction label={AI_COPY.generateReport} style={{ margin: '4px 16px 16px' }} />}
      >
        {generated ? <ReportBullets items={smeInsight.report} /> : <span className="rx-sme-ai-hint">{smeInsight.reportHint}</span>}
      </AiCard>
    </>
  );
}
