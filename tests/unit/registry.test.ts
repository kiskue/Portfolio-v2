import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { citizenReplicas } from '@/components/replicas/citizen';
import { PendingReplica, RCanvas } from '@/components/replicas/kit';
import { pendingFigureIds, replicas } from '@/components/replicas/registry';
import { responderReplicas } from '@/components/replicas/responder';
import { smeReplicas } from '@/components/replicas/sme';
import { figures } from '@/content/apps/figures';
import type { AppId, FigureId } from '@/content/types';

/** Elements a replica may render: div, span and inline SVG (no controls, links, images or headings). */
const ALLOWED_TAGS = new Set([
  'div',
  'span',
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
]);

function tagsIn(html: string): readonly string[] {
  return [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => (match[1] ?? '').toLowerCase());
}

const APP_INDEXES: Readonly<Record<AppId, Readonly<Record<string, unknown>>>> = {
  sme: smeReplicas,
  citizen: citizenReplicas,
  responder: responderReplicas,
};

const figureIds: readonly FigureId[] = figures.map((figure) => figure.id);

describe('replica registry', () => {
  it('has exactly one replica per figure in figures.ts', () => {
    expect(Object.keys(replicas).sort()).toEqual([...figureIds].sort());
  });

  it("keeps each app's figures in that app's index", () => {
    for (const app of ['sme', 'citizen', 'responder'] as const) {
      const expected = figures.filter((figure) => figure.app === app).map((figure) => figure.id);
      expect(Object.keys(APP_INDEXES[app]).sort()).toEqual([...expected].sort());
    }
  });

  it('maps every figure to a component', () => {
    for (const id of figureIds) expect(typeof replicas[id]).toBe('function');
  });

  it('reports the pending replicas in figures.ts order (wave 2a replaces them; zero is not required yet)', () => {
    const pending = pendingFigureIds();
    console.info(`[registry] ${pending.length} of ${figureIds.length} replicas pending${pending.length ? `: ${pending.join(', ')}` : ''}`);
    expect(pending).toEqual(figureIds.filter((id) => pending.includes(id)));
    for (const id of figureIds) {
      if (pending.includes(id)) expect(replicas[id]).toBe(PendingReplica);
      else expect(replicas[id]).not.toBe(PendingReplica);
    }
  });

  it('renders every figure in every state as inert-safe markup', () => {
    for (const figure of figures) {
      for (const state of figure.states) {
        const html = renderToStaticMarkup(
          createElement(RCanvas, { app: figure.app, theme: figure.theme }, createElement(replicas[figure.id], { state })),
        );
        const where = `figure ${figure.id} state "${state}"`;
        expect(tagsIn(html).filter((tag) => !ALLOWED_TAGS.has(tag)), where).toEqual([]);
        // The motion contract's attributes belong to the glimpse player, never to replica markup.
        expect(html, where).not.toMatch(/\sdata-(active|paused|next)[\s=>]/);
        // Brand variables are set on wrappers (BrandVars / BrandScope), never inside a replica.
        expect(html, where).not.toMatch(/--app-[\w-]+\s*:/);
      }
    }
  });
});
