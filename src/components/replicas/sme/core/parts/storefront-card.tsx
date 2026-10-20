import { Flame, Heart, Minus, Package, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RIconChip, RStack, RText } from '@/components/replicas/kit';
import { peso, type SmeProduct } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

/** QuantityStepper (sm) on its white pill: 26 px radius-8 buttons around the bold quantity. */
function CardStepper({ qty }: { readonly qty: number }): ReactNode {
  return (
    <RStack dir="row" align="center" gap={6} className="rx-sme-pcard__stepper">
      <RIconChip icon={Minus} color={SME.navy} bg={SME.navy50} size={26} radius={8} shape="square" iconSize={14} />
      <RText size={13} lh={22.4} weight={700} color={SME.ink} align="center" style={{ minWidth: 22 }}>
        {qty}
      </RText>
      <RIconChip icon={Plus} color={SME.navy} bg={SME.navy50} size={26} radius={8} shape="square" iconSize={14} />
    </RStack>
  );
}

/** AddToCartButton: a 44 px navy circle with a white plus (grey when the product is sold out). */
function AddButton({ disabled }: { readonly disabled: boolean }): ReactNode {
  return (
    <RIconChip
      icon={Plus}
      color={disabled ? SME.ink2 : SME.white}
      bg={disabled ? SME.gray300 : SME.navy}
      size={44}
      shape="circle"
      iconSize={20}
    />
  );
}

export interface StorefrontCardProps {
  readonly product: SmeProduct;
  /** Units of this product in the suki's cart. */
  readonly qty: number;
  readonly favorite: boolean;
}

/**
 * A storefront product card (features/customer ProductCard): radius 16 on a medium shadow, a
 * square #EAF0FA placeholder with the Package glyph (no photo), the amber Popular pill, the
 * heart on its dark scrim (red when a favourite), and the add button or, once in the cart, the
 * stepper. Sold out: a slate scrim and the "Sold out" pill. Then the name and the navy price.
 */
export function StorefrontCard({ product, qty, favorite }: StorefrontCardProps): ReactNode {
  const soldOut = product.stock <= 0;
  return (
    <div className="rx-sme-pcard">
      <div className="rx-sme-pcard__media">
        <RGlyph icon={Package} size={36} color={SME.ink2} />
        {soldOut ? (
          <span className="rx-sme-pcard__soldout">
            <RText {...TYPE.bodyXs} weight={700} color={SME.white} className="rx-sme-pcard__soldout-pill">
              Sold out
            </RText>
          </span>
        ) : null}
        {product.popular && !soldOut ? (
          <span className="rx-sme-pcard__popular">
            <RGlyph icon={Flame} size={12} color={SME.ink} />
            <RText {...TYPE.bodyXs} weight={700} color={SME.ink}>
              Popular
            </RText>
          </span>
        ) : null}
        <span className="rx-sme-pcard__heart">
          <RGlyph icon={Heart} size={18} color={SME.white} fill={favorite ? SME.error : 'transparent'} />
        </span>
        <span className="rx-sme-pcard__control">{!soldOut && qty > 0 ? <CardStepper qty={qty} /> : <AddButton disabled={soldOut} />}</span>
      </div>
      <RStack pad={12} gap={4}>
        <RText size={14} lh={20} weight={600} color={SME.ink} lines={2}>
          {product.name}
        </RText>
        <RText size={16} lh={22} weight={700} color={SME.navy} tracking={-0.2} nowrap>
          {peso(product.price)}
        </RText>
      </RStack>
    </div>
  );
}
