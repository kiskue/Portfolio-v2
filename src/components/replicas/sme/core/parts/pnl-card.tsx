import type { CSSProperties, ReactNode } from 'react';
import { RCard, RDivider, RStack, RText } from '@/components/replicas/kit';
import { smeDashboard, type SmePnlRow } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

/** One label/amount line of the P&L. */
function PnlLine({ row, style }: { readonly row: SmePnlRow; readonly style?: CSSProperties }): ReactNode {
  const look = {
    income: { type: TYPE.bodySm, weight: 600, label: SME.ink, amount: SME.green, indent: 0 },
    cost: { type: TYPE.bodySm, weight: 400, label: SME.ink, amount: SME.error, indent: 12 },
    waste: { type: TYPE.bodyXs, weight: 400, label: SME.warning, amount: SME.warning, indent: 24 },
    subtotal: { type: TYPE.bodySm, weight: 600, label: SME.ink, amount: SME.navy, indent: 0 },
    total: { type: TYPE.body, weight: 700, label: SME.ink, amount: SME.green, indent: 0 },
  } as const;
  const kind = row.kind === 'section' ? 'income' : row.kind;
  const { type, weight, label, amount, indent } = look[kind];
  return (
    <RStack dir="row" align="center" justify="between" style={style}>
      <RText {...type} weight={weight} color={label} style={{ marginLeft: indent }}>
        {row.label}
      </RText>
      <RText {...type} weight={weight} color={amount}>
        {row.amount}
      </RText>
    </RStack>
  );
}

/** The space above a row, from the previous row (PLWaterfallCard's margins). */
function gapAbove(row: SmePnlRow, previous: SmePnlRow | undefined): number {
  if (row.kind === 'waste') return 2;
  if (row.kind === 'cost' && (previous?.kind === 'cost' || previous?.kind === 'waste')) return 6;
  if (row.kind === 'section' && previous?.kind === 'subtotal') return 14;
  return 0;
}

/**
 * The P&L waterfall card (PLWaterfallCard): a 4 px green top bar, the title, then gross income,
 * the COGS block with its indented red costs and amber waste, the navy gross profit, operating
 * expenses and, after a 2 px rule, NET PROFIT in green. Rows come from smeDashboard.pnl.
 */
export function PnlCard(): ReactNode {
  const rows: readonly SmePnlRow[] = smeDashboard.pnl.rows;
  return (
    <RCard radius={12} border="default" shadow="sm" edge={{ side: 'top', color: SME.green, width: 4 }} pad={[20, 16, 16]}>
      <RText {...TYPE.h6} weight={600} color={SME.ink}>
        {smeDashboard.pnl.title}
      </RText>
      <RText {...TYPE.bodyXs} color={SME.ink2} style={{ marginTop: 2, marginBottom: 14 }}>
        Showing data for this period
      </RText>
      {rows.map((row, index) => {
        const marginTop = gapAbove(row, rows[index - 1]);
        const key = `${row.kind}-${row.label}`;
        if (row.kind === 'section') {
          return (
            <RText key={key} {...TYPE.bodyXs} weight={600} color={SME.ink2} upper tracking={0.6} style={{ marginTop, marginBottom: 6 }}>
              {row.label}
            </RText>
          );
        }
        const rule = row.kind === 'subtotal' ? 1 : row.kind === 'total' ? 2 : 0;
        return (
          <RStack key={key} style={{ marginTop }}>
            {rule > 0 ? <RDivider color={SME.gray200} thickness={rule} style={{ margin: '10px 0' }} /> : null}
            <PnlLine row={row} />
            {row.note ? (
              <RText {...TYPE.bodyXs} color={SME.ink2} style={{ marginTop: 2, marginBottom: 12 }}>
                {row.note}
              </RText>
            ) : null}
          </RStack>
        );
      })}
    </RCard>
  );
}
