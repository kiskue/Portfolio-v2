import { Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { czSos } from '@/components/replicas/citizen/sample-data';

/** The connectivity strip under the header while offline (ConnectivityBanner.tsx): #ef4444 → #b91c1c. */
export function OfflineBanner(): ReactNode {
  return (
    <span className="rx-citizen-offline">
      <RGlyph icon={Wifi} size={14} />
      <span>{czSos.offline}</span>
    </span>
  );
}
