import type { ReactNode } from 'react';
import { MAP_BRAND_ACCENT, type MapPin, RCanvas, RMapCanvas, type RMapPuck } from '@/components/replicas/kit';
import { PhoneFrame } from '@/components/showcase/phone-frame';
import { DevMapSection, PhoneItem, PhoneRow } from './dev-map-section';

/** Every pin kind and look, with labels on every side, laid out over the default town view. */
const PINS: readonly MapPin[] = [
  { x: 48, y: 150, kind: 'you', label: 'You are here' },
  { x: 205, y: 150, kind: 'hazard', label: 'Flood' },
  { x: 330, y: 150, kind: 'incident', label: 'Fire', labelSide: 'left' },
  { x: 48, y: 290, kind: 'peer', label: 'Responder' },
  { x: 150, y: 290, kind: 'store', label: 'Pick up here' },
  { x: 345, y: 290, kind: 'home', label: 'Your address' },
  { x: 60, y: 430, kind: 'rider', label: 'Rider' },
  { x: 220, y: 430, kind: 'you', look: 'pin', color: '#d84343', label: 'Current Location', labelSide: 'top' },
  { x: 80, y: 600, kind: 'hazard', label: 'Below', labelSide: 'bottom' },
  { x: 205, y: 600, kind: 'you', label: 'Dot above', labelSide: 'top' },
  { x: 330, y: 600, kind: 'rider', label: 'Badge left', labelSide: 'left' },
  { x: 120, y: 730, kind: 'incident', pulse: true },
  { x: 260, y: 730, kind: 'peer', color: '#2e7d32' },
];

interface PuckCase {
  readonly name: string;
  readonly puck: Omit<RMapPuck, 'x' | 'y'>;
}

/** Puck looks, glyphs, headings and colours (each on its own small map). */
const PUCKS: readonly PuckCase[] = [
  { name: 'plate van 0°', puck: { heading: 0, color: MAP_BRAND_ACCENT, glyph: 'van' } },
  { name: 'plate van 40°', puck: { heading: 40, color: MAP_BRAND_ACCENT, glyph: 'van' } },
  { name: 'plate arrow 90°', puck: { heading: 90, color: MAP_BRAND_ACCENT, glyph: 'arrow' } },
  { name: 'plate moto 220°', puck: { heading: 220, color: MAP_BRAND_ACCENT, glyph: 'moto', look: 'plate' } },
  { name: 'plate SJDM green', puck: { heading: 300, color: '#2e7d32', glyph: 'van' } },
  { name: 'plate, no halo', puck: { heading: 180, color: '#28a745', glyph: 'van', halo: false } },
  { name: 'badge moto 0°', puck: { heading: 0, color: '#0EA5E9', glyph: 'moto' } },
  { name: 'badge moto 135°', puck: { heading: 135, color: '#0EA5E9', glyph: 'moto' } },
];

function PuckSheet({ theme }: { readonly theme: 'light' | 'dark' }): ReactNode {
  return (
    <div className="absolute inset-x-0 top-[52px] grid grid-cols-2 gap-[6px] px-[6px]">
      {PUCKS.map((item, index) => {
        const x = 40 + (index % 4) * 85;
        const y = 120 + Math.floor(index / 4) * 230;
        return (
          <div key={item.name} className="relative h-[180px] overflow-hidden rounded-[10px]">
            <RMapCanvas theme={theme} height={180} view={{ cx: x, cy: y }} puck={{ x, y, ...item.puck }} />
            <span className="absolute bottom-1 left-1 rounded-[6px] bg-black/60 px-1.5 py-0.5 text-[12px] font-semibold text-white">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Section 2: pins (every kind, look and label side) and pucks (looks, glyphs, headings). */
export function MarkerGallery(): ReactNode {
  return (
    <DevMapSection
      id="markers"
      title="2. Pins and pucks"
      intro={
        <>
          Pins hang off their town point (the tip of a teardrop, the centre of a dot or badge) and keep their size at any
          zoom. Labels sit right by default, or left for pins in the right part of the view. The puck is the Responder plate
          (disc, nose, ring, accuracy halo) or the SME rider badge, turned to its heading.
        </>
      }
    >
      <PhoneRow label="Pins and pucks in both themes">
        {(['light', 'dark'] as const).map((theme) => (
          <PhoneItem key={`pins-${theme}`} caption={`Pins · ${theme}`} data-markers="pins">
            <PhoneFrame size="2xl" chrome="device" statusBar={theme === 'dark' ? 'light' : 'dark'} homeIndicator={theme === 'dark' ? 'light' : 'dark'} label={`Every map pin kind in the ${theme} theme. Fictional data.`}>
              <RCanvas app="citizen" theme={theme}>
                <div className="absolute inset-0">
                  <RMapCanvas theme={theme} height="full" pins={PINS} />
                </div>
              </RCanvas>
            </PhoneFrame>
          </PhoneItem>
        ))}
        {(['light', 'dark'] as const).map((theme) => (
          <PhoneItem key={`pucks-${theme}`} caption={`Pucks · ${theme}`} data-markers="pucks">
            <PhoneFrame size="2xl" chrome="device" statusBar={theme === 'dark' ? 'light' : 'dark'} homeIndicator={theme === 'dark' ? 'light' : 'dark'} label={`Map puck variants in the ${theme} theme. Fictional data.`}>
              <RCanvas app="responder" theme={theme}>
                <PuckSheet theme={theme} />
              </RCanvas>
            </PhoneFrame>
          </PhoneItem>
        ))}
      </PhoneRow>
    </DevMapSection>
  );
}
