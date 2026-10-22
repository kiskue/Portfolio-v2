import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { citizenReplicas } from '@/components/replicas/citizen';
import { CZ_TAB_BAR_BOTTOM } from '@/components/replicas/citizen/parts/citizen-tab-bar';
import { CZ_HAZARD_TIMELINE, CZ_SOS_TIMELINE, CZ_TAP_REACT_MS, CZ_TAPS } from '@/components/replicas/citizen/parts/timeline';
import {
  czCall,
  czHazardDetail,
  czHazards,
  czHeatIndex,
  czModules,
  czMoreHazards,
  czNews,
  czQuakes,
  czQueueLine,
  czReport,
  czToday,
  heatIndexPercent,
} from '@/components/replicas/citizen/sample-data';
import { MAP_SCENES, R_CANVAS, RCanvas } from '@/components/replicas/kit';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import type { CitizenFigureId, GlimpseStep } from '@/content/types';

/*
 * The Citizen replicas' shared foundations (the SME twin is registry.sme.test.ts): the ONE
 * reconciled sample dataset, the glimpse timelines against the player's taps, the tab-bar
 * geometry from the app's tokens, the W6 map scenes, the per-state DOM budget and the fixed
 * emergency palette.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CITIZEN_DIR = join(ROOT, 'src/components/replicas/citizen');
const read = (path: string): string => readFileSync(path, 'utf8');
const rel = (path: string): string => relative(ROOT, path).replaceAll('\\', '/');
const css = read(join(CITIZEN_DIR, 'citizen.css'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Minutes since midnight of "10:42 AM". */
function clock(text: string): number {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(text);
  if (!match) throw new Error(`not a clock time: ${text}`);
  const hours = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return hours * 60 + Number(match[2]);
}

/** moment's fromNow() for 90 minutes to 21 hours: the hours, rounded. */
function hoursAgo(minutes: number): string {
  expect(minutes).toBeGreaterThanOrEqual(90);
  return `${Math.round(minutes / 60)} hours ago`;
}

/** "Now" in the replicas: Monday, October 19 2026, 12:40 PM (sample-data.ts header). */
const NOW = clock('12:40 PM');

const citizenFigures = figures.filter((figure) => figure.app === 'citizen');

function render(id: CitizenFigureId, state: string): string {
  return renderToStaticMarkup(createElement(RCanvas, { app: 'citizen', theme: 'light' }, createElement(citizenReplicas[id], { state })));
}

/** Elements inside the canvas (the RCanvas root itself excluded), as the browser counts them. */
function elementCount(html: string): number {
  return [...html.matchAll(/<[a-zA-Z][\w-]*/g)].length - 1;
}

// ─── Sample data ─────────────────────────────────────────────────────────────────────────

