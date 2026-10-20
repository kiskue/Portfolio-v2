import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RCard, RIconChip, RText } from '@/components/replicas/kit';
import { SME } from './palette';
import { TYPE } from './type';

export interface KpiCardProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly accent: string;
}

/**
 * A dashboard KPI card (KpiCard in the dashboard screen): a white radius-12 card with a 3 px
 * accent bar, a 28 px icon chip at 10%, the 12/500 label, then the 18/700 value in the accent.
 */
export function KpiCard({ icon, label, value, accent }: KpiCardProps): ReactNode {
  return (
    <RCard
      radius={12}
      border="default"
      shadow="sm"
      edge={{ side: 'left', color: accent, width: 3 }}
      pad={[12, 12, 12, 15]}
      style={{ flex: 1 }}
    >
      <RIconChip icon={icon} color={accent} size={28} radius={8} shape="square" iconSize={14} tint={10.2} />
      <RText {...TYPE.bodyXs} weight={500} color={SME.ink2} nowrap style={{ marginTop: 8 }}>
        {label}
      </RText>
      <RText {...TYPE.h5} weight={700} color={accent} nowrap style={{ marginTop: 2 }}>
        {value}
      </RText>
    </RCard>
  );
}
