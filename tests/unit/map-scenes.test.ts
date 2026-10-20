import { describe, expect, it } from 'vitest';
import {
  distance,
  distanceToPolyline,
  inPolygon,
  type MapPoint,
  type MapRect,
  polylineLength,
  samplePolyline,
} from '@/components/replicas/kit/map-geometry';
import {
  EN_ROUTE_TIMELINE,
  MAP_ROUTE_KEYS,
  MAP_ROUTE_WAYPOINTS,
  MAP_SCENE_KEYS,
  MAP_SCENES,
  MAP_ZONE_COLORS,
  type MapPin,
  type MapScene,
  mapRouteFraction,
  mapRoutePoints,
  mapRoutePose,
  mapScene,
} from '@/components/replicas/kit/map-scenes';
import { RIVER_WIDTH, ROAD_WIDTH, TOWN, TOWN_EXTENT } from '@/components/replicas/kit/map-town';

/*
 * Scene geometry (W6 acceptance): every route runs on the town's roads and stays dry, and every
 * pin and puck of a scene lands inside the map box of its figure, clear of the app chrome that
 * the figure draws over the map.
 */

/** How far a point is inside the nearest road's carriageway (≤ 0 means on the road). */
function offRoad(point: MapPoint): number {
  return Math.min(...TOWN.roads.map((road) => distanceToPolyline(road.points, point) - ROAD_WIDTH[road.kind] / 2));
}

function isWet(point: MapPoint): boolean {
  return inPolygon(point, TOWN.sea) || distanceToPolyline(TOWN.river, point) < RIVER_WIDTH / 2;
}

/** The map box a scene is drawn in: 390 wide at full height, 358 wide (16 px margins) as a band. */
function boxOf(scene: MapScene): { readonly width: number; readonly height: number } {
  return scene.height === 'full' ? { width: 390, height: 844 } : { width: 358, height: scene.height };
}

/** A town point on screen for a static (non-follow) scene. */
function toScreen(scene: MapScene, point: MapPoint): MapPoint {
  const box = boxOf(scene);
  const view = scene.view ?? { cx: 195, cy: 422 };
  const zoom = view.zoom ?? 1;
  return { x: (point.x - view.cx) * zoom + box.width / 2, y: (point.y - view.cy) * zoom + box.height / 2 };
}

/** The screen box a marker's art covers around its anchor. */
function markerBox(pin: MapPin, at: MapPoint): MapRect {
  const look = pin.look ?? (pin.kind === 'you' ? 'dot' : pin.kind === 'rider' ? 'badge' : 'pin');
  if (look === 'pin') return { x0: at.x - 14, y0: at.y - 40, x1: at.x + 14, y1: at.y };
  const r = look === 'dot' ? 12 : 18;
  return { x0: at.x - r, y0: at.y - r, x1: at.x + r, y1: at.y + r };
}

function within(inner: MapRect, outer: MapRect): boolean {
  return inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;
}

