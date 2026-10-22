import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FLOW_OWNER_LABEL, FLOW_OWNERS, FlowDiagram, FlowLegend, flowOwners } from '@/components/sections/case-study/flow-diagram';
import { numbersFootnote } from '@/components/sections/case-study/numbers-section';
import { caseStudies } from '@/content/case-studies';
import type { CaseStudyMetric } from '@/content/derived';
import type { FlowDiagram as FlowDiagramData } from '@/content/types';

/*
 * FlowDiagram (PLAN case-study template 7; design §6 "FlowDiagram"): a semantic <ol> that alternates
 * lanes and connectors, owner styles me / team / external / prototype with an always-visible key
 * and spoken owner names, mono protocol labels; and the dated footnote of the Numbers section.
 */

const FIXTURE: FlowDiagramData = {
  id: 'fixture-flow',
  title: 'Fixture pipeline',
  lanes: [
    {
      id: 'phone',
      title: 'Phone',
      owner: 'me',
      nodes: [
        { id: 'a', label: 'Local store', owner: 'me', detail: 'Keeps the books.' },
        { id: 'b', label: 'Old module', owner: 'me', faded: true },
      ],
      note: 'Works offline.',
    },
    { id: 'core', title: 'Core', owner: 'team', nodes: [{ id: 'c', label: 'Team service', owner: 'team', mono: 'HTTPS' }] },
    {
      id: 'outside',
      title: 'Outside',
      owner: 'external',
      nodes: [
        { id: 'd', label: 'Vendor', owner: 'external' },
        { id: 'e', label: 'Radio R&D', owner: 'prototype' },
      ],
    },
  ],
  connectors: [{ label: 'Signed in', mono: 'HTTPS · JWT' }, { label: 'On failure', dashed: true }],
  returnStrip: 'Back to the phone.',
  sideNote: 'A side note.',
};

const html = renderToStaticMarkup(createElement(FlowDiagram, { diagram: FIXTURE }));

