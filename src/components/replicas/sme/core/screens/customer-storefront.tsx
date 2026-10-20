import { ClipboardList, House, ShoppingCart, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RSearchField, RStack, RTabBar, RText } from '@/components/replicas/kit';
import { CustomerHeader } from '@/components/replicas/sme/core/parts/customer-header';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { StorefrontCard } from '@/components/replicas/sme/core/parts/storefront-card';
import { TYPE } from '@/components/replicas/sme/core/parts/type';
import { smeCartUnits, smeProduct, smeStorefront } from '@/components/replicas/sme/sample-data';

const CHIPS = ['All', 'Popular', 'Favorites', 'Available'] as const;

/** "Hello, Maria!", the prompt under it and the verification pill. */
function Greeting(): ReactNode {
  return (
    <RStack dir="row" align="center" justify="between" className="rx-sme-store__greeting">
      <RStack grow style={{ paddingRight: 12 }}>
        <RText {...TYPE.h4} weight={700} color={SME.ink}>
          {smeStorefront.greeting}
        </RText>
        <RText {...TYPE.bodySm} color={SME.ink2}>
          What would you like to order today?
        </RText>
      </RStack>
      <RText size={11} lh={13} weight={700} color={SME.unverifiedInk} className="rx-sme-store__status">
        {smeStorefront.verification}
      </RText>
    </RStack>
  );
}

/** The amber Pay Later banner shown to unverified customers. */
function VerifyBanner(): ReactNode {
  return (
    <RStack dir="row" align="start" gap={10} className="rx-sme-store__banner">
      <span className="rx-sme-store__dot" />
      <RText size={12} lh={18} color={SME.unverifiedInk} style={{ flex: 1 }}>
        {'Complete your profile to unlock '}
        <RText inline size={12} lh={18} weight={700}>
          Pay Later
        </RText>
        {' orders. '}
        <RText inline size={12} lh={18} weight={700} color={SME.navy}>
          Verify Now →
        </RText>
      </RText>
    </RStack>
  );
}

/**
 * FIG 1.4, the suki storefront (sme-app.json customer-storefront), one state: the navy customer
 * header with the search field, the greeting, the Pay Later banner, the filter chips with All
 * selected, the two-column catalog (two lines in the cart, a favourite, Calamansi Juice sold
 * out), the floating View Cart button and the glass tab bar. Data from smeStorefront.
 */
export function CustomerStorefront(): ReactNode {
  const inCart = new Map(smeStorefront.cart.map((line) => [line.product, line.qty]));
  return (
    <RStack className="rx-sme-screen" bg={SME.canvas}>
      <CustomerHeader title={smeStorefront.headerTitle} subtitle="Order from your suki merchant" unread={smeStorefront.unread} cart={smeCartUnits(smeStorefront.cart)}>
        <RSearchField
          placeholder="Search products…"
          radius="full"
          bg={SME.gray200}
          iconSize={18}
          style={{ padding: '0 8px 0 10px', gap: 6, fontSize: 16 }}
        />
      </CustomerHeader>
      <RStack className="rx-sme-store__content">
        <Greeting />
        <VerifyBanner />
        <RStack dir="row" gap={8} className="rx-sme-store__chips">
          {CHIPS.map((chip, index) => (
            <span key={chip} className="rx-sme-store__chip" data-on={index === 0 ? '' : undefined}>
              {chip}
            </span>
          ))}
        </RStack>
        <RText {...TYPE.h6} weight={700} color={SME.ink} style={{ margin: '18px 0 6px' }}>
          All Items
        </RText>
        <div className="rx-sme-store__grid">
          {smeStorefront.grid.map((id) => (
            <StorefrontCard key={id} product={smeProduct(id)} qty={inCart.get(id) ?? 0} favorite={smeStorefront.favorites.includes(id)} />
          ))}
        </div>
      </RStack>
      <span className="rx-sme-store__cart">
        <RGlyph icon={ShoppingCart} size={20} />
        <RText size={18} lh={22} weight={500} nowrap>
          {smeStorefront.cartLabel}
        </RText>
      </span>
      <RTabBar
        look="sme-glass"
        className="rx-sme-store__tabs"
        items={[
          { icon: House, label: 'Home', active: true },
          { icon: ClipboardList, label: 'Orders' },
          { icon: User, label: 'Profile' },
        ]}
      />
    </RStack>
  );
}