describe('Citizen sample data: one reconciled, fictional timeline', () => {
  it('dates every card on Monday, October 19 2026', () => {
    expect(czToday).toEqual({ long: 'October 19, 2026', short: 'Oct 19' });
    expect(czNews.stamp.startsWith(czToday.long)).toBe(true);
  });

  it('derives each "N hours ago" from the report time and 12:40 PM', () => {
    for (const hazard of czHazards) expect(hazard.ago, hazard.type).toBe(hoursAgo(NOW - clock(hazard.time)));
    const newsTime = /at (\d{1,2}:\d{2} [AP]M)$/.exec(czNews.stamp)?.[1] ?? '';
    expect(czNews.ago).toBe(hoursAgo(NOW - clock(newsTime)));
  });

  it('lists hazards newest first, the Flood report first', () => {
    const times = czHazards.map((hazard) => clock(hazard.time));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(czHazards[0]?.type).toBe('Flood');
  });

  it('keeps the counts the lists print true', () => {
    expect(czMoreHazards).toBe(`See More (${czHazards.length - 2} more)`);
    expect(czMoreHazards).toBe('See More (3 more)');
    expect(czModules.quakes.subtitle).toBe(`${czQuakes.length} recent event(s)`);
    expect(czQuakes).toHaveLength(3); // the Home monitor's limit={3}
  });

  it('labels each quake by magnitude and flags only the one under an hour old', () => {
    for (const quake of czQuakes) expect(quake.label, quake.place).toBe(Number(quake.magnitude) < 3 ? 'Minor' : 'Light');
    expect(czQuakes.filter((quake) => quake.recent).map((quake) => quake.ago)).toEqual(['12 minutes ago']);
  });

  it('opens the same Flood report on the map (2.5) as in the lists', () => {
    const [flood] = czHazards;
    expect(flood).toBeDefined();
    if (!flood) return;
    expect(czHazardDetail.meta).toBe(`${flood.type} • ${czToday.short}, ${flood.time}`);
    expect(czHazardDetail.chips).toEqual({
      hazard: `Hazard: ${flood.type}`,
      ago: `about ${flood.ago}`,
      distance: `${flood.distance} from you`,
    });
    expect(czHazardDetail.pins.hazard).toBe(flood.type);
  });

  it('puts the heat-index marker in the Extreme Caution band of the 27–60 °C bar', () => {
    expect(heatIndexPercent()).toBeCloseTo(33.94, 2);
    const flexes = czHeatIndex.segments.map((segment) => segment.flex);
    const total = flexes.reduce((sum, flex) => sum + flex, 0);
    const start = ((flexes[0] ?? 0) / total) * 100;
    const end = (((flexes[0] ?? 0) + (flexes[1] ?? 0)) / total) * 100;
    expect(heatIndexPercent()).toBeGreaterThan(start);
    expect(heatIndexPercent()).toBeLessThan(end);
    expect(czHeatIndex.level.bar).toBe(czHeatIndex.segments[1]?.color);
    expect(czHeatIndex.label).toBe(`${czHeatIndex.value}°C`);
  });

  it('prints the queue line the app prints for server position 3', () => {
    expect(czQueueLine(czCall.queuePosition)).toBe('You are now #2 in queue');
    expect(czQueueLine(1)).toBe('Finding available agent…');
  });
});

// ─── Glimpse timelines ───────────────────────────────────────────────────────────────────

/** Animation duration in ms of a citizen.css keyframe, read from its [data-active] rule. */
function durationOf(keyframes: string): number {
  const match = new RegExp(`animation:\\s*${keyframes}\\s+(\\d+)ms`).exec(css);
  if (!match) throw new Error(`no animation ${keyframes} in citizen.css`);
  return Number(match[1]);
}

function citizenStep(figure: CitizenFigureId): GlimpseStep {
  const step = glimpses.flatMap((glimpse) => glimpse.steps).find((candidate) => candidate.figure === figure);
  if (!step) throw new Error(`no glimpse step for ${figure}`);
  return step;
}

