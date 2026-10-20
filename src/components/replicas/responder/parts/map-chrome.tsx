import { Bus, MapPin, Navigation, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { px, rBrand, RGlyph, rStyle } from '@/components/replicas/kit';
import { responderEta, responderVehicle, vehicleOccupancy } from '@/components/replicas/responder/sample-data';
import { MAP_CHROME, ZONES, zoneFor } from './palette';

/*
 * Floating map chrome (MapSurface overlays): the top-left glass stack (top 12, left 16, a
 * 170px right gutter, 8px apart) and the right FAB stack (right 16, 12px apart). Glass is
 * rgba(255,255,255,0.94) with a 1px rgba(0,0,0,0.08) edge, radius 14 and elevation 4.
 */

/** The top-left stack. Children hug their content except the vehicle card, which fills it. */
export function GlassStack({ children }: { readonly children: ReactNode }): ReactNode {
  return <div className="rx-responder-glass-stack">{children}</div>;
}

/** "Limited sharing": location is shared only while the app is open (4px amber left edge). */
export function LimitedSharingChip(): ReactNode {
  return (
    <span className="rx-responder-glass rx-responder-sharing" style={{ borderLeftColor: MAP_CHROME.warn }}>
      <span className="rx-responder-sharing__body" style={{ color: MAP_CHROME.warn }}>
        <RGlyph icon={MapPin} size={14} />
        <span className="rx-responder-sharing__title">Limited sharing</span>
      </span>
      <span className="rx-responder-sharing__close" style={{ color: MAP_CHROME.meta }}>
        <RGlyph icon={X} size={16} />
      </span>
    </span>
  );
}

/** The road ETA ribbon: navigate glyph and left edge in the zone colour of the road distance. */
export function EtaRibbon(): ReactNode {
  const color = ZONES[zoneFor(responderEta.metres)].color;
  return (
    <span className="rx-responder-glass rx-responder-eta" style={{ borderLeftColor: color }}>
      <RGlyph icon={Navigation} size={16} color={color} fill={color} />
      <span className="rx-responder-eta__time">{responderEta.duration}</span>
      <span className="rx-responder-eta__dist">{`· ${responderEta.distance}`}</span>
    </span>
  );
}

/** "Aboard Rescue Van 2, seat 3": bus glyph, name, seat and the occupancy pips (3/8). */
export function VehicleCard(): ReactNode {
  const seats = Array.from({ length: responderVehicle.capacity }, (_, index) => index + 1);
  const taken: readonly number[] = responderVehicle.taken;
  return (
    <div className="rx-responder-glass rx-responder-vehicle">
      <span className="rx-responder-vehicle__row">
        <RGlyph icon={Bus} size={16} color={rBrand.primary} />
        <span className="rx-responder-vehicle__name">{responderVehicle.name}</span>
        <span className="rx-responder-vehicle__seat">{`SEAT ${responderVehicle.seat}`}</span>
      </span>
      <span className="rx-responder-vehicle__pips">
        {seats.map((seat) => (
          <span
            key={seat}
            className="rx-responder-vehicle__pip"
            data-state={seat === responderVehicle.seat ? 'me' : taken.includes(seat) ? 'taken' : 'free'}
          />
        ))}
        <span className="rx-responder-vehicle__count">{vehicleOccupancy()}</span>
      </span>
    </div>
  );
}

export interface MapFabProps {
  readonly icon: LucideIcon;
  /** Active camera mode: filled #085499 with a white glyph. */
  readonly active?: boolean;
  /** A solid glyph (Ionicons navigate). */
  readonly filled?: boolean;
}

/** A 48px round map control (Ionicons locate / navigate, MaterialIcons zoom-out-map). */
export function MapFab({ icon, active, filled }: MapFabProps): ReactNode {
  return (
    <span className="rx-responder-fab" data-on={active ? '' : undefined}>
      <RGlyph icon={icon} size={22} fill={filled ? 'currentColor' : undefined} />
    </span>
  );
}

/** The right FAB stack, `bottom` px above the canvas bottom (128 over the tab pill; 52% of the map over a 50% sheet). */
export function MapFabStack({ bottom, children }: { readonly bottom: number; readonly children: ReactNode }): ReactNode {
  return (
    <div className="rx-responder-fabs" style={rStyle({}, { bottom: px(bottom) })}>
      {children}
    </div>
  );
}
