import { Bell, House, MapPin, Phone, Sparkles, TrendingUp } from 'lucide-react';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as kit from '@/components/replicas/kit';
import {
  PendingReplica,
  RAppBar,
  RAutoScroll,
  RAvatar,
  RAvatarStack,
  RBarPairs,
  RBottomSheet,
  RBubble,
  RButton,
  RCallBackdrop,
  RCanvas,
  RCard,
  RCountBadge,
  RDivider,
  RField,
  RGlassButton,
  RIconChip,
  RKpiTile,
  RLineChart,
  RListRow,
  RLoadingDots,
  RMapCanvas,
  RModalCard,
  RPill,
  RProgress,
  RRipple,
  RSearchField,
  RSegmentBar,
  RSegmented,
  RSpinner,
  RStack,
  RStateSequence,
  RStepper,
  RTabBar,
  RText,
  RToast,
  RTypewriter,
  RVTimeline,
  RWaveform,
  pickState,
  rStyle,
  waveformHeights,
} from '@/components/replicas/kit';

const ALLOWED_TAGS = new Set(['div', 'span', 'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

function render(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

function tagsIn(html: string): readonly string[] {
  return [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => (match[1] ?? '').toLowerCase());
}

function classesIn(html: string): readonly string[] {
  return [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((match) => (match[1] ?? '').split(/\s+/).filter(Boolean));
}

/** Every exported part with representative props (the gallery on /dev/replicas shows the same). */
const SPECIMENS: readonly (readonly [string, ReactElement])[] = [
  ['RCanvas', createElement(RCanvas, { app: 'citizen', theme: 'light' }, 'canvas')],
  ['RStack', createElement(RStack, { dir: 'row', gap: 8, pad: [12, 16, 8], align: 'center', justify: 'between' }, 'x')],
  ['RText', createElement(RText, { size: 13, weight: 600, upper: true, lines: 2, tabular: true }, 'Text')],
  ['RDivider', createElement(RDivider, { vertical: true, thickness: 2, inset: 4 })],
  ['RAppBar citizen', createElement(RAppBar, { look: 'citizen', title: 'Hazard Monitoring', logo: true })],
  ['RAppBar sme', createElement(RAppBar, { look: 'sme', logo: true, badge: 3 })],
  ['RAppBar sheet', createElement(RAppBar, { look: 'sheet', leading: 'back', title: 'Hazard Report', subtitle: 'Flood' })],
  [
    'RTabBar',
    createElement(RTabBar, {
      look: 'citizen-floating',
      items: [
        { icon: House, label: 'Home', active: true },
        { icon: Bell, label: 'Alerts' },
      ],
      center: createElement(RAvatar, { initials: 'SOS', size: 80 }),
    }),
  ],
  [
    'RCard',
    createElement(RCard, { radius: 14, border: 'faint', shadow: 'sm', pad: 14, edge: { side: 'left', color: '#ef4444', width: 4 } }, 'card'),
  ],
  ['RListRow', createElement(RListRow, { title: 'Flood', subtitle: 'Sample overpass', meta: 'meta', trailing: 'chevron' })],
  ['RKpiTile kpi', createElement(RKpiTile, { look: 'kpi', icon: TrendingUp, label: 'Gross Income', value: '₱48,250.00', accent: '#27ae60' })],
  ['RKpiTile stat', createElement(RKpiTile, { look: 'stat-tile', icon: TrendingUp, label: 'Trend', value: '+12.4%', accent: '#27ae60', sub: 'x' })],
  ['RButton', createElement(RButton, { look: 'solid', label: 'Checkout', sublabel: '3 items', icon: Sparkles, full: true })],
  ['RButton loading', createElement(RButton, { look: 'soft', label: 'Generating…', state: 'loading' })],
  ['RGlassButton', createElement(RGlassButton, { icon: Phone, size: 68, tone: 'solid', caption: 'Answer', ripple: { count: 2 } })],
  ['RPill', createElement(RPill, { label: 'LIVE', color: '#22c55e', dot: 'pulse', upper: true, icon: MapPin, border: true })],
  ['RIconChip', createElement(RIconChip, { icon: MapPin, color: '#d84343', size: 35, shape: 'circle', solid: true })],
  ['RSegmented', createElement(RSegmented, { options: ['EN', 'FIL'], active: 1, look: 'toggle' })],
  ['RCountBadge', createElement(RCountBadge, { count: 120, ring: '#1e4d8c' })],
  ['RField', createElement(RField, { kind: 'select', label: 'Case Type', required: true, value: 'Fire', focused: true, error: 'Required', hint: 'Hint' })],
  ['RSearchField', createElement(RSearchField, { placeholder: 'Search products…', radius: 'full' })],
  ['RStepper', createElement(RStepper, { value: 1, trashAtOne: true })],
  ['RProgress', createElement(RProgress, { value: 72, color: '#f59e0b' })],
  [
    'RSegmentBar',
    createElement(RSegmentBar, {
      segments: [
        { flex: 5, color: '#ffff00' },
        { flex: 9, color: '#f1c232' },
      ],
      marker: { at: 31, color: '#f1c232' },
      ticks: ['27°C', '33°C'],
    }),
  ],
  [
    'RVTimeline',
    createElement(RVTimeline, {
      steps: [
        { label: 'Confirmed', state: 'done', meta: '11:42 AM' },
        { label: 'Out for delivery', state: 'active' },
        { label: 'Completed', state: 'pending' },
      ],
    }),
  ],
  ['RAvatar', createElement(RAvatar, { initials: 'AS', size: 112, ripple: { count: 2, color: '#60a5fa' } })],
  ['RAvatarStack', createElement(RAvatarStack, { people: [{ initials: 'AS' }, { initials: 'RT' }, { initials: 'MV' }], max: 2 })],
  ['RBubble', createElement(RBubble, { from: 'me', voice: { seconds: 7, played: 3 }, transcript: 'Copy.', lang: 'English', urgent: true })],
  ['RWaveform', createElement(RWaveform, { seed: 7, played: 0.5 })],
  ['RBottomSheet', createElement(RBottomSheet, { height: '50%', handle: { color: '#085499' }, header: 'h', footer: 'f', scrim: true }, 'body')],
  ['RModalCard', createElement(RModalCard, { width: '92%', radius: 21, blur: 8 }, 'modal')],
  ['RToast', createElement(RToast, { text: 'New ticket assigned.', icon: Bell })],
  ['RCallBackdrop', createElement(RCallBackdrop, { palette: 'responder', orbs: '#60a5fa', silhouette: true, scrim: 0.3 })],
  [
    'RStateSequence',
    createElement(RStateSequence, {
      frames: [
        { atMs: 0, node: 'a' },
        { atMs: 400, node: 'b' },
      ],
    }),
  ],
  ['RTypewriter', createElement(RTypewriter, { text: 'Hello there', startMs: 100 })],
  ['RAutoScroll', createElement(RAutoScroll, { distance: 320, startMs: 800, durationMs: 1600 }, 'rows')],
  ['RSpinner', createElement(RSpinner, { size: 20 })],
  ['RRipple', createElement(RRipple, { size: 70 })],
  ['RLoadingDots', createElement(RLoadingDots, {})],
  ['RMapCanvas', createElement(RMapCanvas, { theme: 'light', height: 220 })],
  ['RLineChart', createElement(RLineChart, { history: [1, 2], color: '#000', projColor: '#000', height: 180, yLabels: [], xLabels: [] })],
  ['RBarPairs', createElement(RBarPairs, { pairs: [[1, 2]], colors: ['#27ae60', '#ff5c55'] })],
  ['PendingReplica', createElement(PendingReplica, { state: 'online' })],
];

describe('replica kit', () => {
  it('exports every part the plan lists', () => {
    const parts = [
      'RCanvas', 'RAppBar', 'RTabBar', 'RCard', 'RListRow', 'RButton', 'RPill', 'RIconChip', 'RSegmented', 'RField',
      'RSearchField', 'RStepper', 'RProgress', 'RSegmentBar', 'RAvatar', 'RAvatarStack', 'RCountBadge', 'RBubble',
      'RWaveform', 'RVTimeline', 'RKpiTile', 'RBottomSheet', 'RModalCard', 'RToast', 'RCallBackdrop', 'RGlassButton',
      'RStateSequence', 'RTypewriter', 'RAutoScroll', 'PendingReplica', 'RMapCanvas', 'RLineChart', 'RBarPairs',
    ];
    const exported = kit as unknown as Readonly<Record<string, unknown>>;
    expect(parts.filter((name) => typeof exported[name] !== 'function')).toEqual([]);
  });

  it.each(SPECIMENS)('%s renders only div, span and svg', (_, element) => {
    const html = render(element);
    expect(tagsIn(html).filter((tag) => !ALLOWED_TAGS.has(tag))).toEqual([]);
  });

  it.each(SPECIMENS)('%s uses rx- / r- class names (plus Lucide glyph classes)', (_, element) => {
    const foreign = classesIn(render(element)).filter((name) => !/^(rx-|r-|lucide$|lucide-)/.test(name));
    expect(foreign).toEqual([]);
  });

  it.each(SPECIMENS)('%s never sets the player attributes or brand variables', (_, element) => {
    const html = render(element);
    expect(html).not.toMatch(/\sdata-(active|paused|next)[\s=>]/);
    expect(html).not.toMatch(/--app-[\w-]+\s*:/);
  });

  it('RCanvas marks the app and theme for fonts and tokens', () => {
    const html = render(createElement(RCanvas, { app: 'sme', theme: 'dark' }));
    expect(html).toContain('class="rx-canvas"');
    expect(html).toContain('data-app="sme"');
    expect(html).toContain('data-theme="dark"');
  });

  it('selected options and tabs carry data-on', () => {
    expect(render(createElement(RSegmented, { options: ['Day', 'Week'], active: 1, look: 'pills' }))).toMatch(
      /<span class="rx-seg__opt">Day<\/span><span class="rx-seg__opt" data-on="">Week<\/span>/,
    );
    const tabs = render(createElement(RTabBar, { look: 'sme-glass', items: [{ icon: House, label: 'Home', active: true }] }));
    expect(tabs).toContain('class="rx-tabbar__item" data-on=""');
  });

  it('RButton draws a spinner while loading and a check on success', () => {
    expect(render(createElement(RButton, { look: 'solid', label: 'Save', state: 'loading' }))).toContain('rx-spinner');
    expect(render(createElement(RButton, { look: 'solid', label: 'Saved', state: 'success' }))).toContain('lucide-check');
  });
});

describe('motion parts (static markup; the CSS contract is tested in replica-kit.motion.test.ts)', () => {
  it('RStateSequence marks the poster and times each frame from activation', () => {
    const html = render(
      createElement(RStateSequence, {
        posterFrame: 2,
        fadeMs: 200,
        frames: [
          { atMs: 0, node: 'queue' },
          { atMs: 1600, node: 'calling' },
          { atMs: 3200, node: 'connected' },
        ],
      }),
    );
    const frames = [...html.matchAll(/<div class="rx-seq__frame"([^>]*)>([^<]*)</g)].map((match) => ({ attrs: match[1] ?? '', text: match[2] }));
    expect(frames.map((frame) => frame.text)).toEqual(['queue', 'calling', 'connected']);
    expect(frames.map((frame) => frame.attrs.includes('data-poster'))).toEqual([false, false, true]);
    expect(frames[0]?.attrs).toContain('--rx-frame-in:0ms;--rx-frame-fade:0ms;--rx-frame-out:1800ms');
    expect(frames[1]?.attrs).toContain('--rx-frame-in:1600ms;--rx-frame-fade:200ms;--rx-frame-out:3400ms');
    expect(frames[2]?.attrs).toContain('data-last=""');
    expect(frames[2]?.attrs).not.toContain('--rx-frame-out');
  });

  it('RStateSequence clamps the poster to a real frame', () => {
    const html = render(createElement(RStateSequence, { posterFrame: 9, frames: [{ atMs: 0, node: 'a' }, { atMs: 10, node: 'b' }] }));
    expect(html.match(/data-poster/g)).toHaveLength(1);
    expect(html).toMatch(/data-poster="" data-last=""[^>]*>b</);
  });

  it('RTypewriter keeps the full text (the poster) and times each word by character count', () => {
    const html = render(createElement(RTypewriter, { text: 'Hi there  you', startMs: 100, msPerChar: 10 }));
    expect(html.replace(/<[^>]+>/g, '')).toBe('Hi there  you');
    const times = [...html.matchAll(/--rx-word-at:(\d+)ms/g)].map((match) => Number(match[1]));
    expect(times).toEqual([100, 130, 200]);
  });

  it('RAutoScroll scrolls down by the distance whatever its sign, and names its poster offset', () => {
    for (const distance of [320, -320]) {
      const html = render(createElement(RAutoScroll, { distance, startMs: 800, durationMs: 1600, poster: 'end' }, 'x'));
      expect(html).toContain('data-poster="end"');
      expect(html).toContain('--rx-scroll-dist:-320px;--rx-scroll-start:800ms;--rx-scroll-dur:1600ms');
    }
  });

  it('waveforms are seeded and deterministic', () => {
    expect(waveformHeights(7, 22)).toEqual(waveformHeights(7, 22));
    expect(waveformHeights(7, 22)).not.toEqual(waveformHeights(8, 22));
    expect(waveformHeights(7, 22)).toHaveLength(22);
    for (const height of waveformHeights(42, 64)) {
      expect(height).toBeGreaterThanOrEqual(28);
      expect(height).toBeLessThanOrEqual(100);
    }
    const html = render(createElement(RWaveform, { seed: 3, bars: 10, played: 0.5 }));
    expect(html.match(/data-played/g)).toHaveLength(5);
  });
});

describe('kit helpers', () => {
  it('pickState returns a known state or the default', () => {
    const states = ['idle', 'countdown', 'offline'] as const;
    expect(pickState(states, 'countdown')).toBe('countdown');
    expect(pickState(states, 'nope')).toBe('idle');
    expect(pickState(states, undefined)).toBe('idle');
  });

  it('rStyle drops undefined entries and returns undefined when nothing is left', () => {
    expect(rStyle({ '--rx-a': undefined }, { color: undefined })).toBeUndefined();
    expect(rStyle({ '--rx-a': '1px', '--rx-b': undefined }, { height: '2px' })).toEqual({ height: '2px', '--rx-a': '1px' });
  });
});
