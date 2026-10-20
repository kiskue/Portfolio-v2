import type { ReactNode } from 'react';
import { RProgress } from '@/components/replicas/kit';
import type { SmeRestockRow } from '@/components/replicas/sme/sample-data';

/**
 * The bar of the app's StockHealthIndicator: the quantity against three times the reorder level
 * (stockFillRatio), so a low item still shows most of its bar empty. Presentation only: the
 * quantity and the reorder level are the shared figures.
 */
function fillPercent(row: SmeRestockRow): number {
  return row.reorderAt > 0 ? Math.round(Math.min(1, row.quantity / (row.reorderAt * 3)) * 100) : 100;
}

/**
 * One restock row of the hub: the item name (14 px semibold, 8 px below), then the
 * StockHealthIndicator (a quantity tile tinted by health; the badge, which keeps the Badge atom's
 * flex-start alignment, and "Reorder at …" on the right; a 6 px bar 8 px below), then the
 * suggested reorder 8 px below.
 */
export function RestockRow({ row }: { readonly row: SmeRestockRow }): ReactNode {
  return (
    <span className="rx-sme-ai-stock" data-health={row.health}>
      <span className="rx-sme-ai-stock__name">{row.name}</span>
      <span className="rx-sme-ai-stock__row">
        <span className="rx-sme-ai-stock__qty">
          <span className="rx-sme-ai-stock__num">{row.quantity}</span>
          <span className="rx-sme-ai-stock__unit">{row.unit}</span>
        </span>
        <span className="rx-sme-ai-stock__col">
          <span className="rx-sme-ai-stock__badge">{row.badge}</span>
          <span className="rx-sme-ai-stock__reorder">{row.reorderLabel}</span>
        </span>
      </span>
      <RProgress
        value={fillPercent(row)}
        h={6}
        color="var(--rx-sme-ai-x-stock-bar)"
        track="var(--rx-sme-ai-x-stock-track)"
        className="rx-sme-ai-stock__bar"
      />
      <span className="rx-sme-ai-stock__suggest">{row.suggestionLabel}</span>
    </span>
  );
}