describe('Citizen glimpse timelines: each screen reacts 180 ms after the player’s tap', () => {
  const sos = citizenStep('2.3');
  const hazards = citizenStep('2.5');

  it('answers the taps glimpses.ts actually plays', () => {
    expect(CZ_TAP_REACT_MS).toBe(180);
    expect(sos.taps?.map((tap) => tap.atMs)).toEqual([CZ_TAPS.sosMs, CZ_TAPS.confirmMs]);
    expect(hazards.taps?.map((tap) => tap.atMs)).toEqual([CZ_TAPS.floodMs]);
    expect([sos.state, sos.posterState]).toEqual(['idle', 'countdown']);
    expect([hazards.state, hazards.posterState]).toEqual(['list', 'map']);
  });

  it('2.3: presses SOS and Confirm Call 180 ms after their taps and rests on the countdown poster', () => {
    expect(CZ_SOS_TIMELINE.pressMs).toBe(CZ_TAPS.sosMs + CZ_TAP_REACT_MS);
    expect(CZ_SOS_TIMELINE.confirmMs).toBe(CZ_TAPS.confirmMs + CZ_TAP_REACT_MS);
    expect(CZ_SOS_TIMELINE.popupMs).toBeGreaterThan(CZ_SOS_TIMELINE.pressMs);
    // 5s, 4s, then the poster's 3s, all before Confirm Call is tapped.
    expect(CZ_SOS_TIMELINE.popupMs + 2 * CZ_SOS_TIMELINE.tickMs).toBeLessThan(CZ_TAPS.confirmMs);
    expect(CZ_SOS_TIMELINE.confirmMs + durationOf('rx-citizen-confirm-press')).toBeLessThanOrEqual(sos.holdMs);
  });

  it('2.5: dims the Flood card 180 ms after the tap, then the map is up with its card within the hold', () => {
    expect(CZ_HAZARD_TIMELINE.tapMs).toBe(CZ_TAPS.floodMs + CZ_TAP_REACT_MS);
    expect(CZ_HAZARD_TIMELINE.sheetMs).toBeGreaterThan(CZ_HAZARD_TIMELINE.tapMs);
    expect(CZ_HAZARD_TIMELINE.cardMs).toBeGreaterThanOrEqual(CZ_HAZARD_TIMELINE.sheetMs + durationOf('rx-citizen-sheet-up') - 60);
    expect(CZ_HAZARD_TIMELINE.cardMs + durationOf('rx-citizen-rise')).toBeLessThanOrEqual(hazards.holdMs);
  });

  it('times those animations through the screens’ custom properties, not literal delays', () => {
    for (const [keyframes, variable] of [
      ['rx-citizen-sos-press', '--rx-citizen-press-at'],
      ['rx-citizen-sos-commit', '--rx-citizen-commit-at'],
      ['rx-citizen-confirm-press', '--rx-citizen-confirm-at'],
      ['rx-citizen-tap', '--rx-citizen-tap-at'],
      ['rx-citizen-sheet-up', '--rx-citizen-sheet-at'],
      ['rx-citizen-rise', '--rx-citizen-map-at'],
    ] as const) {
      expect(css, keyframes).toMatch(new RegExp(`animation:\\s*${keyframes}\\s+\\d+ms[^;]*var\\(${variable}`));
    }
    const idle = render('2.3', 'idle');
    expect(idle).toContain(`--rx-citizen-press-at:${CZ_SOS_TIMELINE.pressMs}ms`);
    expect(idle).toContain(`--rx-citizen-confirm-at:${CZ_SOS_TIMELINE.confirmMs}ms`);
    expect(render('2.5', 'list')).toContain(`--rx-citizen-tap-at:${CZ_HAZARD_TIMELINE.tapMs}ms`);
  });
});

// ─── Tab bar, safe area and scroll insets ────────────────────────────────────────────────

describe('Citizen tab bar: 12 px above the bottom safe area, as tabBarTokens.ts places it', () => {
  it('sits 46 px up, so the SOS centre is at y 734', () => {
    expect(CZ_TAB_BAR_BOTTOM).toBe(R_CANVAS.homeIndicator + 12);
    const barTop = R_CANVAS.height - CZ_TAB_BAR_BOTTOM - 64;
    expect(barTop).toBe(734);
    expect(render('2.1', 'top')).toContain(`bottom:${CZ_TAB_BAR_BOTTOM}px`);
  });

  it('paints the bottom inset white, the height of the home-indicator zone', () => {
    expect(css).toMatch(new RegExp(`\\.rx-citizen-inset \\{[^}]*height: ${R_CANVAS.homeIndicator}px;[^}]*background: #ffffff;`));
    for (const [id, state] of [['2.1', 'top'], ['2.3', 'idle'], ['2.5', 'list'], ['2.6', 'form']] as const) {
      expect(render(id, state).match(/class="rx-citizen-inset"/g), `${id} ${state}`).toHaveLength(1);
    }
  });

  it('reserves the app’s BAR_SCROLL_INSET (12 + 64 + 12) under the Home feed', () => {
    expect(css).toMatch(/\.rx-citizen-feed \{[^}]*padding-bottom: 88px;/);
  });
});

// ─── Maps ────────────────────────────────────────────────────────────────────────────────

