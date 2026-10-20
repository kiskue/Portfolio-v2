import { ChevronRight, CircleCheck, Phone, PiggyBank } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RProgress, RStack, RText } from '@/components/replicas/kit';
import { peso, smeCustomer, type SmeLedgerRow } from '@/components/replicas/sme/sample-data';
import { MEDAL, SME, STANDING, withAlpha } from './palette';
import { TYPE } from './type';

/** A standing tag beside an advance or a fully paid customer (CreditStandingBadge, size sm). */
function StandingTag({ row }: { readonly row: SmeLedgerRow }): ReactNode {
  const tone = row.standing === 'advance' ? STANDING.advance : STANDING.paid;
  return (
    <span className="rx-sme-rank__tag" style={{ background: tone.bg, borderColor: withAlpha(tone.text, '33'), color: tone.text }}>
      <RGlyph icon={row.standing === 'advance' ? PiggyBank : CircleCheck} size={10} />
      <RText size={10} lh={12} weight={700} nowrap>
        {row.amountLabel}
      </RText>
    </span>
  );
}

/** The rank badge colours: a medal for the top three debtors, violet after them, else the standing's. */
function badgeLook(row: SmeLedgerRow): { readonly text: string; readonly bg: string; readonly border: string } {
  if (row.medal) {
    const medal = MEDAL[row.medal];
    return { text: medal, bg: withAlpha(medal, '22'), border: withAlpha(medal, '44') };
  }
  if (row.standing === 'due') return { text: SME.violet, bg: withAlpha(SME.violet, '12'), border: withAlpha(SME.violet, '30') };
  const tone = STANDING[row.standing];
  return { text: tone.text, bg: tone.bg, border: withAlpha(tone.text, '33') };
}

/** One of the three centred stat columns. */
function Stat({ label, value, color }: { readonly label: string; readonly value: string; readonly color: string }): ReactNode {
  return (
    <RStack align="center" gap={2} grow>
      <RText {...TYPE.bodyXs} color={SME.ink2}>
        {label}
      </RText>
      <RText {...TYPE.bodyXs} weight={600} color={color}>
        {value}
      </RText>
    </RStack>
  );
}

/**
 * A customer's rank card (RankCard in credit/index.tsx): a 3 px bar (medal, violet or the
 * standing's hue), the rank badge or initial, name and masked phone, the amount due (amber under
 * ₱1,000) or a standing tag, the share-paid bar and Total Credit · Paid · Due.
 */
export function RankCard({ row }: { readonly row: SmeLedgerRow }): ReactNode {
  const due = row.standing === 'due';
  const amountColor = due ? (row.small ? SME.targetInk : STANDING.due.text) : STANDING[row.standing].text;
  const bar = row.medal ? MEDAL[row.medal] : due ? SME.violet : STANDING[row.standing].accent;
  const badge = badgeLook(row);
  const customer = smeCustomer(row.customer);
  const third = due ? { label: 'Due', value: row.stats.due } : row.standing === 'advance' ? { label: 'Advance', value: peso(customer.paid - customer.credit) } : { label: 'Balance', value: row.stats.due };
  return (
    <div className="rx-sme-rank">
      <span className="rx-sme-rank__bar" style={{ background: bar }} />
      <RStack gap={10} pad={[12, 16]} grow>
        <RStack dir="row" align="center" gap={10}>
          <span className="rx-sme-rank__badge" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
            <RText {...TYPE.bodyXs} weight={700}>
              {row.rank ?? row.initial}
            </RText>
          </span>
          <RStack gap={3} grow style={{ minWidth: 64 }}>
            <RText {...TYPE.body} weight={600} color={SME.gray800} nowrap>
              {row.name}
            </RText>
            <RStack dir="row" align="center" gap={3}>
              <RGlyph icon={Phone} size={10} color={SME.ink2} />
              <RText {...TYPE.bodyXs} color={SME.ink2} nowrap>
                {row.phone}
              </RText>
            </RStack>
          </RStack>
          <RStack dir="row" align="center" gap={6}>
            {due ? (
              <RText {...TYPE.h6} weight={700} color={amountColor} nowrap>
                {row.amountLabel}
              </RText>
            ) : (
              <StandingTag row={row} />
            )}
            <RGlyph icon={ChevronRight} size={16} color={SME.ink2} />
          </RStack>
        </RStack>
        <RProgress value={row.paidShare} color={due ? SME.violet : STANDING[row.standing].accent} track={SME.gray100} h={8} />
        <RStack dir="row" align="center">
          <Stat label="Total Credit" value={row.stats.credit} color={SME.gray800} />
          <span className="rx-sme-rank__divider" />
          <Stat label="Paid" value={row.stats.paid} color={SME.pay} />
          <span className="rx-sme-rank__divider" />
          <Stat label={third.label} value={third.value} color={amountColor} />
        </RStack>
      </RStack>
    </div>
  );
}
