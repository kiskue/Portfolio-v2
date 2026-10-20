import type { ReactNode } from 'react';
import { MAP_SCENE_KEYS, MAP_SCENES, type MapPin, RCanvas, RMapCanvas, type RMapRoute, TOWN_EXTENT } from '@/components/replicas/kit';
import { PhoneFrame } from '@/components/showcase/phone-frame';
import { DevMapSection, PhoneItem, PhoneRow } from './dev-map-section';

/** Every scene's pins on one map. */
const ALL_PINS: readonly MapPin[] = MAP_SCENE_KEYS.flatMap((key) => MAP_SCENES[key].pins ?? []).filter(
  (pin, index, all) => all.findIndex((other) => other.x === pin.x && other.y === pin.y && other.kind === pin.kind) === index,
);

const OVERVIEWS: readonly { readonly name: string; readonly zoom: number; readonly cx: number; readonly cy: number; readonly route: RMapRoute }[] = [
  {
    name: 'whole town',
    zoom: 0.34,
    cx: (TOWN_EXTENT.x0 + TOWN_EXTENT.x1) / 2,
    cy: (TOWN_EXTENT.y0 + TOWN_EXTENT.y1) / 2,
    route: { path: 'en-route', color: '#f87171', width: 5 },
  },
  { name: 'the canvas window and its neighbours', zoom: 0.62, cx: 240, cy: 300, route: { path: 'delivery', color: '#0EA5E9', casing: '#0369A1', width: 7 } },
];

/** Section 3: the town zoomed out, with every scene's pins and the routes. */
export function TownOverview(): ReactNode {
  return (
    <DevMapSection
      id="town"
      title="3. The town"
      intro={
        <>
          One fictional town (map-town.ts): a street grid with uneven blocks, the diagonal Old Rd., a river with bridges on the
          major roads, the bay and beach, parks, the hospital, market, plaza and school, and seeded building footprints. Below
          0.75 zoom buildings and street names drop out, as on a real map. Pins from every scene are shown at once.
        </>
      }
    >
      <PhoneRow label="Town overview">
        {OVERVIEWS.flatMap((overview) =>
          (['light', 'dark'] as const).map((theme) => (
            <PhoneItem key={`${overview.name}-${theme}`} caption={`${overview.name} · zoom ${overview.zoom} · ${theme}`} data-overview={overview.name}>
              <PhoneFrame
                size="2xl"
                chrome="device"
                statusBar={theme === 'dark' ? 'light' : 'dark'}
                homeIndicator={theme === 'dark' ? 'light' : 'dark'}
                label={`The fictional town, ${overview.name}, ${theme} theme. Fictional data.`}
              >
                <RCanvas app="citizen" theme={theme}>
                  <div className="absolute inset-0">
                    <RMapCanvas
                      theme={theme}
                      height="full"
                      view={{ cx: overview.cx, cy: overview.cy, zoom: overview.zoom }}
                      pins={ALL_PINS}
                      route={overview.route}
                      traffic
                    />
                  </div>
                </RCanvas>
              </PhoneFrame>
            </PhoneItem>
          )),
        )}
      </PhoneRow>
    </DevMapSection>
  );
}