function overlaps(a: MapRect, b: MapRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** App chrome drawn over each band or full map (screen px in the map box), from the layoutSpecs. */
const CHROME: Partial<Record<(typeof MAP_SCENE_KEYS)[number], readonly MapRect[]>> = {
  // 1.5: ETA chip top-left, the column of three 44 px controls top-right, the Call pill bottom-right.
  delivery: [
    { x0: 0, y0: 0, x1: 140, y1: 42 },
    { x0: 300, y0: 0, x1: 358, y1: 162 },
    { x0: 240, y0: 160, x1: 358, y1: 220 },
  ],
  // 2.5: the header and title strip above the map, the floating address card below it.
  hazards: [
    { x0: 0, y0: 0, x1: 390, y1: 165 },
    { x0: 0, y0: 650, x1: 390, y1: 844 },
  ],
  // 2.6: the Live Location pill top-right.
  report: [{ x0: 250, y0: 0, x1: 358, y1: 40 }],
  // 3.1: header, glass stack (chip and vehicle card), locate FAB, the floating bottom pill.
  duty: [
    { x0: 0, y0: 0, x1: 390, y1: 100 },
    { x0: 16, y0: 100, x1: 220, y1: 250 },
    { x0: 322, y0: 660, x1: 390, y1: 720 },
    { x0: 30, y0: 714, x1: 360, y1: 844 },
  ],
  // 3.2: header above, the dispatch sheet over the lower half.
  dispatch: [
    { x0: 0, y0: 0, x1: 390, y1: 100 },
    { x0: 0, y0: 422, x1: 390, y1: 844 },
  ],
  // 404: the device status bar and home indicator.
  lost: [
    { x0: 0, y0: 0, x1: 390, y1: 50 },
    { x0: 0, y0: 800, x1: 390, y1: 844 },
  ],
};

describe('map routes', () => {
  it('keeps the route keys the replicas use', () => {
    expect(MAP_ROUTE_KEYS).toEqual(expect.arrayContaining(['delivery', 'en-route']));
    for (const key of MAP_ROUTE_KEYS) expect(MAP_ROUTE_WAYPOINTS[key].length).toBeGreaterThanOrEqual(2);
  });

  it.each(MAP_ROUTE_KEYS)('%s: every waypoint leg runs along a road', (key) => {
    const legs = samplePolyline(MAP_ROUTE_WAYPOINTS[key], 2);
    const worst = Math.max(...legs.map(offRoad));
    expect(worst).toBeLessThanOrEqual(0);
  });

  it.each(MAP_ROUTE_KEYS)('%s: the drawn route (rounded corners) stays inside the carriageway', (key) => {
    const drawn = samplePolyline(mapRoutePoints(key), 1.5);
    expect(Math.max(...drawn.map(offRoad))).toBeLessThanOrEqual(0);
  });

  it.each(MAP_ROUTE_KEYS)('%s: stays dry and inside the town', (key) => {
    for (const point of samplePolyline(mapRoutePoints(key), 2)) {
      expect(isWet(point)).toBe(false);
      expect(point.x).toBeGreaterThan(TOWN_EXTENT.x0);
      expect(point.x).toBeLessThan(TOWN_EXTENT.x1);
      expect(point.y).toBeGreaterThan(TOWN_EXTENT.y0);
      expect(point.y).toBeLessThan(TOWN_EXTENT.y1);
    }
  });

  it('rounds corners only a little: the drawn route is within 3% of the waypoint length', () => {
    for (const key of MAP_ROUTE_KEYS) {
      const legs = polylineLength(MAP_ROUTE_WAYPOINTS[key]);
      const drawn = polylineLength(mapRoutePoints(key));
      expect(drawn).toBeLessThan(legs);
      expect(drawn / legs).toBeGreaterThan(0.97);
    }
  });

  it('poses the puck on the route with the heading of travel', () => {
    for (const key of MAP_ROUTE_KEYS) {
      const waypoints = MAP_ROUTE_WAYPOINTS[key];
      const start = mapRoutePose(key, 0);
      const end = mapRoutePose(key, 1);
      expect(distance(start, waypoints[0] ?? start)).toBeLessThan(0.11);
      expect(distance(end, waypoints.at(-1) ?? end)).toBeLessThan(0.11);
      for (const at of [0.1, 0.33, 0.5, 0.86, 0.975]) {
        const pose = mapRoutePose(key, at);
        expect(distanceToPolyline(mapRoutePoints(key), pose)).toBeLessThan(0.2);
        expect(mapRouteFraction(key, pose)).toBeCloseTo(at, 2);
      }
    }
    // The delivery leaves the bakery heading east; the drive leaves heading north.
    expect(mapRoutePose('delivery', 0).heading).toBe(90);
    expect(mapRoutePose('en-route', 0).heading).toBe(0);
    // On the old road the drive heads north-east.
    expect(mapRoutePose('en-route', 0.45).heading).toBe(45);
  });
});

describe('map scenes', () => {
  it('covers every map figure and the 404 page', () => {
    const used = new Set(MAP_SCENE_KEYS.flatMap((key) => MAP_SCENES[key].usedBy));
    for (const figure of ['1.5', '2.5', '2.6', '3.1', '3.2', '3.3', '3.6', '404']) expect(used.has(figure)).toBe(true);
    for (const key of MAP_SCENE_KEYS) expect(MAP_SCENES[key].key).toBe(key);
  });

  it('gives mapScene() exactly the scene layers', () => {
    for (const key of MAP_SCENE_KEYS) {
      const scene = MAP_SCENES[key];
      expect(mapScene(key)).toEqual({
        view: scene.view,
        pins: scene.pins,
        route: scene.route,
        puck: scene.puck,
        tilt: scene.tilt,
        traffic: scene.traffic,
        follow: scene.follow,
      });
    }
  });

  it.each(MAP_SCENE_KEYS)('%s: pins and the puck stand on land, inside the town', (key) => {
    const scene = MAP_SCENES[key];
    for (const point of [...(scene.pins ?? []), ...(scene.puck ? [scene.puck] : [])]) {
      expect(isWet(point), `${key} ${JSON.stringify(point)}`).toBe(false);
      expect(point.x).toBeGreaterThan(TOWN_EXTENT.x0);
      expect(point.y).toBeLessThan(TOWN_EXTENT.y1);
    }
  });

  const staticScenes = MAP_SCENE_KEYS.filter((key) => !MAP_SCENES[key].follow);

  it.each(staticScenes)('%s: every pin and the puck lands inside the canvas, clear of the chrome', (key) => {
    const scene = MAP_SCENES[key];
    const box = boxOf(scene);
    const inside = { x0: 6, y0: 0, x1: box.width - 6, y1: box.height };
    const chrome = CHROME[key] ?? [];
    for (const pin of scene.pins ?? []) {
      const art = markerBox(pin, toScreen(scene, pin));
      expect(within(art, inside), `${key} pin ${pin.kind} ${JSON.stringify(art)}`).toBe(true);
      for (const rect of chrome) expect(overlaps(art, rect), `${key} pin ${pin.kind} under chrome ${JSON.stringify(rect)}`).toBe(false);
    }
    if (scene.puck) {
      const at = toScreen(scene, scene.puck);
      const art = { x0: at.x - 22, y0: at.y - 22, x1: at.x + 22, y1: at.y + 22 };
      expect(within(art, inside), `${key} puck`).toBe(true);
      for (const rect of chrome) expect(overlaps(art, rect), `${key} puck under chrome`).toBe(false);
    }
  });

  it('keeps the whole delivery route in the 1.5 band, clear of the ETA chip, controls and Call pill', () => {
    const scene = MAP_SCENES.delivery;
    for (const point of samplePolyline(mapRoutePoints('delivery'), 2)) {
      const at = toScreen(scene, point);
      const reach = { x0: at.x - 5, y0: at.y - 5, x1: at.x + 5, y1: at.y + 5 };
      expect(within(reach, { x0: 0, y0: 0, x1: 358, y1: 220 })).toBe(true);
      for (const rect of CHROME.delivery ?? []) expect(overlaps(reach, rect)).toBe(false);
    }
    // The rider glides back along the route and ends where the poster shows it.
    const glide = scene.puck?.glide?.stops ?? [];
    expect(glide.at(-1)?.at).toBe(0.55);
    expect(mapRoutePose('delivery', 0.55)).toMatchObject({ x: scene.puck?.x, y: scene.puck?.y, heading: scene.puck?.heading });
    expect((glide.at(-1)?.atMs ?? 0) - (glide[0]?.atMs ?? 0)).toBe(2600);
  });

  it('drives 3.3 from the duty position to the incident with the documented timeline', () => {
    const waypoints = MAP_ROUTE_WAYPOINTS['en-route'];
    const duty = MAP_SCENES.duty.puck;
    expect(waypoints[0]).toEqual({ x: duty?.x, y: duty?.y });
    const incident = MAP_SCENES['en-route'].pins?.find((pin) => pin.kind === 'incident');
    expect(incident).toBeDefined();
    expect(distance(waypoints.at(-1) ?? { x: 0, y: 0 }, incident ?? { x: 1, y: 1 })).toBe(0);
    expect(MAP_SCENES.dispatch.pins).toContainEqual(incident);

    const route = MAP_SCENES['en-route'].route;
    expect(route?.color).toBe(MAP_ZONE_COLORS.far);
    expect(route?.recolorAt?.map((stop) => stop.atMs)).toEqual([EN_ROUTE_TIMELINE.closeMs, EN_ROUTE_TIMELINE.nearMs, EN_ROUTE_TIMELINE.onSiteMs]);
    expect(route?.recolorAt?.map((stop) => stop.color)).toEqual([MAP_ZONE_COLORS.close, MAP_ZONE_COLORS.near, MAP_ZONE_COLORS.onSite]);
    const stops = MAP_SCENES['en-route'].puck?.glide?.stops ?? [];
    expect(stops.map((stop) => stop.atMs)).toEqual([EN_ROUTE_TIMELINE.startMs, EN_ROUTE_TIMELINE.nearMs, EN_ROUTE_TIMELINE.onSiteMs]);
    // The near and on-site moments are the glide's stops, so a static state matches the animation.
    expect(MAP_SCENES['en-route-near'].puck).toMatchObject(mapRoutePose('en-route', stops[1]?.at ?? -1));
    expect(MAP_SCENES['en-route-on-site'].puck).toMatchObject(mapRoutePose('en-route', stops[2]?.at ?? -1));
    expect(MAP_SCENES['en-route-near'].route?.color).toBe(MAP_ZONE_COLORS.near);
    expect(MAP_SCENES['en-route-on-site'].route?.color).toBe(MAP_ZONE_COLORS.onSite);
    for (const key of ['en-route', 'en-route-near', 'en-route-on-site'] as const) {
      expect(MAP_SCENES[key]).toMatchObject({ tilt: true, follow: true, height: 'full' });
    }
  });

  it('keeps every glide and recolour within the player limits (ascending, at most 7 stops / 6 recolours)', () => {
    for (const key of MAP_SCENE_KEYS) {
      const { puck, route } = MAP_SCENES[key];
      const stops = puck?.glide?.stops ?? [];
      expect(stops.length === 0 || (stops.length >= 2 && stops.length <= 7)).toBe(true);
      expect(stops.map((stop) => stop.atMs)).toEqual([...stops.map((stop) => stop.atMs)].sort((a, b) => a - b));
      for (const stop of stops) expect(stop.at >= 0 && stop.at <= 1).toBe(true);
      const recolor = route?.recolorAt ?? [];
      expect(recolor.length).toBeLessThanOrEqual(6);
      expect(recolor.map((stop) => stop.atMs)).toEqual([...recolor.map((stop) => stop.atMs)].sort((a, b) => a - b));
      if (stops.length > 0) expect(route).toBeDefined();
    }
  });

  it('places the puck of a trimmed route on that route', () => {
    for (const key of MAP_SCENE_KEYS) {
      const { puck, route } = MAP_SCENES[key];
      if (!puck || !route?.trim) continue;
      expect(distanceToPolyline(mapRoutePoints(route.path), puck), key).toBeLessThan(0.2);
    }
  });
});
