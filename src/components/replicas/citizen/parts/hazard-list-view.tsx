import type { ReactNode } from 'react';
import { RField, RSegmented } from '@/components/replicas/kit';
import { czHazards, czTitles } from '@/components/replicas/citizen/sample-data';
import { HazardCard } from './hazard-card';
import { TabScreen } from './tab-screen';

/**
 * The Hazards tab (hazards.tsx + Hazards.tsx): "Hazard Monitoring", the Hazards / Earthquake top
 * tabs (active in the brand primary with a 3 px underline at 60% width), the "Select Hazards"
 * filter, and the report cards on a 120 px pitch. The first card is the Flood report the 2.5
 * glimpse taps.
 */
export function HazardListView(): ReactNode {
  return (
    <TabScreen title={czTitles.hazards} titleSize={12} tab="Hazards">
      <RSegmented options={['Hazards', 'Earthquake']} active={0} look="tabs" className="rx-citizen-toptabs" />
      <div className="rx-citizen-fill rx-citizen-hlist">
        <RField kind="select" placeholder="Select Hazards" />
        <span className="rx-citizen-hlist__rows">
          {czHazards.map((hazard) => (
            <HazardCard key={hazard.type} hazard={hazard} />
          ))}
        </span>
      </div>
    </TabScreen>
  );
}
