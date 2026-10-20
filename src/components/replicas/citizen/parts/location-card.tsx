import { MapPin, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RMapCanvas, type MapPin as MapPinData } from '@/components/replicas/kit';
import { czReport } from '@/components/replicas/citizen/sample-data';

/** The map box is 182 px tall (NativeWind h-52) and the card's full width (362 px). */
const LOCATION_MAP_HEIGHT = 182;

/**
 * "Current Location": the default red marker where the camera is centred. Pins are in town
 * coordinates (390 × 844); a fixed-height map is assumed to show the middle of the town, so the
 * marker sits at the town's centre.
 */
const CURRENT_LOCATION: readonly MapPinData[] = [{ x: 195, y: 422, kind: 'you', color: '#ea4335' }];

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
        <RMapCanvas theme="light" height={LOCATION_MAP_HEIGHT} pins={CURRENT_LOCATION} traffic />
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
