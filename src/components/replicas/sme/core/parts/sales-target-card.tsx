import { Settings2, Target, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { RCard, RGlyph, RIconChip, RPill, RProgress, RStack, RText } from '@/components/replicas/kit';
import { peso, smeDashboard, smeMonth } from '@/components/replicas/sme/sample-data';
import { SME, withAlpha } from './palette';
import { TYPE } from './type';

/**
 * The Sales Target card (organisms/SalesTargetCard, configured state): a 3 px amber bar, the
 * Target chip, the "72% today" status chip and the edit button, then today's net income against
 * the daily target with the 8 px progress bar (amber from 60%). On the dashboard it sits below
 * the P&L, so the replica draws its upper part only; the weekly and monthly rows are off-screen.
 */
export function SalesTargetCard(): ReactNode {
  const { target } = smeDashboard;
  return (
    <RCard radius={12} border="default" shadow="sm" edge={{ side: 'left', color: SME.target, width: 3 }} pad={[14, 14, 14, 17]}>
      <RStack dir="row" align="center">
        <RIconChip icon={Target} color={SME.target} size={28} radius={8} shape="square" iconSize={16} tint={10.2} />
        <RText {...TYPE.h6} weight={600} color={SME.ink} style={{ flex: 1, marginLeft: 8 }}>
          Sales Target
        </RText>
        <RPill
          label={`${target.percent}% today`}
          color={SME.target}
          bg={withAlpha(SME.target, '1A')}
          icon={TrendingUp}
          iconSize={10}
          style={{ height: 'auto', padding: '3px 7px', gap: 3, fontSize: 12, lineHeight: '16.8px' }}
        />
        <span className="rx-sme-target__edit">
          <RGlyph icon={Settings2} size={14} color={SME.ink2} />
        </span>
      </RStack>
      <RStack dir="row" justify="between" align="start" style={{ marginTop: 8 }}>
        <RStack>
          <RText {...TYPE.bodyXs} color={SME.ink2}>
            {"Today's net income"}
          </RText>
          <RText {...TYPE.h5} weight={700} color={SME.ink} style={{ marginTop: 1 }}>
            {target.sold}
          </RText>
        </RStack>
        <RStack align="end">
          <RText {...TYPE.bodyXs} color={SME.ink2}>
            Target
          </RText>
          <RText {...TYPE.bodySm} weight={600} color={SME.target}>
            {target.target}
          </RText>
        </RStack>
      </RStack>
      <RProgress value={target.percent} color={SME.target} track={SME.gray100} h={8} style={{ marginTop: 8, marginBottom: 4 }} />
      <RText {...TYPE.bodyXs} color={SME.ink2} style={{ marginTop: 2 }}>
        {`${peso(smeMonth.dailyTarget - smeMonth.todaySales)} remaining to hit today's target`}
      </RText>
    </RCard>
  );
}