/** A lane or connector <li> (whatever its attribute order or other classes). */
const PART = /<li [^>]*class="(?:[^"]* )?(cs-flow__lane|cs-flow__link)(?: [^"]*)?"/g;
const parts = (markup: string, kind: 'cs-flow__lane' | 'cs-flow__link'): number =>
  [...markup.matchAll(PART)].filter((match) => match[1] === kind).length;

/** The class lists of the diagram's node boxes (rounded-control <li>s) owned by `owner`. */
function nodeClasses(markup: string, owner: string): string[] {
  return [...markup.matchAll(/<li [^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(`data-owner="${owner}"`) && tag.includes('rounded-control'))
    .map((tag) => /class="([^"]*)"/.exec(tag)?.[1] ?? '');
}

describe('FlowDiagram markup', () => {
  it('is a figure named by its heading, holding one <ol> that alternates lanes and connectors', () => {
    expect(html).toMatch(/^<figure aria-labelledby="flow-fixture-flow"/);
    expect(html).toContain('<h3 id="flow-fixture-flow" class="text-h3-hero text-ink">Fixture pipeline</h3>');
    expect(html.match(/<ol /g)).toHaveLength(1);
    const ol = /<ol class="cs-flow" data-lanes="3"[^>]*>/.exec(html)?.[0] ?? '';
    expect(ol).not.toBe('');
    // Direct children in order: lane, link, lane, link, lane.
    const order = [...html.matchAll(PART)].map((match) => match[1]);
    expect(order).toEqual(['cs-flow__lane', 'cs-flow__link', 'cs-flow__lane', 'cs-flow__link', 'cs-flow__lane']);
    // The row layout's grid columns: one per lane, a connector column between each pair.
    expect(ol).toContain('--cs-flow-cols:minmax(0,1fr) var(--cs-flow-link) minmax(0,1fr) var(--cs-flow-link) minmax(0,1fr)');
  });

  it('styles each owner: me = accent bar, team = dashed, external = sunken, prototype = dotted', () => {
    const me = nodeClasses(html, 'me');
    expect(me).toHaveLength(2);
    for (const classes of me) expect(classes).toMatch(/(?:^| )border-s-\[3px\](?: |$).*border-s-accent|border-s-accent.*border-s-\[3px\]/);
    expect(nodeClasses(html, 'team')).toEqual([expect.stringMatching(/(?:^| )border-dashed(?: |$)/)]);
    expect(nodeClasses(html, 'external')).toEqual([expect.stringMatching(/(?:^| )bg-sunken(?: |$)/)]);
    expect(nodeClasses(html, 'prototype')).toEqual([expect.stringMatching(/(?:^| )border-dotted(?: |$)/)]);
    // Only "me" draws the accent bar.
    for (const owner of ['team', 'external', 'prototype']) expect(nodeClasses(html, owner).join(' ')).not.toContain('border-s-accent');
  });

  it('speaks each node’s owner, and mutes faded nodes without hiding them', () => {
    expect(html).toContain('Local store<span class="sr-only"> (my work)</span>');
    expect(html).toContain('Team service<span class="sr-only"> (team’s work)</span>');
    expect(html).toContain('Vendor<span class="sr-only"> (external service)</span>');
    expect(html).toContain('Radio R&amp;D<span class="sr-only"> (prototype)</span>');
    expect(html).toMatch(/data-faded=""[^>]*>[^<]*<span class="[^"]*text-ink-3[^"]*">Old module/);
  });

  it('labels connectors in words, protocols in mono, and dashes the dashed ones', () => {
    expect(html).toContain('<span class="sr-only">Then, </span><span class="text-meta text-ink-2">Signed in</span><code class="font-mono text-fig text-ink-3">HTTPS · JWT</code>');
    expect(html).toContain('<code class="font-mono text-fig text-ink-2">HTTPS</code>');
    expect(html.match(/<li class="cs-flow__link" data-dashed="">/g)).toHaveLength(1);
    expect(parts(html, 'cs-flow__link')).toBe(2);
    // Arrows are decoration: the order of the list carries the flow.
    expect(html.match(/<span aria-hidden="true" class="cs-flow__arrow">/g)).toHaveLength(2);
  });

  it('shows the lane note, the return strip and the side note', () => {
    expect(html).toContain('Works offline.');
    expect(html).toContain('Back to the phone.');
    expect(html).toContain('A side note.');
  });

  it('keys exactly the owners it uses, in key order, always visible', () => {
    expect(flowOwners(FIXTURE)).toEqual(['me', 'team', 'external', 'prototype']);
    const legend = /<ul aria-label="Key"[^>]*data-flow-legend=""[^>]*>.*?<\/ul>/.exec(html)?.[0] ?? '';
    expect([...legend.matchAll(/data-owner="([a-z]+)"/g)].map((match) => match[1])).toEqual([...FLOW_OWNERS]);
    for (const owner of FLOW_OWNERS) expect(legend).toContain(FLOW_OWNER_LABEL[owner]);
    expect(legend).not.toMatch(/\shidden(?:=|\s|>)/);
    const solo = renderToStaticMarkup(createElement(FlowLegend, { owners: ['me'] }));
    expect([...solo.matchAll(/data-owner="([a-z]+)"/g)].map((match) => match[1])).toEqual(['me']);
  });
});

describe('the site’s diagrams', () => {
  const diagrams = caseStudies.flatMap((study) => [
    ...study.architecture,
    ...study.specials.flatMap((special) => (special.kind === 'ai' ? [special.diagram] : [])),
  ]);

  it.each(diagrams.map((diagram): [string, FlowDiagramData] => [diagram.id, diagram]))('%s renders lanes + connectors in one list', (_id, diagram) => {
    const markup = renderToStaticMarkup(createElement(FlowDiagram, { diagram }));
    expect(parts(markup, 'cs-flow__lane')).toBe(diagram.lanes.length);
    expect(parts(markup, 'cs-flow__link')).toBe(diagram.connectors.length);
    expect(markup).not.toMatch(/\[\[|\]\]/);
  });
});

// ─── Numbers footnote ────────────────────────────────────────────────────────────────────

function metric(id: string, asOf: CaseStudyMetric['asOf'], store = false): CaseStudyMetric {
  return { id, value: '1', label: 'x', source: 'y', asOf, store };
}

describe('numbersFootnote', () => {
  it('dates counted figures and store figures separately', () => {
    expect(numbersFootnote([metric('a', '2026-10-19')])).toBe('Counted from source on Oct 19, 2026.');
    expect(numbersFootnote([metric('a', '2026-10-19'), metric('b', '2026-10-19', true)])).toBe(
      'Counted from source on Oct 19, 2026; store figures as of Oct 19, 2026.',
    );
    expect(numbersFootnote([metric('b', '2026-10-19', true)])).toBe('Store figures as of Oct 19, 2026.');
  });

  it('names every date when figures were counted on different days, oldest first', () => {
    expect(numbersFootnote([metric('a', '2027-01-05'), metric('b', '2026-10-19'), metric('c', '2027-01-05')])).toBe(
      'Counted from source on Oct 19, 2026 and Jan 5, 2027.',
    );
  });

  it('is nothing for no figures', () => {
    expect(numbersFootnote([])).toBeNull();
  });
});
