import type { ReactNode } from 'react';
import { pickState, RStack, type ReplicaProps } from '@/components/replicas/kit';
import { CustomerHeader } from '@/components/replicas/sme/core/parts/customer-header';
import { DeliveryMap } from '@/components/replicas/sme/core/parts/delivery-map';
import { RiderCard, StatusCard, SummaryCard } from '@/components/replicas/sme/core/parts/order-cards';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { smeDelivery, smeStorefront } from '@/components/replicas/sme/sample-data';
import type { FigureState } from '@/content/apps/figures';

const STATES = ['tracking', 'expanded'] as const satisfies readonly FigureState<'1.5'>[];

/**
 * FIG 1.5, live delivery tracking (sme-app.json live-order-tracking), seen by the suki who
 * ordered: the navy header with a back chevron and "Order #10482", then either the 220 px map
 * band over the rider card, the order status timeline and the summary (tracking; the rider glides
 * along the road while active), or the map expanded to fill the screen (expanded). The bell's
 * unread count is the storefront's: the same customer. The bottom 34 px stay the canvas colour
 * (the screen's safe-area inset).
 */
export function LiveOrderTracking({ state }: ReplicaProps): ReactNode {
  const expanded = pickState(STATES, state) === 'expanded';
  return (
    <RStack className="rx-sme-screen rx-sme-track" bg={SME.canvasCustomer}>
      <CustomerHeader title={smeDelivery.title} back unread={smeStorefront.unread} />
      <DeliveryMap expanded={expanded} />
      {expanded ? null : (
        <RStack gap={12} className="rx-sme-track__scroll">
          <RiderCard />
          <StatusCard />
          <SummaryCard />
        </RStack>
      )}
    </RStack>
  );
}
