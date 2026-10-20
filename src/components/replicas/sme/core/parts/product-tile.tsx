import { Minus, Package, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { RIconChip, RStack, RText } from '@/components/replicas/kit';
import { peso, smePriceTier, smeStockLabel, type SmePriceTier, type SmeProduct } from '@/components/replicas/sme/sample-data';
import { SME, withAlpha } from './palette';
import { TYPE } from './type';

/** The tile's left bar, icon chip and price colour by price tier (≥₱500, ≥₱100, otherwise). */
const TIER: Readonly<Record<SmePriceTier, string>> = { indigo: SME.indigo, navy: SME.navy, green: SME.green };

/** The in-cart stepper pill: tinted minus and plus circles around the bold quantity. */
function TileStepper({ qty, accent }: { readonly qty: number; readonly accent: string }): ReactNode {
  const button = withAlpha(accent, '20');
  return (
    <RStack
      dir="row"
      align="center"
      justify="between"
      gap={4}
      className="rx-sme-tile__stepper"
      style={{ background: withAlpha(accent, '15'), borderColor: withAlpha(accent, '30') }}
    >
      <RIconChip icon={Minus} color={accent} bg={button} size={24} shape="circle" iconSize={12} />
      <RText {...TYPE.bodySm} weight={700} color={accent} align="center" style={{ minWidth: 18 }}>
        {qty}
      </RText>
      <RIconChip icon={Plus} color={accent} bg={button} size={24} shape="circle" iconSize={12} />
    </RStack>
  );
}

/**
 * A POS product tile (ProductTile in pos.tsx): white radius 16 with a full-height 3 px tier bar,
 * a 40 px Package chip, the name (two lines), the price in the tier colour and the stock pill.
 * In the cart its border turns the tier colour at 31% and the stepper appears; out of stock it
 * dims to 60% under an UNAVAILABLE wash.
 */
export function ProductTile({ product, qty }: { readonly product: SmeProduct; readonly qty: number }): ReactNode {
  const accent = TIER[smePriceTier(product.price)];
  const inCart = qty > 0;
  const out = product.stock <= 0 || qty >= product.stock;
  return (
    <div
      className="rx-sme-tile"
      data-out={out ? '' : undefined}
      style={{ borderColor: inCart ? withAlpha(accent, '50') : SME.gray200 }}
    >
      <span className="rx-sme-tile__bar" style={{ background: accent }} />
      <RStack pad={[12, 12, 12, 16]}>
        <RIconChip icon={Package} color={accent} bg={withAlpha(accent, '18')} size={40} radius={10} shape="square" iconSize={22} />
        <RText {...TYPE.bodySm} weight={600} color={SME.gray900} lines={2} style={{ marginTop: 6 }}>
          {product.name}
        </RText>
        <RText {...TYPE.h5} weight={700} color={accent} nowrap style={{ marginTop: 4 }}>
          {peso(product.price)}
        </RText>
        <RText
          {...TYPE.bodyXs}
          weight={500}
          color={out ? SME.error : SME.green}
          nowrap
          className="rx-sme-tile__stock"
          style={{ background: out ? SME.error50 : SME.green50 }}
        >
          {smeStockLabel(product)}
        </RText>
        {inCart ? <TileStepper qty={qty} accent={accent} /> : null}
      </RStack>
      {out && !inCart ? (
        <span className="rx-sme-tile__unavailable">
          <RText {...TYPE.bodyXs} weight={700} color={SME.error}>
            UNAVAILABLE
          </RText>
        </span>
      ) : null}
    </div>
  );
}
