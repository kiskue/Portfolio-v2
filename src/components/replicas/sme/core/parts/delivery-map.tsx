import { LocateFixed, Maximize2, Minimize2, Motorbike, Phone, TrafficCone, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { RGlyph, RMapCanvas, RStack, RText, type MapPin } from '@/components/replicas/kit';
import { smeDelivery } from '@/components/replicas/sme/sample-data';
import { BAND, DESTINATION_IN_BAND, EXPANDED, finalHeading, fromTown, glidePath, RIDER_GLIDE, toTown } from './delivery-geometry';
import { SME } from './palette';
import { TYPE } from './type';

/** The customer's address pin, in town coordinates (the same in both states). */
const PINS: readonly MapPin[] = [{ ...toTown(BAND, DESTINATION_IN_BAND), kind: 'home', label: 'Your address' }];

/** A 44 px scrim control with a white 20 px glyph. */
function Control({ icon }: { readonly icon: LucideIcon }): ReactNode {
  return (
    <span className="rx-sme-track__control">
      <RGlyph icon={icon} size={20} color={SME.white} />
    </span>
  );
}

/** Where the rider marker sits: gliding along the band's road, or parked at the same spot when expanded. */
function riderStyle(expanded: boolean): CSSProperties {
  if (!expanded) return { offsetPath: `path('${glidePath(RIDER_GLIDE)}')` };
  const end = RIDER_GLIDE.at(-1) ?? DESTINATION_IN_BAND;
  const at = fromTown(EXPANDED, toTown(BAND, end));
  return { left: at.x, top: at.y, transform: `translate(-50%, -50%) rotate(${finalHeading(RIDER_GLIDE)}deg)` };
}

/**
 * The live delivery map (LiveDeliveryMap): the town map with the 7 px sky route on its #0369A1
 * casing and the traffic layer, the address pin, the sky motorcycle badge turned to its heading,
 * the "2.4 km · ~7 min" chip, the three scrim controls and the sky Call pill. Collapsed it is the
 * 220 px band, where the rider glides along the road while active (core.css); expanded it fills
 * the screen, adds the rider banner and swaps Maximize for Minimize.
 */
export function DeliveryMap({ expanded }: { readonly expanded: boolean }): ReactNode {
  return (
    <div className="rx-sme-track__map" data-expanded={expanded ? '' : undefined}>
      <div className="rx-sme-track__town">
        <RMapCanvas
          theme="light"
          height={expanded ? 'full' : BAND.h}
          pins={PINS}
          route={{ path: 'delivery', color: SME.sky, casing: SME.skyDeep, width: 7 }}
          traffic
        />
      </div>
      <span className="rx-sme-rider" style={riderStyle(expanded)}>
        <RGlyph icon={Motorbike} size={24} color={SME.white} />
      </span>
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
