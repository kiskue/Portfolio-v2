import { MAP_SCENES, type MapFollow, type MapPin, type MapSceneKey, R_CANVAS } from '@/components/replicas/kit';
import { incidentTitle } from '@/components/replicas/responder/sample-data';

/*
 * How the Responder map screens sit on the shared town (kit MAP_SCENES). The map fills the
 * canvas so town coordinates stay canvas px; the app's map area starts under the 44px status
 * bar and the 56px stack header, and its dispatch sheet snaps to fractions of that area.
 */

/** The app's map area: under the status bar and the 56px header, 744px tall. */
export const MAP_AREA = { top: R_CANVAS.statusBar + 56, height: R_CANVAS.height - R_CANVAS.statusBar - 56 } as const;

/**
 * Where the nav camera pins the puck with the sheet at its 50% snap (the app's navTargetScreenY:
 * 72% down the visible half of the map area, y ≈ 368), as RMapCanvas follow fractions. The
 * scene default (2/3 of the box, y ≈ 563) would sit under the sheet.
 */
export const NAV_FOLLOW: MapFollow = {
  y: Math.round(((MAP_AREA.top + MAP_AREA.height * 0.5 * 0.72) / R_CANVAS.height) * 10000) / 10000,
};

/**
 * A scene's pins with the emergency titled as the app titles its marker ("Emergency FIRE"). The
 * title sits right of the pin: on the left it would run under the glass stack.
 */
export function titledIncident(key: MapSceneKey): readonly MapPin[] {
  return (MAP_SCENES[key].pins ?? []).map((pin) =>
    pin.kind === 'incident' ? { ...pin, label: incidentTitle, labelSide: 'right' } : pin,
  );
}

/**
 * A route width in town px that draws `px` wide on screen. Pins and the puck keep their size at
 * any zoom, but the route is drawn in the zoomed town, while the app's polyline is 5px on screen.
 */
export function screenWidth(px: number, key: MapSceneKey): number {
  return px / (MAP_SCENES[key].view?.zoom ?? 1);
}
