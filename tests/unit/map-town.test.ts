import { describe, expect, it } from 'vitest';
import { distanceToPolyline, inPolygon, inRect, polylineLength, samplePolyline } from '@/components/replicas/kit/map-geometry';
import { RIVER_WIDTH, ROAD_WIDTH, TOWN, TOWN_EXTENT } from '@/components/replicas/kit/map-town';

/*
 * The one fictional town (map-town.ts): roads stay on land (bridges only on major roads), blocks
 * of buildings keep clear of roads and water, and every name on the map is invented and generic
 * (PLAN content safety: no real place or street names).
 */

describe('the fictional town', () => {
  it('builds roads, water, areas and buildings', () => {
    const stats = {
      roads: TOWN.roads.length,
      buildings: TOWN.buildings.length,
      areas: TOWN.areas.length,
      traffic: TOWN.traffic.length,
      riverLength: Math.round(polylineLength(TOWN.river)),
    };
    console.info('[town]', JSON.stringify(stats));
    expect(stats.roads).toBeGreaterThan(40);
    expect(stats.buildings).toBeGreaterThan(1500);
    expect(stats.riverLength).toBeGreaterThan(1000);
    expect(TOWN.extent).toEqual(TOWN_EXTENT);
  });

  it('keeps every road on land: none in the bay, and only major roads and the highway cross the river', () => {
    const bridges = new Set<string>();
    for (const road of TOWN.roads) {
      for (const point of samplePolyline(road.points, 3)) {
        expect(inPolygon(point, TOWN.sea), `${road.kind} ${JSON.stringify(point)}`).toBe(false);
        if (distanceToPolyline(TOWN.river, point) < RIVER_WIDTH / 2) {
          expect(road.kind, `a ${road.kind} road in the river at ${JSON.stringify(point)}`).not.toBe('minor');
          bridges.add(`${road.kind}:${Math.round(point.x / 40)}:${Math.round(point.y / 40)}`);
        }
      }
    }
    // Example Ave., Sample St., two more avenues, Bridge St., School St. and the highway.
    expect(new Set([...bridges].map((key) => key.split(':').slice(0, 1).join())).size).toBeGreaterThanOrEqual(2);
    expect(bridges.size).toBeGreaterThanOrEqual(6);
  });

  it('keeps buildings on land, clear of the river, the beach and every road', () => {
    for (const b of TOWN.buildings) {
      const corners = [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
      ];
      const centre = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      expect(inRect(centre, TOWN_EXTENT)).toBe(true);
      for (const corner of corners) {
        expect(inPolygon(corner, TOWN.sea)).toBe(false);
        expect(distanceToPolyline(TOWN.river, corner)).toBeGreaterThan(RIVER_WIDTH / 2);
      }
      for (const road of TOWN.roads) {
        if (distanceToPolyline(road.points, centre) > 80) continue;
        expect(distanceToPolyline(road.points, centre), `building ${JSON.stringify(b)} on a ${road.kind} road`).toBeGreaterThan(ROAD_WIDTH[road.kind] / 2);
      }
    }
  });

  it('draws traffic only on major roads and the highway', () => {
    for (const stretch of TOWN.traffic) {
      const road = TOWN.roads.filter((candidate) => candidate.kind === stretch.road);
      for (const point of stretch.points) expect(Math.min(...road.map((r) => distanceToPolyline(r.points, point)))).toBeLessThan(0.5);
    }
    // The field report (3.6) is filed at a jammed junction.
    expect(TOWN.traffic.some((stretch) => stretch.level === 'jam' && stretch.points.some((p) => Math.hypot(p.x - 105, p.y - 720) < 80))).toBe(true);
  });

  it('names only invented, generic places (no real place or street names)', () => {
    expect(TOWN.labels.map((label) => label.text).sort()).toEqual(
      [
        'BRGY. COAST',
        'BRGY. EXAMPLE',
        'BRGY. NORTH',
        'BRGY. SAMPLE',
        'Bridge St.',
        'Bridge St.',
        'Coastal Rd.',
        'Example Ave.',
        'Example Ave.',
        'Example Bay',
        'Hill St.',
        'North Hwy.',
        'Old Rd.',
        'Old Rd.',
        'Plaza Ave.',
        'Plaza Ave.',
        'Riverside Dr.',
        'Sample River',
        'Sample River',
        'Sample Rd.',
        'Sample St.',
        'Sample St.',
        'School St.',
      ].sort(),
    );
    expect(TOWN.pois.map((poi) => poi.label).sort()).toEqual(
      ['Central School', 'Gas Station', 'North Park', 'Public Market', 'Riverside Park', 'Town Hospital', 'Town Plaza'].sort(),
    );
  });

  it('keeps labels upright and inside the town', () => {
    for (const label of TOWN.labels) {
      expect(label.angle >= -90 && label.angle <= 90, `${label.text} ${label.angle}`).toBe(true);
      expect(inRect(label, TOWN_EXTENT)).toBe(true);
    }
  });
});
