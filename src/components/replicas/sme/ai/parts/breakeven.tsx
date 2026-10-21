import { TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, rStyle } from '@/components/replicas/kit';
import { smeRoi, type SmeRisk } from '@/components/replicas/sme/sample-data';
import { formatNumber } from '@/lib/format';
import { AI_COPY } from './ai-copy';
import { RoiSectionTitle } from './ai-screen';

/*
 * Business ROI's next section after the AI block (business-roi.tsx section 6): "Breakeven
 * Progress" (the BreakevenProgress molecule) and the callout under it, from smeRoi.breakeven for
 * the state's risk. The sentences are the molecule's and the screen's own templates.
 */

/**
 * The screen's health colour (roiHealthColor), which tints the section icon and the callout:
 * green for an ROI of 20% or more, amber from 10%, red below. Each risk class sits in one band
 * (low needs 25%+, this medium shop has 18.5%, high is under 10%).
 */
const HEALTH: Readonly<Record<SmeRisk, string>> = {
  low: 'var(--rx-sme-risk-low)',
  medium: 'var(--rx-sme-ai-x-amber)',
  high: 'var(--rx-sme-risk-high)',
};

/** The molecule's bar colour: green once reached, amber from half way, otherwise the accent blue. */
function fillColor(ratio: number): string {
  if (ratio >= 1) return 'var(--rx-sme-risk-low)';
  return ratio >= 0.5 ? 'var(--rx-sme-ai-x-amber)' : 'var(--rx-sme-ai-accent)';
}

/** The section title, the progress card (radius 12, 14 px padding) and, while units remain, the callout banner. */
export function BreakevenSection({ risk }: { readonly risk: SmeRisk }): ReactNode {
  const { sold, goal, remaining, percent } = smeRoi.breakeven[risk];
  const ratio = Math.min(sold / goal, 1);
  const colors = rStyle({ '--rx-sme-ai-x-fill': fillColor(ratio), '--rx-sme-ai-x-health': HEALTH[risk] });
  const [soldText, goalText, remainingText] = [sold, goal, remaining].map((units) => formatNumber(units));
  return (
    <>
      <RoiSectionTitle icon={TrendingUp} color={HEALTH[risk]}>
        {AI_COPY.breakevenSection}
      </RoiSectionTitle>
      <span className="rx-sme-ai-breakeven" style={colors}>
        <span className="rx-sme-ai-breakeven__head">
          <span>{AI_COPY.breakevenSection}</span>
          <span className="rx-sme-ai-breakeven__pct">{`${percent}%`}</span>
        </span>
        <span className="rx-sme-ai-breakeven__track">
          <span className="rx-sme-ai-breakeven__fill" style={{ width: `${percent}%` }} />
          <span className="rx-sme-ai-breakeven__goal" />
        </span>
        <span className="rx-sme-ai-breakeven__units">
          <span>{`${soldText} sold`}</span>
          <span>{`Goal: ${goalText} units`}</span>
        </span>
        <span className="rx-sme-ai-breakeven__summary">
          {remaining > 0 ? `You've sold ${soldText} units. Need ${remainingText} more to break even.` : `You've reached breakeven! ${soldText} units sold.`}
        </span>
      </span>
      {remaining > 0 ? (
        <span className="rx-sme-ai-callout" style={colors}>
          <RGlyph icon={TrendingUp} size={14} />
          <span>{`Sell ${remainingText} more units to reach breakeven`}</span>
        </span>
      ) : null}
    </>
  );
}
