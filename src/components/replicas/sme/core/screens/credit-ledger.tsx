import { Plus, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RStack, RText } from '@/components/replicas/kit';
import { LedgerHero } from '@/components/replicas/sme/core/parts/ledger-hero';
import { OwnerTopBar } from '@/components/replicas/sme/core/parts/owner-top-bar';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { RankCard } from '@/components/replicas/sme/core/parts/rank-card';
import { TYPE } from '@/components/replicas/sme/core/parts/type';
import { smeLedger } from '@/components/replicas/sme/sample-data';

/**
 * Rank cards that reach the screen: three whole cards, then the fourth's top edge (it starts at
 * y 827.8, so only its first row can show and it is drawn without its bar and stats). The fifth
 * starts below the fold and the rest are not drawn.
 */
const VISIBLE_ROWS = 4;

/**
 * FIG 1.3, the credit ledger (sme-app.json credit-ledger), one state: the navy TopNavBar, the
 * violet summary hero with All selected, "Customer Rankings by amount due", the debtors ranked by
 * amount due (gold, silver and bronze for the top three) and the violet add FAB. Every total,
 * count and row comes from smeLedger.
 */
export function CreditLedger(): ReactNode {
  return (
    <RStack className="rx-sme-screen" bg={SME.canvasCredit}>
      <OwnerTopBar title="Credit Ledger" />
      <RStack className="rx-sme-ledger__list">
        <LedgerHero />
        <RStack dir="row" align="center" gap={6} className="rx-sme-ledger__section">
          <RGlyph icon={TrendingUp} size={14} color={SME.violet} />
          <RText {...TYPE.bodySm} weight={600} color={SME.gray700}>
            Customer Rankings
          </RText>
          <RText {...TYPE.bodyXs} color={SME.ink2}>
            by amount due
          </RText>
        </RStack>
        {smeLedger.rows.slice(0, VISIBLE_ROWS).map((row, index) => (
          <RankCard key={row.customer} row={row} peek={index === VISIBLE_ROWS - 1} />
        ))}
      </RStack>
      <span className="rx-sme-ledger__fab">
        <RGlyph icon={Plus} size={24} color={SME.white} />
      </span>
    </RStack>
  );
}
