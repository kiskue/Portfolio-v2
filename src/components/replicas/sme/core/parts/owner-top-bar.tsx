import type { ReactNode } from 'react';
import { RAppBar } from '@/components/replicas/kit';
import { SME_OWNER_NOTIFICATIONS } from '@/components/replicas/sme/sample-data';
import { SmeLogo } from '@/components/replicas/sme/parts/sme-logo';

/**
 * The owner's TopNavBar (organisms/TopNavBar.tsx): the navy band under the status bar, a menu on
 * the left, the screen title (or, on the dashboard, the BrandLogo wordmark) in the centre and the
 * bell with the amber unread badge on the right. The badge is the owner's unread count, the same
 * on every owner screen. `.rx-sme-topbar` (core.css) moves the glyphs to the app's 44 px slots.
 */
export function OwnerTopBar({ title }: { readonly title?: string }): ReactNode {
  return (
    <RAppBar
      look="sme"
      className="rx-sme-topbar"
      title={title}
      logo={title === undefined ? <SmeLogo variant="wordmark" size="xs" /> : undefined}
      badge={SME_OWNER_NOTIFICATIONS}
    />
  );
}
