import { CircleAlert, CircleCheck, CreditCard, PiggyBank, User, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RIconChip, RStack, RText } from '@/components/replicas/kit';
import { smeLedger } from '@/components/replicas/sme/sample-data';
import { SME, STANDING, withAlpha } from './palette';
import { TYPE } from './type';

type Filter = keyof typeof smeLedger.counts;

/** The four filter pills: hue (wash and border) and AA text colour, as filterPillColors pairs them. */
const FILTERS: readonly { readonly id: Filter; readonly label: string; readonly icon: LucideIcon; readonly hue: string; readonly text: string }[] = [
  { id: 'all', label: 'All', icon: User, hue: SME.violet, text: SME.violet },
  { id: 'due', label: 'Due', icon: CircleAlert, hue: SME.target, text: SME.targetInk },
  { id: 'advance', label: 'Advance', icon: PiggyBank, hue: STANDING.advance.accent, text: STANDING.advance.text },
  { id: 'paid', label: 'Fully paid', icon: CircleCheck, hue: STANDING.paid.accent, text: STANDING.paid.text },
];

/** All is the active filter (10% wash, solid border); the rest are 6% washes with 19% borders. */
function FilterPill({ filter, on }: { readonly filter: (typeof FILTERS)[number]; readonly on: boolean }): ReactNode {
  return (
    <span
      className="rx-sme-ledger__pill"
      style={{
        background: withAlpha(filter.hue, on ? '1A' : '0F'),
        borderColor: on ? filter.hue : withAlpha(filter.hue, '30'),
        color: filter.text,
      }}
    >
      <RGlyph icon={filter.icon} size={12} />
      <RText {...TYPE.bodyXs} weight={on ? 600 : 400} nowrap>
        {`${smeLedger.counts[filter.id]} ${filter.label}`}
      </RText>
    </span>
  );
}

/** One half of the stat block: a 12 px label over a 14/700 total. */
function Total({ label, value, color }: { readonly label: string; readonly value: string; readonly color: string }): ReactNode {
  return (
    <RStack align="center" justify="between" gap={3} grow pad={[10, 0]}>
      <RText {...TYPE.bodyXs} color={SME.ink2} align="center">
        {label}
      </RText>
      <RText {...TYPE.bodySm} weight={700} color={color}>
        {value}
      </RText>
    </RStack>
  );
}

/**
 * The credit ledger hero (HeroCard): radius 20 with a 4 px violet stripe, the summary label,
 * Total due | Advances held (never netted), the filter pills and the muted caption.
 */
export function LedgerHero(): ReactNode {
  return (
    <div className="rx-sme-ledger__hero" style={{ borderColor: withAlpha(SME.violet, '25') }}>
      <span className="rx-sme-ledger__stripe" />
      <RStack gap={10} pad={16}>
        <RStack dir="row" align="center" gap={8}>
          <RIconChip icon={CreditCard} color={SME.violet} size={36} radius={12} shape="square" iconSize={20} tint={10.2} />
          <RText {...TYPE.bodySm} weight={600} color={SME.violet}>
            Credit Ledger Summary
          </RText>
        </RStack>
        <RStack dir="row" className="rx-sme-ledger__stats">
          <Total label="Total due" value={smeLedger.totalDue} color={STANDING.due.text} />
          <span className="rx-sme-ledger__divider" />
          <Total label="Advances held" value={smeLedger.advancesHeld} color={STANDING.advance.text} />
        </RStack>
        <RStack dir="row" wrap gap={6}>
          {FILTERS.map((filter) => (
            <FilterPill key={filter.id} filter={filter} on={filter.id === 'all'} />
          ))}
        </RStack>
        <RText {...TYPE.bodyXs} color={SME.ink2} style={{ marginTop: 2 }}>
          Monitor and collect outstanding credit balances.
        </RText>
      </RStack>
    </div>
  );
}
