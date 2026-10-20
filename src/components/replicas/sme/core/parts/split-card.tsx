import { Package, ShoppingCart, type LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { RCard, RDivider, RIconChip, RStack, RText } from '@/components/replicas/kit';
import { smeDashboard } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

const SPLIT_LOOK: Readonly<Record<(typeof smeDashboard.split)[number]['id'], { icon: LucideIcon; accent: string }>> = {
  orders: { icon: ShoppingCart, accent: SME.navy },
  units: { icon: Package, accent: SME.green },
};

/** The wide Orders + Production card (OrdersProducedCard): Total Orders | Units Produced, 20/700. */
export function SplitCard(): ReactNode {
  return (
    <RCard radius={12} border="default" shadow="sm" style={{ flexDirection: 'row' }}>
      {smeDashboard.split.map((item, index) => {
        const look = SPLIT_LOOK[item.id];
        return (
          <Fragment key={item.id}>
            {index > 0 ? <RDivider vertical color={SME.gray200} inset={12} /> : null}
            <RStack align="center" pad={16} grow>
              <RIconChip icon={look.icon} color={look.accent} size={32} radius={10} shape="square" iconSize={16} tint={10.2} />
              <RText {...TYPE.h4} weight={700} color={SME.ink} style={{ marginTop: 8 }}>
                {item.value}
              </RText>
              <RText {...TYPE.bodyXs} color={SME.ink2} style={{ marginTop: 2 }}>
                {item.label}
              </RText>
            </RStack>
          </Fragment>
        );
      })}
    </RCard>
  );
}
