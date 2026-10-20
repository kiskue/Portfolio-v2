import {
  Banknote,
  ChevronDown,
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Smartphone,
  StickyNote,
  Tag,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RIconChip, RStack, RText } from '@/components/replicas/kit';
import { peso, smePos, smeProduct } from '@/components/replicas/sme/sample-data';
import { SME, withAlpha } from './palette';
import { TYPE } from './type';

/** A section label: a 14 px glyph and the 14/600 title. */
function SectionLabel({ icon, color, children }: { readonly icon: LucideIcon; readonly color: string; readonly children: ReactNode }): ReactNode {
  return (
    <RStack dir="row" align="center" gap={6}>
      <RGlyph icon={icon} size={14} color={color} />
      {children}
    </RStack>
  );
}

/** "Order Items (3)": the label in 600 and the count muted, as the app splits it. */
function ItemsTitle(): ReactNode {
  const [, label = smePos.itemsTitle, count = ''] = /^(.*?)\s*(\(\d+\))?$/.exec(smePos.itemsTitle) ?? [];
  return (
    <>
      <RText {...TYPE.bodySm} weight={600} color={SME.gray900}>
        {label}
      </RText>
      <RText {...TYPE.bodySm} color={SME.ink2}>
        {count}
      </RText>
    </>
  );
}

/** The order items card: one row per cart line with its stepper (Trash2 at quantity 1). */
function OrderItems(): ReactNode {
  return (
    <RStack gap={8} pad={[8, 16, 0]}>
      <SectionLabel icon={ShoppingCart} color={SME.navy}>
        <ItemsTitle />
      </SectionLabel>
      <div className="rx-sme-sheet__items">
        {smePos.cart.map((line) => {
          const product = smeProduct(line.product);
          return (
            <RStack key={line.product} dir="row" align="center" gap={10} className="rx-sme-sheet__item">
              <RStack gap={2} grow>
                <RText {...TYPE.bodySm} weight={500} color={SME.gray900} nowrap>
                  {product.name}
                </RText>
                <RText {...TYPE.bodyXs} color={SME.ink2}>
                  {`${peso(product.price)} each`}
                </RText>
              </RStack>
              <RText {...TYPE.bodySm} weight={600} color={SME.gray900} align="end" style={{ minWidth: 60 }}>
                {peso(product.price * line.qty)}
              </RText>
              <RStack dir="row" align="center" gap={4}>
                {line.qty === 1 ? (
                  <RIconChip icon={Trash2} color={SME.red} bg={SME.error50} size={26} shape="circle" iconSize={12} />
                ) : (
                  <RIconChip icon={Minus} color={SME.ink2} bg={SME.gray100} size={26} shape="circle" iconSize={12} />
                )}
                <RText {...TYPE.bodyXs} weight={700} color={SME.navy} align="center" style={{ minWidth: 22 }}>
                  {line.qty}
                </RText>
                <RIconChip icon={Plus} color={SME.ink2} bg={SME.gray100} size={26} shape="circle" iconSize={12} />
              </RStack>
            </RStack>
          );
        })}
      </div>
    </RStack>
  );
}

const METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: SME.green },
  { id: 'gcash', label: 'GCash', icon: Smartphone, color: SME.navy },
  { id: 'maya', label: 'Maya', icon: Wallet, color: SME.indigo },
  { id: 'card', label: 'Card', icon: CreditCard, color: SME.amber },
  { id: 'utang', label: 'Utang', icon: Users, color: SME.error },
] as const;

/** Payment Method: five chips; the selected one (Cash) takes a 9% wash and a 38% border. */
function PaymentMethods(): ReactNode {
  return (
    <RStack gap={8} pad={[8, 16, 0]}>
      <SectionLabel icon={CreditCard} color={SME.navy}>
        <RText {...TYPE.bodySm} weight={600} color={SME.gray900}>
          Payment Method
        </RText>
      </SectionLabel>
      <RStack dir="row" gap={8}>
        {METHODS.map((method) => {
          const on = method.id === smePos.payment;
          return (
            <span
              key={method.id}
              className="rx-sme-pay"
              data-on={on ? '' : undefined}
              style={on ? { background: withAlpha(method.color, '18'), borderColor: withAlpha(method.color, '60') } : undefined}
            >
              <RGlyph icon={method.icon} size={18} color={method.color} />
              <RText {...TYPE.bodySm} weight={on ? 600 : 400} color={on ? method.color : SME.ink2}>
                {method.label}
              </RText>
            </span>
          );
        })}
      </RStack>
    </RStack>
  );
}

/** Amount Tendered with the green change pill (Cash is selected). */
function CashTendered(): ReactNode {
  return (
    <RStack gap={8} pad={[8, 16, 0]}>
      <SectionLabel icon={Banknote} color={SME.green}>
        <RText {...TYPE.bodySm} weight={600} color={SME.gray900}>
          Amount Tendered
        </RText>
      </SectionLabel>
      <RText size={18} lh={22} weight={700} color={SME.gray900} className="rx-sme-sheet__input">
        {smePos.tendered}
      </RText>
      <span className="rx-sme-sheet__change">
        <RText {...TYPE.bodySm} weight={700} color={SME.green600}>
          {smePos.change}
        </RText>
      </span>
    </RStack>
  );
}

/** The collapsed Discount row, and Order Notes with its empty field. */
function DiscountAndNotes(): ReactNode {
  return (
    <>
      <RStack pad={[8, 16, 0]}>
        <SectionLabel icon={Tag} color={SME.warning}>
          <RText {...TYPE.bodySm} weight={600} color={SME.gray900} style={{ flex: 1 }}>
            Discount
          </RText>
          <RGlyph icon={ChevronDown} size={14} color={SME.ink2} />
        </SectionLabel>
      </RStack>
      <RStack gap={8} pad={[8, 16, 0]}>
        <SectionLabel icon={StickyNote} color={SME.ink2}>
          <RText {...TYPE.bodySm} weight={600} color={SME.gray900}>
            Order Notes
          </RText>
        </SectionLabel>
        <RText {...TYPE.bodySm} color={SME.gray400} className="rx-sme-sheet__input" style={{ minHeight: 60 }}>
          Optional notes for this order...
        </RText>
      </RStack>
    </>
  );
}

/** The totals card: Subtotal, then the 20/700 navy Total (no discount, no VAT for this shop). */
function Totals(): ReactNode {
  return (
    <div className="rx-sme-sheet__totals">
      <RStack dir="row" align="center" justify="between" pad={[10, 16]}>
        <RText {...TYPE.bodySm} color={SME.ink2}>
          Subtotal
        </RText>
        <RText {...TYPE.bodySm} weight={500} color={SME.gray900}>
          {smePos.subtotal}
        </RText>
      </RStack>
      <RStack dir="row" align="center" justify="between" pad={[14, 16]} className="rx-sme-sheet__total">
        <RText {...TYPE.h5} weight={700} color={SME.gray900}>
          Total
        </RText>
        <RText {...TYPE.h4} weight={700} color={SME.navy}>
          {smePos.total}
        </RText>
      </RStack>
    </div>
  );
}

/** The checkout sheet's scrolling body, top to bottom as the app lays it out (scrolled to the top). */
export function CheckoutBody(): ReactNode {
  return (
    <>
      <OrderItems />
      <PaymentMethods />
      <CashTendered />
      <DiscountAndNotes />
      <Totals />
    </>
  );
}
