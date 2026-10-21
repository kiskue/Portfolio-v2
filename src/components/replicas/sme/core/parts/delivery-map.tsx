import { LocateFixed, Maximize2, Minimize2, Phone, TrafficCone, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MAP_SCENES, RGlyph, RMapCanvas, RStack, RText, type MapPin, type RMapPuck } from '@/components/replicas/kit';
import { smeDelivery } from '@/components/replicas/sme/sample-data';
import { SME } from './palette';
import { TYPE } from './type';

/** W6's 'delivery' scene: the bakery-to-door route on the town map, framed for the 358 × 220 band. */
const SCENE = MAP_SCENES.delivery;

/**
 * Out for delivery means the rider has collected the order, so only "Your address" is pinned:
 * the app passes the store pin only before the pickup (LiveDeliveryMap `store`).
 */
const PINS: readonly MapPin[] = (SCENE.pins ?? []).filter((pin) => pin.kind !== 'store');

/** The app's rider marker is a 50 dp image around a 46 dp sky disc: the badge at size 48 draws that disc. */
const RIDER_SIZE = 48;

/**
 * The rider badge where the scene puts it (on the route, turned to its heading). In the band it
 * glides along the road while active (the scene's 200 → 2800 ms glide, design §5.3's 2.6 s);
 * expanded is a still, so it drops the glide.
 */
function rider(glide: boolean): RMapPuck | undefined {
  const puck = SCENE.puck;
  return puck ? { ...puck, glide: glide ? puck.glide : undefined, size: RIDER_SIZE } : undefined;
}

/** A 44 px scrim control with a white 20 px glyph. */
function Control({ icon }: { readonly icon: LucideIcon }): ReactNode {
  return (
    <span className="rx-sme-track__control">
      <RGlyph icon={icon} size={20} color={SME.white} />
    </span>
  );
}

/**
 * The live delivery map (LiveDeliveryMap): W6's town map in its 'delivery' scene (the 7 px sky
 * route on its #0369A1 casing, trimmed behind the rider, the traffic layer and the address pin),
 * the sky motorcycle badge on the road, the "2.4 km · ~7 min" chip, the three scrim controls and
 * the sky Call pill. Collapsed it is the 220 px band, where the rider glides along the road while
 * active; expanded it fills the screen with the same view, adds the rider banner and swaps
 * Maximize for Minimize.
 */
export function DeliveryMap({ expanded }: { readonly expanded: boolean }): ReactNode {
  return (
    <div className="rx-sme-track__map" data-expanded={expanded ? '' : undefined}>
      <div className="rx-sme-track__town">
        <RMapCanvas theme="light" height={expanded ? 'full' : SCENE.height} scene="delivery" pins={PINS} puck={rider(!expanded)} />
      </div>
      <RStack gap={8} align="start" className="rx-sme-track__topleft">
        {expanded ? (
          <RStack className="rx-sme-track__banner">
            <RText {...TYPE.bodySm} weight={700} color={SME.white} nowrap>
              {smeDelivery.rider.name}
            </RText>
            <RText {...TYPE.bodyXs} color={SME.white} lines={2} style={{ marginTop: 2, opacity: 0.85 }}>
              {smeDelivery.headline}
            </RText>
          </RStack>
        ) : null}
        <RText {...TYPE.bodyXs} weight={600} color={SME.white} nowrap className="rx-sme-track__eta">
          {smeDelivery.eta}
        </RText>
      </RStack>
      <RStack gap={10} className="rx-sme-track__controls">
        <Control icon={expanded ? Minimize2 : Maximize2} />
        <Control icon={LocateFixed} />
        <Control icon={TrafficCone} />
      </RStack>
      <span className="rx-sme-track__call">
        <RGlyph icon={Phone} size={18} color={SME.white} />
        <RText {...TYPE.bodySm} weight={700} color={SME.white}>
          Call
        </RText>
      </span>
    </div>
  );
}
