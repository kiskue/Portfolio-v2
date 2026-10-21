import { Package, ShoppingCart } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RSearchField, RStack, RStateSequence, type ReplicaProps } from '@/components/replicas/kit';
import { CheckoutSheet, ConfirmSale, SaleConfirmed } from '@/components/replicas/sme/core/parts/checkout-sheet';
import { OwnerTopBar } from '@/components/replicas/sme/core/parts/owner-top-bar';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { PosActionBar } from '@/components/replicas/sme/core/parts/pos-action-bar';
import { PosStatPill } from '@/components/replicas/sme/core/parts/pos-stat-pill';
import { ProductTile } from '@/components/replicas/sme/core/parts/product-tile';
import { smePos, smeProduct } from '@/components/replicas/sme/sample-data';
import type { FigureState } from '@/content/apps/figures';

type PosState = FigureState<'1.2'>;

const STATES = ['grid', 'checkout', 'confirmed'] as const satisfies readonly PosState[];

/**
 * When the sheet opens and when the sale confirms in the glimpse (glimpses.ts SME_POS: taps on
 * Checkout at 1200 ms and on Confirm Sale at 2900 ms, inside a 4.4 s hold): each 180 ms after
 * its tap, when the tap ring has fully scaled in. tests/unit/registry.sme.test.ts checks them
 * against the glimpse data.
 */
export const POS_TIMING = { sheetAtMs: 1380, confirmedAtMs: 3080 } as const;
const { sheetAtMs: SHEET_AT_MS, confirmedAtMs: CONFIRMED_AT_MS } = POS_TIMING;

/** Tiles from this index on (the fourth row, y 713.6) only peek above the docked bar (y 763). */
const PEEK_FROM = 6;

/** The search field, the stat pills and the two-column tile grid (FlatList with 5 px tile margins). */
function ProductGrid(): ReactNode {
  const inCart = new Map(smePos.cart.map((line) => [line.product, line.qty]));
  return (
    <div className="rx-sme-pos__body">
      <RStack pad={[8, 16, 4]} gap={8}>
        <RSearchField
          placeholder="Search products..."
          h={39}
          radius={16}
          bg={SME.inputBg}
          border={SME.gray200}
          iconSize={16}
          style={{ padding: '0 12px' }}
        />
        <RStack dir="row" gap={8}>
          <PosStatPill icon={Package} label={smePos.productCount} color={SME.navy} />
          <PosStatPill icon={ShoppingCart} label={smePos.cartCount} color={SME.green} />
        </RStack>
      </RStack>
      <div className="rx-sme-pos__grid">
        {smePos.grid.map((id, index) => (
          <ProductTile key={id} product={smeProduct(id)} qty={inCart.get(id) ?? 0} peek={index >= PEEK_FROM} />
        ))}
      </div>
    </div>
  );
}

/**
 * The layer over the grid. grid: nothing at rest; while active the checkout sheet opens at
 * 1.4 s with Cash and the change, and its footer turns into "Sale Confirmed!" at 3.0 s.
 * checkout and confirmed: the open sheet, before and after the sale.
 */
function Overlay({ state }: { readonly state: PosState }): ReactNode {
  if (state === 'checkout') return <CheckoutSheet footer={<ConfirmSale />} />;
  if (state === 'confirmed') return <CheckoutSheet footer={<SaleConfirmed />} />;
  const footer = (
    <RStateSequence
      frames={[
        { atMs: 0, node: <ConfirmSale /> },
        { atMs: CONFIRMED_AT_MS, node: <SaleConfirmed /> },
      ]}
    />
  );
  return (
    <RStateSequence
      className="rx-sme-pos__overlay"
      frames={[
        { atMs: 0, node: null },
        { atMs: SHEET_AT_MS, node: <CheckoutSheet footer={footer} /> },
      ]}
    />
  );
}

/**
 * FIG 1.2, the point of sale (sme-app.json pos-checkout): the navy TopNavBar, the product grid
 * with two lines in the cart, the docked Scan | Checkout bar, and the checkout sheet. The cart,
 * cash, change and order number come from smePos. In checkout and confirmed the 90% sheet
 * (y 84–844) covers everything under the top bar, so the grid and the bar are not drawn there.
 */
export function PosCheckout({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  return (
    <RStack className="rx-sme-screen" bg={SME.canvas}>
      <OwnerTopBar title="Point of Sale" />
      {current === 'grid' ? (
        <>
          <ProductGrid />
          <PosActionBar />
        </>
      ) : null}
      <Overlay state={current} />
    </RStack>
  );
}
