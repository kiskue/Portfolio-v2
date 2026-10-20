import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RCard, RIconChip, RText } from '@/components/replicas/kit';
import { SME } from './palette';
import { TYPE } from './type';

export interface StatTileProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly accent: string;
}

/**
 * StatTile, compact variant (molecules/StatTile): a radius-24 tile that floats on its shadow
 * alone in light mode (no border), a 34 px icon chip, the value in the accent, the label and the
 * "412 orders" sub-line at 80%.
 */
export function StatTile({ icon, label, value, sub, accent }: StatTileProps): ReactNode {
  return (
    <RCard radius={24} shadow="sm" pad={12} style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
      <RIconChip icon={icon} color={accent} size={34} radius={11} shape="square" iconSize={16} tint={10.2} />
      <RText {...TYPE.h5} weight={700} color={accent} nowrap>
        {value}
      </RText>
      <RText {...TYPE.bodyXs} weight={500} color={SME.ink2} nowrap>
        {label}
      </RText>
      <RText {...TYPE.bodyXs} color={SME.ink2} nowrap style={{ marginTop: 2, opacity: 0.8 }}>
        {sub}
      </RText>
    </RCard>
  );
}
