import './core.css';
import type { ReplicaComponent } from '@/components/replicas/kit';
import { CreditLedger } from '@/components/replicas/sme/core/screens/credit-ledger';
import { CustomerStorefront } from '@/components/replicas/sme/core/screens/customer-storefront';
import { LiveOrderTracking } from '@/components/replicas/sme/core/screens/live-order-tracking';
import { OwnerDashboard } from '@/components/replicas/sme/core/screens/owner-dashboard';
import { PosCheckout } from '@/components/replicas/sme/core/screens/pos-checkout';
import type { SmeFigureId } from '@/content/types';

/** The owner, customer and rider screens: dashboard, POS, credit ledger, storefront and delivery. */
export type SmeCoreFigureId = Extract<SmeFigureId, '1.1' | '1.2' | '1.3' | '1.4' | '1.5'>;

/**
 * SME Panindio core replicas, figures 1.1–1.5 (exhaustive by type; an AI figure here fails the
 * check). Each screen lives in ./screens, built from the replica kit and the composites in
 * ./parts; ./core.css (imported here, once) holds their app-specific styles and the 1.5 glide.
 * Copy and figures come from ../sample-data.ts.
 */
export const smeCoreReplicas = {
  '1.1': OwnerDashboard,
  '1.2': PosCheckout,
  '1.3': CreditLedger,
  '1.4': CustomerStorefront,
  '1.5': LiveOrderTracking,
} satisfies Record<SmeCoreFigureId, ReplicaComponent>;
