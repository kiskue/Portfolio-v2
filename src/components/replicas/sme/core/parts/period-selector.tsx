import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RSegmented, RStack, RText } from '@/components/replicas/kit';
import { smeDashboard, smeToday } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

const PERIODS = ['Day', 'Week', 'Month', 'Year'] as const;

/**
 * PeriodSelector in navigator mode: four equal pills (the active one navy) and, below, the
 * navigator with the tappable, underlined period label. The next arrow is dimmed because the
 * current month has no future period. Pill and navigator colours live in core.css.
 */
export function PeriodSelector(): ReactNode {
  const active = PERIODS.findIndex((period) => period === smeDashboard.period);
  return (
    <RStack gap={8}>
      <RSegmented className="rx-sme-period" look="pills" options={PERIODS} active={active} />
      <RStack dir="row" align="center" className="rx-sme-period__nav">
        <span className="rx-sme-period__arrow">
          <RGlyph icon={ChevronLeft} size={18} strokeWidth={2.5} />
        </span>
        <RStack dir="row" align="center" justify="center" gap={4} grow style={{ padding: '4px 0' }}>
          <RText {...TYPE.bodySm} weight={600} color={SME.gray800} className="rx-sme-period__label">
            {smeToday.month}
          </RText>
          <RGlyph icon={ChevronDown} size={13} strokeWidth={2.5} color={SME.ink2} />
        </RStack>
        <span className="rx-sme-period__arrow" data-disabled="">
          <RGlyph icon={ChevronRight} size={18} strokeWidth={2.5} />
        </span>
      </RStack>
    </RStack>
  );
}
