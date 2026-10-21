import { Clock, Gauge, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { MAP_SCENES, RGlyph, RMapCanvas, type MapPin as MapPinData } from '@/components/replicas/kit';
import { czHazardDetail, czTitles } from '@/components/replicas/citizen/sample-data';
import { CitizenHeader } from './citizen-header';

/**
 * W6's 'hazards' scene in town coordinates (the flood by the river bridge, the citizen 1.2 km
 * away, both between the title strip and the info card, as two default red pins), with each
 * marker's title from the sample data drawn under its pin, as the iOS map draws a titled marker.
 */
const HAZARD_PINS: readonly MapPinData[] = (MAP_SCENES.hazards.pins ?? []).map((pin) => ({
  ...pin,
  label: pin.kind === 'you' ? czHazardDetail.pins.you : czHazardDetail.pins.hazard,
  labelSide: 'bottom',
}));

/**
 * The Hazard Location modal (modalHazard.tsx): the "Hazard Report" header in the brand primary,
 * the white title strip, a full-bleed map with the hazard and "Your Location" pins, and the
 * floating info card (handle in the brand primary, address, outline chips; the distance chip
 * is light blue with the text in the brand primary).
 */
export function HazardMapView(): ReactNode {
  const { chips } = czHazardDetail;
  return (
    <div className="rx-citizen-screen rx-citizen-hmap">
      <RMapCanvas theme="light" height={MAP_SCENES.hazards.height} scene="hazards" pins={HAZARD_PINS} className="rx-citizen-hmap__map" />
      <CitizenHeader kind="stack" title={czTitles.hazardModal} titleSize={16} />
      <span className="rx-citizen-hmap__strip">
        <span className="rx-citizen-hmap__title">Hazard Location</span>
        <span className="rx-citizen-hmap__meta">{czHazardDetail.meta}</span>
      </span>
      <span className="rx-citizen-hmap__card">
        <span className="rx-citizen-hmap__handle" />
        <span className="rx-citizen-hmap__address">{czHazardDetail.address}</span>
        <span className="rx-citizen-hmap__chips">
          <span className="rx-citizen-hmap__chip">
            <RGlyph icon={Gauge} size={16} className="rx-citizen-danger" />
            {chips.hazard}
          </span>
          <span className="rx-citizen-hmap__chip">
            <RGlyph icon={Clock} size={16} />
            {chips.ago}
          </span>
          <span className="rx-citizen-hmap__chip" data-tone="distance">
            <RGlyph icon={MapPin} size={16} fill="currentColor" className="rx-citizen-danger rx-citizen-solid-pin" />
            {chips.distance}
          </span>
        </span>
      </span>
    </div>
  );
}
