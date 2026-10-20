import { Bell, ChevronLeft, ShoppingCart } from 'lucide-react';
import type { ReactNode } from 'react';
import { RCountBadge, RGlyph, RText } from '@/components/replicas/kit';
import { SME } from './palette';
import { TYPE } from './type';

export interface CustomerHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** A back chevron before the title (the order screen). */
  readonly back?: boolean;
  /** The bell's red unread count. */
  readonly unread: number;
  /** A cart button after the bell, with its orange item count (the storefront). */
  readonly cart?: number;
  /** Content under the title row, e.g. the search field. */
  readonly children?: ReactNode;
}

/** A 44 px icon slot with an optional count badge at its top right (IconButton + Badge sm). */
function IconSlot({ glyph, count, badge }: { readonly glyph: ReactNode; readonly count: number; readonly badge: string }): ReactNode {
  return (
    <span className="rx-sme-chead__slot">
      {glyph}
      {count > 0 ? <RCountBadge className="rx-sme-chead__badge" count={count} color={badge} size={16} /> : null}
    </span>
  );
}

/**
 * The customer persona's header band (features/customer/components/CustomerHeader.tsx): navy,
 * a 3 px navy / amber / green stripe along its top edge, the title (with an optional subtitle),
 * the bell and an optional cart, and optional content below. The band also covers the status-bar
 * inset so the white status glyphs stay legible (the app leaves that inset the canvas colour).
 */
export function CustomerHeader({ title, subtitle, back, unread, cart, children }: CustomerHeaderProps): ReactNode {
  return (
    <div className="rx-sme-chead">
      <span className="rx-sme-chead__stripe" />
      <div className="rx-sme-chead__row">
        {back ? (
          <span className="rx-sme-chead__back">
            <RGlyph icon={ChevronLeft} size={26} color={SME.white} />
          </span>
        ) : null}
        <span className="rx-sme-chead__titles">
          <RText {...TYPE.h5} weight={700} color={SME.white} nowrap>
            {title}
          </RText>
          {subtitle ? (
            <RText {...TYPE.bodyXs} color="rgb(255 255 255 / 0.75)" nowrap style={{ marginTop: 2 }}>
              {subtitle}
            </RText>
          ) : null}
        </span>
        <span className="rx-sme-chead__right">
          <IconSlot glyph={<RGlyph icon={Bell} size={22} color={SME.white} />} count={unread} badge={SME.error} />
          {cart === undefined ? null : (
            <IconSlot glyph={<RGlyph icon={ShoppingCart} size={24} color={SME.white} />} count={cart} badge={SME.warning} />
          )}
        </span>
      </div>
      {children === undefined ? null : <div className="rx-sme-chead__below">{children}</div>}
    </div>
  );
}
