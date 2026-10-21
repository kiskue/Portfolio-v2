import { MapPin, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { MAP_SCENES, RGlyph, RMapCanvas, type MapPin as MapPinData } from '@/components/replicas/kit';
import { czReport } from '@/components/replicas/citizen/sample-data';

/**
 * W6's 'report' scene: the 182 px live map centred on one red "Current Location" pin (town
 * coordinates, by the market and the old road, clear of the Live Location pill), its title from
 * the sample data under the pin as on the 2.5 map.
 */
const REPORT_PINS: readonly MapPinData[] = (MAP_SCENES.report.pins ?? []).map((pin) => ({
  ...pin,
  label: czReport.pin,
  labelSide: 'bottom',
}));

/**
 * The report form's location card (create.tsx): a 182 px live map with the current-location
 * pin and the "Live Location" pill, then the incident address under a red pin in a circle
 * tinted 10% in the brand primary, the Refresh chip (brand primary text) and the white
 * latitude / longitude box. Location is attached automatically, so nothing here is a field.
 */
export function LocationCard(): ReactNode {
  return (
    <span className="rx-citizen-loc">
      <span className="rx-citizen-loc__map">
        <RMapCanvas theme="light" height={MAP_SCENES.report.height} scene="report" pins={REPORT_PINS} />
        <span className="rx-citizen-loc__live">
          <span className="rx-citizen-loc__dot" />
          {czReport.live}
        </span>
      </span>
      <span className="rx-citizen-loc__details">
        <span className="rx-citizen-loc__row">
          <span className="rx-citizen-loc__pin">
            <RGlyph icon={MapPin} size={20} fill="currentColor" className="rx-citizen-solid-pin" />
          </span>
          <span className="rx-citizen-loc__text">
            <span className="rx-citizen-loc__label">{czReport.locationLabel}</span>
            <span className="rx-citizen-loc__address">{czReport.address}</span>
          </span>
          <span className="rx-citizen-loc__refresh">
            <RGlyph icon={RefreshCw} size={14} />
            {czReport.refresh}
          </span>
        </span>
        <span className="rx-citizen-loc__coords">
          <span className="rx-citizen-loc__coord">
            <span className="rx-citizen-loc__key">Latitude</span>
            <span className="rx-citizen-loc__val">{czReport.latitude}</span>
          </span>
          <span className="rx-citizen-loc__sep" />
          <span className="rx-citizen-loc__coord">
            <span className="rx-citizen-loc__key">Longitude</span>
            <span className="rx-citizen-loc__val">{czReport.longitude}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
