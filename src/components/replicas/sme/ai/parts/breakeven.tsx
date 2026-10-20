import { TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { smeRoi } from '@/components/replicas/sme/sample-data';
import { formatNumber } from '@/lib/format';
import { AI_COPY } from './ai-copy';
import { RoiSectionTitle } from './ai-screen';

/*
 * Business ROI's next section after the AI block: "Breakeven Progress" (the BreakevenProgress
 * molecule) and the callout under it. Units sold against the break-even goal come from smeRoi;
 * the sentences are the molecule's and the screen's own templates. Amber: the bar at 50% or more,
 * and the screen's health colour for an ROI from 10% to under 20%.
 */

const SOLD = formatNumber(smeRoi.unitsSoldToDate);
const GOAL = formatNumber(smeRoi.breakevenUnits);
const REMAINING = formatNumber(Math.max(0, smeRoi.breakevenUnits - smeRoi.unitsSoldToDate));

/** The section title, the progress card (radius 12, 14 px padding) and the callout banner. */
export function BreakevenSection(): ReactNode {
  return (
    <>
      <RoiSectionTitle icon={TrendingUp} color="var(--rx-sme-ai-x-amber)">
        {AI_COPY.breakevenSection}
      </RoiSectionTitle>
      <span className="rx-sme-ai-breakeven">
        <span className="rx-sme-ai-breakeven__head">
          <span>{AI_COPY.breakevenSection}</span>
          <span className="rx-sme-ai-breakeven__pct">{smeRoi.card.breakeven}</span>
        </span>
        <span className="rx-sme-ai-breakeven__track">
          <span className="rx-sme-ai-breakeven__fill" style={{ width: smeRoi.card.breakeven }} />
          <span className="rx-sme-ai-breakeven__goal" />
        </span>
        <span className="rx-sme-ai-breakeven__units">
          <span>{`${SOLD} sold`}</span>
          <span>{`Goal: ${GOAL} units`}</span>
        </span>
        <span className="rx-sme-ai-breakeven__summary">{`You've sold ${SOLD} units. Need ${REMAINING} more to break even.`}</span>
      </span>
      <span className="rx-sme-ai-callout">
        <RGlyph icon={TrendingUp} size={14} />
        <span>{`Sell ${REMAINING} more units to reach breakeven`}</span>
      </span>
    </>
  );
}
