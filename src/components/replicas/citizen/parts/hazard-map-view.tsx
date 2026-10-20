import { Clock, Gauge, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RMapCanvas, type MapPin as MapPinData } from '@/components/replicas/kit';
import { czHazardDetail, czTitles } from '@/components/replicas/citizen/sample-data';
import { CitizenHeader } from './citizen-header';

/** The default map-marker red both pins use (the app passes no colour, so the platform's red shows). */
const MARKER_RED = '#ea4335';

/**
 * Pins in town coordinates (390 × 844 canvas px): the camera centres the hazard in the map,
 * which fills the screen under the header, and the citizen sits south-west of it, above the
 * info card. (At the app's zoom 16 a point 1.2 km away would be off screen; the replica keeps
 * both pins in view, as the layoutSpec asks.)
 */
const HAZARD_MAP_PINS: readonly MapPinData[] = [
  { x: 195, y: 472, kind: 'hazard', color: MARKER_RED, label: czHazardDetail.pins.hazard },
  { x: 112, y: 590, kind: 'you', color: MARKER_RED, label: czHazardDetail.pins.you },
];

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
      <RMapCanvas theme="light" height="full" pins={HAZARD_MAP_PINS} className="rx-citizen-hmap__map" />
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
            <span>{chips.hazard}</span>
          </span>
          <span className="rx-citizen-hmap__chip">
            <RGlyph icon={Clock} size={16} />
            <span>{chips.ago}</span>
          </span>
          <span className="rx-citizen-hmap__chip" data-tone="distance">
            <RGlyph icon={MapPin} size={16} fill="currentColor" className="rx-citizen-danger rx-citizen-solid-pin" />
            <span>{chips.distance}</span>
          </span>
        </span>
      </span>
    </div>
  );
}
