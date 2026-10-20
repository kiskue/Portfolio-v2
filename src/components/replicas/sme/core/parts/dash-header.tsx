import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { RIconChip, RStack, RText } from '@/components/replicas/kit';
import { smeDashboard } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

/** The dashboard greeting (DashboardHeader): greeting and long date, and the 40 px refresh button. */
export function DashHeader(): ReactNode {
  return (
    <RStack dir="row" align="center" justify="between" style={{ marginBottom: 20 }}>
      <RStack grow style={{ marginRight: 12 }}>
        <RText {...TYPE.h5} weight={700} color={SME.ink} nowrap>
          {smeDashboard.greeting}
        </RText>
        <RText {...TYPE.bodySm} color={SME.ink2} style={{ marginTop: 2 }}>
          {smeDashboard.date}
        </RText>
      </RStack>
      <RIconChip icon={RefreshCw} color={SME.navy} bg={SME.gray100} size={40} shape="circle" iconSize={18} />
    </RStack>
  );
}
