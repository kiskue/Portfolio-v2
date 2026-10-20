import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandGlyph } from '@/components/ui/brand-glyph';
import { Icon } from '@/components/ui/icon';
import { ICONS } from '@/components/ui/icon-registry';
import { IconTile } from '@/components/ui/icon-tile';
import { listIndex } from '@/components/ui/numbered-list';
import { STATUS_LABEL, STATUS_ORDER, STATUS_SHAPE } from '@/components/ui/status';
import { StatusDot, StatusLegend } from '@/components/ui/status-dot';
import { ICON_NAMES, SIMPLE_ICON_KEYS, STATUSES } from '@/content/types';

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe('Icon registry', () => {
  it('maps every IconName and nothing else', () => {
    expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
  });

  it.each(ICON_NAMES)('%s renders an svg', (name) => {
    expect(html(createElement(Icon, { name }))).toMatch(/^<svg[^>]*aria-hidden="true"/);
  });

  it('is decorative by default and role="img" with a label', () => {
    const labelled = html(createElement(Icon, { name: 'star', label: 'Rating' }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Rating"');
    expect(labelled).not.toContain('aria-hidden');
  });
});

describe('IconTile', () => {
  it('solid tiles are the accent fill with the white on-accent glyph; always decorative', () => {
    const markup = html(createElement(IconTile, { icon: 'folder-open' }));
    expect(markup).toMatch(/^<span aria-hidden="true" class="[^"]*bg-accent text-on-accent/);
    expect(html(createElement(IconTile, { icon: 'layers', tone: 'soft', size: 24 }))).toContain('bg-accent-soft text-soft-ink');
  });
});

describe('BrandGlyph', () => {
  it.each(SIMPLE_ICON_KEYS)('%s renders a simple-icons path', (icon) => {
    expect(html(createElement(BrandGlyph, { glyph: { kind: 'si', icon } }))).toMatch(/<path d="[Mm][^"]+"/);
  });

  it('draws the LinkedIn mark inline and monograms as text tiles', () => {
    expect(html(createElement(BrandGlyph, { glyph: { kind: 'official', icon: 'linkedin' }, label: 'LinkedIn' }))).toMatch(
      /^<svg role="img" aria-label="LinkedIn"/,
    );
    const monogram = html(createElement(BrandGlyph, { glyph: { kind: 'monogram', text: 'Z' } }));
    expect(monogram).toMatch(/^<span aria-hidden="true"[^>]*>Z<\/span>$/);
  });
});

describe('Status shapes', () => {
  it('labels and shapes cover every status, each shape distinct (never colour alone)', () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...STATUSES].sort());
    expect(new Set(Object.values(STATUS_SHAPE)).size).toBe(STATUSES.length);
    expect(STATUS_ORDER).toEqual(STATUSES);
  });

  it('renders a different drawing per status', () => {
    const drawings = STATUSES.map((status) => html(createElement(StatusDot, { status })).replace(/class="[^"]*"/, ''));
    expect(new Set(drawings).size).toBe(STATUSES.length);
    for (const markup of drawings) expect(markup).toContain('aria-hidden="true"');
  });

  it('the legend spells every status out as text', () => {
    const markup = html(createElement(StatusLegend));
    for (const label of Object.values(STATUS_LABEL)) expect(markup).toContain(label);
  });
});

describe('NumberedList index', () => {
  it('comes from the order: 01, 02 … 10', () => {
    expect([0, 1, 9].map(listIndex)).toEqual(['01', '02', '10']);
  });
});
