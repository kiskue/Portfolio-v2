import { Bike, Phone } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { RDivider, RGlyph, RStack, RText, RVTimeline } from '@/components/replicas/kit';
import { smeDelivery, type SmeInfoRow } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

/** A white radius-8 card on the small shadow (Card variant="elevated"), 16 px padding. */
function Card({ title, children, gap }: { readonly title?: string; readonly children: ReactNode; readonly gap?: number }): ReactNode {
  return (
    <RStack gap={gap} className="rx-sme-track__card">
      {title ? (
        <RText {...TYPE.body} weight={700} color={SME.ink} style={{ marginBottom: 14 }}>
          {title}
        </RText>
      ) : null}
      {children}
    </RStack>
  );
}

/** OrderTrackingCard: the rider on the way, the ETA line, an outline Call button and the estimate caveat. */
export function RiderCard(): ReactNode {
  return (
    <Card gap={10}>
      <RStack dir="row" align="center" gap={8}>
        <RGlyph icon={Bike} size={18} color={SME.sky} />
        <RText {...TYPE.body} weight={700} color={SME.ink}>
          {smeDelivery.headline}
        </RText>
      </RStack>
      <RStack dir="row" align="center" gap={12}>
        <RStack grow>
          <RText {...TYPE.bodySm} weight={700} color={SME.ink}>
            {smeDelivery.rider.name}
          </RText>
          <RText {...TYPE.bodyXs} color={SME.ink2}>
            {smeDelivery.riderLine}
          </RText>
        </RStack>
        <span className="rx-sme-track__callbtn">
          <RGlyph icon={Phone} size={16} color={SME.navy} />
          <RText size={14} lh={17} weight={500} color={SME.navy}>
            Call
          </RText>
        </span>
      </RStack>
      <RText {...TYPE.bodyXs} color={SME.ink2}>
        Travel time is an estimate and can change with traffic.
      </RText>
    </Card>
  );
}

/** Order Status: the six-step timeline, done in green, Out for delivery active in #075985. */
export function StatusCard(): ReactNode {
  return (
    <Card title="Order Status">
      <RVTimeline className="rx-sme-timeline" steps={smeDelivery.steps} colors={{ done: SME.green, active: SME.deliveryInk, pending: SME.gray300 }} />
    </Card>
  );
}

/** One InfoRow: the muted label left, the value right (the Total row emphasised in navy). */
function InfoRow({ row }: { readonly row: SmeInfoRow }): ReactNode {
  const type = row.emphasis ? TYPE.body : TYPE.bodySm;
  return (
    <RStack dir="row" align="center" justify="between" gap={12} pad={[6, 0]}>
      <RText {...TYPE.bodySm} color={SME.ink2} style={{ flex: 'none' }}>
        {row.label}
      </RText>
      <RText {...type} weight={row.emphasis ? 700 : 600} color={row.emphasis ? SME.navy : SME.ink} align="end">
        {row.value}
      </RText>
    </RStack>
  );
}

/** Order Summary: the receipt as it stood at order time, in three groups between dividers. */
export function SummaryCard(): ReactNode {
  return (
    <Card title="Order Summary">
      {smeDelivery.summary.map((group, index) => (
        <Fragment key={group[0]?.label ?? index}>
          {index > 0 ? <RDivider color={SME.canvasCustomer} style={{ margin: '8px 0' }} /> : null}
          {group.map((row) => (
            <InfoRow key={row.label} row={row} />
          ))}
        </Fragment>
      ))}
    </Card>
  );
}
