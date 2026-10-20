import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RPill } from '@/components/replicas/kit';
import { withAlpha } from './palette';

/**
 * A POS stat pill ("[Package] 24 Products", "[ShoppingCart] 3 in cart"): fully rounded, the hue
 * at 5% behind and 16% around a 12/600 label (statPill in pos.tsx).
 */
export function PosStatPill({ icon, label, color }: { readonly icon: LucideIcon; readonly label: string; readonly color: string }): ReactNode {
  return (
    <RPill
      label={label}
      icon={icon}
      iconSize={12}
      color={color}
      bg={withAlpha(color, '0E')}
      style={{ height: 'auto', padding: '5px 10px', gap: 5, borderColor: withAlpha(color, '28'), fontSize: 12, lineHeight: '16.8px' }}
    />
  );
}
