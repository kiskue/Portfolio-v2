import type { ReactNode } from 'react';
import { RProgress } from '@/components/replicas/kit';
import type { SmeRestockRow } from '@/components/replicas/sme/sample-data';

/**
 * One restock row of the hub: the item name (14 px semibold, 8 px below), then the
 * StockHealthIndicator (a quantity tile tinted by health; the badge, which keeps the Badge atom's
 * flex-start alignment, and "Reorder at …" on the right; a 6 px bar 8 px below, filled to the
 * row's `level`, the app's quantity ÷ three times the reorder level), then the suggested reorder
 * 8 px below.
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
        value={row.level}
        h={6}
        color="var(--rx-sme-ai-x-stock-bar)"
        track="var(--rx-sme-ai-x-stock-track)"
        className="rx-sme-ai-stock__bar"
      />
      <span className="rx-sme-ai-stock__suggest">{row.suggestionLabel}</span>
    </span>
  );
}
