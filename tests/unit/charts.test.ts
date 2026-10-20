import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  barPairHeights,
  lineChartRange,
  lineChartXIndex,
  parseChartValue,
  RBarPairs,
  RLineChart,
} from '@/components/replicas/kit';
import { smeDashboard, smeForecast } from '@/components/replicas/sme/sample-data';

const ALLOWED_TAGS = new Set(['div', 'span', 'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

function tagsIn(html: string): readonly string[] {
  return [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => (match[1] ?? '').toLowerCase());
}

function forecastChart(): string {
  return renderToStaticMarkup(
    createElement(RLineChart, {
      history: smeForecast.history,
      projected: smeForecast.projected,
      color: '#1E4D8C',
      projColor: '#1E4D8C80',
      height: 180,
      yLabels: smeForecast.yLabels,
      xLabels: smeForecast.xLabels,
    }),
  );
}

describe('chart helpers', () => {
  it('reads plain amounts from labels', () => {
    expect(parseChartValue('₱3,200')).toBe(3200);
    expect(parseChartValue('2,000')).toBe(2000);
    expect(parseChartValue('-1.5')).toBe(-1.5);
    expect(parseChartValue('72%')).toBe(72);
    expect(parseChartValue('2.5k')).toBeNull();
    expect(parseChartValue('High')).toBeNull();
  });

  it('takes the y range from explicit bounds, then the labels, then the data', () => {
    expect(lineChartRange([2205, 3005], smeForecast.yLabels)).toEqual({ min: smeForecast.yMin, max: smeForecast.yMax });
    expect(lineChartRange([1, 2], ['10', '0'], 0, 5)).toEqual({ min: 0, max: 5 });
    const data = lineChartRange([100, 200], ['High', 'Low']);
    expect(data.min).toBeLessThan(100);
    expect(data.max).toBeGreaterThan(200);
    expect(lineChartRange([5, 5], [])).toMatchObject({ min: expect.any(Number) as number });
    const flat = lineChartRange([5, 5], []);
    expect(flat.max).toBeGreaterThan(flat.min);
  });

  it('places day and days-ahead x labels on the combined series', () => {
    expect(lineChartXIndex('1', 18)).toBe(0);
    expect(lineChartXIndex('16', 18)).toBe(15);
    expect(lineChartXIndex('+1', 18)).toBe(18);
    expect(lineChartXIndex('+14', 18)).toBe(31);
    expect(lineChartXIndex('Mon', 18)).toBeNull();
  });

  it('scales bar pairs to the largest value with a 2 px floor', () => {
    expect(barPairHeights([[50, 100], [0, 25]], 80)).toEqual([[40, 80], [2, 20]]);
    expect(barPairHeights([], 80)).toEqual([]);
    const weeks = barPairHeights(smeDashboard.salesVsCosts.pairs, 80);
    expect(Math.max(...weeks.flat())).toBe(80);
  });
});

describe('RLineChart', () => {
  it('draws the forecast as the app does: a dot per point and a dashed projection from the last day', () => {
    const html = forecastChart();
    expect(tagsIn(html).filter((tag) => !ALLOWED_TAGS.has(tag))).toEqual([]);
    expect((html.match(/class="rx-line__dot"/g) ?? []).length).toBe(smeForecast.history.length + smeForecast.projected.length);
    expect((html.match(/data-kind="projection"/g) ?? []).length).toBe(smeForecast.projected.length);
    const history = /d="([^"]*)" class="rx-line__history"/.exec(html)?.[1] ?? '';
    const projection = /d="([^"]*)" class="rx-line__projection"/.exec(html)?.[1] ?? '';
    const points = (d: string): number[][] => d.split(/\s*[ML]/).filter(Boolean).map((pair) => pair.trim().split(' ').map(Number));
    expect(points(history)).toHaveLength(smeForecast.history.length);
    expect(points(projection)).toHaveLength(smeForecast.projected.length + 1);
    expect(points(projection)[0]).toEqual(points(history).at(-1));
    // The top label (₱3,200) sits on the top gridline and the bottom one (₱2,000) at 180 px.
    expect(html).toContain('style="top:0px">₱3,200</span>');
    expect(html).toContain('style="top:180px">₱2,000</span>');
    // The first history point: ₱2,395 is (3200 − 2395) / 1200 of 180 px down, at the left edge.
    const [x0, y0] = points(history)[0] ?? [];
    expect(x0).toBe(0);
    expect(y0).toBeCloseTo(((3200 - 2395) / 1200) * 180, 0);
    // Percentages are clean one-decimal values.
    expect(html).not.toMatch(/\d\.\d{2,}%/);
  });

  it('places the x labels by day: "1" at the start, "+14" at the end, "+1" after the last day', () => {
    const html = forecastChart();
    expect(html).toContain('style="left:0%">1</span>');
    expect(html).toContain('style="left:100%">+14</span>');
    const total = smeForecast.history.length + smeForecast.projected.length;
    expect(html).toContain(`style="left:${Math.round((18 / (total - 1)) * 1000) / 10}%">+1</span>`);
  });

  it('spreads day labels that fall outside the series', () => {
    const html = renderToStaticMarkup(
      createElement(RLineChart, { history: [1, 2, 3, 4], projected: [5, 6], color: '#000', projColor: '#999', height: 60, yLabels: [], xLabels: ['1', '6', '+1', '+7'] }),
    );
    // "+7" would sit past the last point, so all four are spread evenly instead.
    expect(html).toContain('style="left:33.3%">6</span>');
    expect(html).toContain('style="left:100%">+7</span>');
  });

  it('spreads labels it cannot read, and draws no dots or reveal unless asked', () => {
    const html = renderToStaticMarkup(
      createElement(RLineChart, { history: [1, 3, 2], color: '#000', projColor: '#999', height: 60, yLabels: ['High', 'Low'], xLabels: ['a', 'b', 'c'], dots: false }),
    );
    expect(html).toContain('style="left:50%">b</span>');
    expect(html).not.toContain('rx-line__dot');
    expect(html).not.toContain('rx-line__projection');
    expect(html).not.toContain('data-reveal');
  });

  it('marks a reveal for the motion contract without ever using player attributes', () => {
    const html = renderToStaticMarkup(
      createElement(RLineChart, { history: [1, 2], color: '#000', projColor: '#999', height: 60, yLabels: [], xLabels: [], reveal: { startMs: 200, durationMs: 900 } }),
    );
    expect(html).toContain('data-reveal=""');
    expect(html).toContain('--rx-chart-rs:200ms;--rx-chart-rd:900ms');
    expect(html).not.toMatch(/\sdata-(active|paused|next)[\s=>]/);
  });

  it('renders the same markup every time', () => {
    expect(forecastChart()).toBe(forecastChart());
  });
});

describe('RBarPairs', () => {
  it('draws the dashboard weeks in fixed slots on a baseline, with labels', () => {
    const { pairs, labels } = smeDashboard.salesVsCosts;
    const html = renderToStaticMarkup(createElement(RBarPairs, { pairs, colors: ['#27AE60', '#FF5C55'], height: 80, labels }));
    expect(tagsIn(html).filter((tag) => !ALLOWED_TAGS.has(tag))).toEqual([]);
    expect((html.match(/class="rx-bars__bar"/g) ?? []).length).toBe(pairs.length * 2);
    expect(html).toContain(`style="width:${pairs.length * 42}px"`);
    for (const label of labels) expect(html).toContain(`>${label}</span>`);
    expect(html).toContain('--rx-bars-slot:42px');
    expect(html).toContain('--rx-bars-h:80px');
  });

  it('defaults to a 120 px plot and no labels', () => {
    const html = renderToStaticMarkup(createElement(RBarPairs, { pairs: [[1, 2]], colors: ['#27ae60', '#ff5c55'] }));
    expect(html).toContain('--rx-bars-h:120px');
    expect(html).toContain('style="height:120px"');
    expect(html).not.toContain('rx-bars__labels');
  });
});