describe('Citizen maps: W6 scenes in town coordinates', () => {
  it('2.5 shows the hazards scene: two red teardrop pins titled from the sample data', () => {
    for (const html of [render('2.5', 'map'), render('2.5', 'list')]) {
      const { view, pins = [] } = MAP_SCENES.hazards;
      expect(html).toContain(`translate(${-(view?.cx ?? 0)}px, ${-(view?.cy ?? 0)}px)`);
      expect(html.match(/class="rx-map-pin"/g)).toHaveLength(pins.length);
      expect(html).not.toContain('data-look="dot"');
      expect(html.match(/data-look="pin"/g)).toHaveLength(2);
      expect(html).toContain(`>${czHazardDetail.pins.hazard}</span>`);
      expect(html).toContain(`>${czHazardDetail.pins.you}</span>`);
      expect(html.match(/rx-map-pin__label" data-side="bottom"/g)).toHaveLength(2);
    }
  });

  it('2.6 shows the report scene: one red "Current Location" pin on the 182 px map', () => {
    const html = render('2.6', 'form');
    const { view, height } = MAP_SCENES.report;
    expect(height).toBe(182);
    expect(html).toContain(`height:${height}px`);
    expect(html).toContain(`translate(${-(view?.cx ?? 0)}px, ${-(view?.cy ?? 0)}px)`);
    expect(html.match(/class="rx-map-pin"/g)).toHaveLength(1);
    expect(html).toContain('data-look="pin"');
    expect(html).toContain(`>${czReport.pin}</span>`);
  });
});

// ─── DOM budget ──────────────────────────────────────────────────────────────────────────

describe('Citizen DOM budget: Home renders about 10 replica trees within 3,000 nodes', () => {
  it('keeps every state at or under 250 elements', () => {
    const counts: string[] = [];
    for (const figure of citizenFigures) {
      for (const state of figure.states) {
        const count = elementCount(render(figure.id as CitizenFigureId, state));
        counts.push(`${figure.id} ${state} ${count}`);
        expect(count, `${figure.id} ${state}`).toBeLessThanOrEqual(250);
      }
    }
    console.info(`[citizen DOM] ${counts.join(' · ')}`);
  });

  it('draws only the feed rows a Home screen can show', () => {
    // 2.3 shows the dashboard and the first band under it; 2.1 scrolls 260 px, to the Today's Report band.
    expect(render('2.3', 'idle')).not.toContain('rx-citizen-annc');
    expect(render('2.3', 'offline')).not.toContain('rx-citizen-module');
    expect(render('2.1', 'top')).not.toContain('rx-citizen-hazard');
    expect(render('2.2', 'feed').match(/class="rx-citizen-hazard"/g)).toHaveLength(2);
  });
});

// ─── citizen.css ─────────────────────────────────────────────────────────────────────────

describe('citizen.css: fixed emergency palette, brand only through the --rx-* bridge', () => {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? '').trim(),
    body: match[2] ?? '',
  }));
  const BRAND = /var\(--rx-(primary|secondary|accent|lighttext|title-ink)\)/;

  it('never sets a brand variable', () => {
    expect(clean).not.toMatch(/--(app|rx)-(primary|secondary|accent|lighttext|title-ink|logo|name)\s*:/);
  });

  it('keeps SOS, the popup, the call, hazard, quake-intensity, heat-index and offline colours off the brand', () => {
    // Class prefixes (no \b: "_" is a word character): rx-citizen-hi* is only the heat index, and
    // rx-citizen-sos* covers the button, the popup and the press flow.
    const fixed = /\.rx-citizen-(sos|call|hangup|hazard|quake__mag|quake__new|hi|offline|news__new)/;
    expect(blocks.filter((block) => fixed.test(block.selector)).length).toBeGreaterThan(60);
    const offenders = blocks.filter((block) => fixed.test(block.selector) && BRAND.test(block.body)).map((block) => block.selector);
    expect(offenders).toEqual([]);
    expect(css).toContain('linear-gradient(180deg, #d84343 0%, #d84343 25%, #b02b2b 100%)');
  });

  it('is imported exactly once, from citizen/index.ts', () => {
    const importsCss = /^\s*import\s+['"][^'"]*\bcitizen\.css['"]/m;
    const importers = sourceFiles(join(ROOT, 'src')).filter((file) => importsCss.test(read(file)));
    expect(importers.map(rel)).toEqual(['src/components/replicas/citizen/index.ts']);
  });
});
