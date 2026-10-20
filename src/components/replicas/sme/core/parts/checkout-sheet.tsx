import { CircleCheckBig, Receipt, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { RBottomSheet, RGlyph, RIconChip, RStack, RText } from '@/components/replicas/kit';
import { smePos } from '@/components/replicas/sme/sample-data';
import { CheckoutBody } from './checkout-body';
import { SME } from './palette';
import { TYPE } from './type';

/** The navy footer button: "[Receipt] Confirm Sale · ₱310.00". */
export function ConfirmSale(): ReactNode {
  return (
    <span className="rx-sme-sheet__confirm">
      <RGlyph icon={Receipt} size={18} />
      <RText {...TYPE.body} weight={700} nowrap>
        {smePos.confirm}
      </RText>
    </span>
  );
}

/** What the footer becomes after the sale: the green "Sale Confirmed!" row. */
export function SaleConfirmed(): ReactNode {
  return (
    <span className="rx-sme-sheet__done">
      <RGlyph icon={CircleCheckBig} size={20} color={SME.green} />
      <RText {...TYPE.body} weight={700} color={SME.green600}>
        Sale Confirmed!
      </RText>
    </span>
  );
}

/** The sheet header: "Checkout" over the order line, and the round close button. */
function SheetHeader(): ReactNode {
  return (
    <RStack dir="row" align="center" justify="between" className="rx-sme-sheet__head">
      <RStack>
        <RText {...TYPE.h5} weight={700} color={SME.gray900}>
          Checkout
        </RText>
        <RText {...TYPE.bodyXs} color={SME.ink2}>
          {smePos.orderLine}
        </RText>
      </RStack>
      <RIconChip icon={X} color={SME.ink2} bg={SME.sheetSurface} size={36} shape="circle" iconSize={16} />
    </RStack>
  );
}

/**
 * The checkout sheet (CheckoutSheet in pos.tsx) at its 90% snap: 760 of 844 px under a 55%
 * black scrim, scrolled to the top: the order items, payment methods with Cash selected, the
 * amount tendered and change, discount, notes and totals. `footer` is the pinned footer's
 * content: ConfirmSale, SaleConfirmed, or a sequence of the two.
 */
export function CheckoutSheet({ footer }: { readonly footer: ReactNode }): ReactNode {
  return (
    <RBottomSheet
      className="rx-sme-sheet"
      height={760}
      radius={16}
      handle={{ color: SME.gray300, width: 36, height: 4 }}
      scrim="rgb(0 0 0 / 0.55)"
      header={<SheetHeader />}
      footer={<div className="rx-sme-sheet__foot">{footer}</div>}
    >
      <CheckoutBody />
    </RBottomSheet>
  );
}
