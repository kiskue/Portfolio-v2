import { OctagonAlert, PersonStanding, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { RTabBar } from '@/components/replicas/kit';

/**
 * The floating action pill over the map (CustomTab): 40px from the sides and bottom, white 80%
 * with blur, radius 24, py 16; navy #085499 glyphs over 11px SemiBold labels in the brand
 * primary. MaterialIcons report, FontAwesome5 running and Ionicons call are drawn with lucide.
 */
export function ActionPill(): ReactNode {
  return (
    <RTabBar
      look="responder-pill"
      className="rx-responder-pill"
      items={[
        { icon: OctagonAlert, label: 'Report' },
        { icon: PersonStanding, label: 'Offline Respond' },
        { icon: Phone, label: 'Call' },
      ]}
    />
  );
}
