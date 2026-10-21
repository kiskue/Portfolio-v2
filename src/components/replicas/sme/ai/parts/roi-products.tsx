import { Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { RProgress } from '@/components/replicas/kit';
import { smeRoi, type SmeRoiProduct } from '@/components/replicas/sme/sample-data';
import { AI_COPY } from './ai-copy';
import { RoiSectionTitle } from './ai-screen';

/*
 * Business ROI's section 7 (business-roi.tsx "Top Products by Revenue", ProductRow), under
 * Breakeven Progress: all-time units, revenue and contribution margin per product, from
 * smeRoi.products. On 1.9 the list starts at y 698, so the first row shows whole and the second
 * runs into the fold; the third starts below the canvas and is not drawn.
 */

const VISIBLE_ROWS = 2;

/** ProductRow's rank badge colours (#1 amber, #2 slate, #3 bronze), the same in both themes. */
const RANK_COLORS = ['#FFB020', '#94A3B8', '#CD7F32'] as const;

/** A product card: the rank badge, the name and units, a 5 px revenue bar, then the revenue and the margin. */
function ProductRow({ row, rank }: { readonly row: SmeRoiProduct; readonly rank: number }): ReactNode {
  const rankColor = RANK_COLORS[(rank - 1) % RANK_COLORS.length] ?? RANK_COLORS[0];
  // The best seller's bar and revenue are the accent blue; the rest are green.
  const fill = rank === 1 ? 'var(--rx-sme-ai-accent)' : 'var(--rx-sme-risk-low)';
  return (
    <span className="rx-sme-ai-product">
      <span className="rx-sme-ai-product__rank" style={{ color: rankColor, background: `${rankColor}1a` }}>{`#${rank}`}</span>
      <span className="rx-sme-ai-product__info">
        <span className="rx-sme-ai-product__head">
          <span className="rx-sme-ai-product__name">{row.name}</span>
          <span className="rx-sme-ai-product__units">{row.unitsLabel}</span>
        </span>
        <RProgress value={row.share} h={5} color={fill} track="var(--rx-sme-ai-x-product-track)" className="rx-sme-ai-product__bar" />
        <span className="rx-sme-ai-product__meta">
          <span className="rx-sme-ai-product__revenue" style={{ color: fill }}>
            {row.revenueLabel}
          </span>
          <span>{row.marginLabel}</span>
        </span>
      </span>
    </span>
  );
}

/** The section title (Package in the accent) and the product cards, 8 px apart. */
export function TopProductsSection(): ReactNode {
  return (
    <>
      <RoiSectionTitle icon={Package} color="var(--rx-sme-ai-accent)">
        {AI_COPY.topProducts}
      </RoiSectionTitle>
      <span className="rx-sme-ai-products">
        {smeRoi.products.slice(0, VISIBLE_ROWS).map((row, index) => (
          <ProductRow key={row.product} row={row} rank={index + 1} />
        ))}
      </span>
    </>
  );
}
