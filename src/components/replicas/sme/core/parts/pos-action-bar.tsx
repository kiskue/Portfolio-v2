import { ScanBarcode } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RText } from '@/components/replicas/kit';
import { smePos } from '@/components/replicas/sme/sample-data';
import { TYPE } from './type';

/**
 * The phone POS's docked bar (PosActionBar): with items in the cart, an outline Scan button
 * (h56, 1.5 px navy) and the filled navy Checkout button with "3 items · ₱310.00" under it.
 */
export function PosActionBar(): ReactNode {
  return (
    <div className="rx-sme-posbar">
      <span className="rx-sme-posbar__scan">
        <RGlyph icon={ScanBarcode} size={22} />
        <RText {...TYPE.body} weight={600}>
          Scan
        </RText>
      </span>
      <span className="rx-sme-posbar__checkout">
        <RText {...TYPE.body} weight={700} align="center">
          Checkout
        </RText>
        <RText size={13} lh={18} weight={600} align="center" tabular nowrap>
          {smePos.checkoutSublabel}
        </RText>
      </span>
    </div>
  );
}
