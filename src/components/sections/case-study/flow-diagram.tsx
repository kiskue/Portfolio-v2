import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import type { FlowConnector, FlowDiagram as FlowDiagramData, FlowLane, FlowNode, FlowOwner } from '@/content/types';
import { cn } from '@/lib/cn';

/*
 * FlowDiagram (PLAN case-study template 7; design §6 "FlowDiagram"): one component for every
 * architecture and pipeline diagram. The markup is a semantic <ol> that alternates lanes and
 * connectors, so a screen reader hears the flow in order. Stacked (lanes in a column, connector
 * labels beside down arrows) on narrow containers; lanes in a row with connector columns once the
 * diagram has room for its lane count (case-study.css). Who built each part is a border style
 * (me: an accent bar at the inline start; team: dashed; external: a sunken fill; prototype: dotted),
 * explained by an always-visible key and spoken as text. Labels hold no hosts, ports, paths or ids
 * (tests/unit/case-studies.test.ts).
 */

/** Key order. */
export const FLOW_OWNERS = ['me', 'team', 'external', 'prototype'] as const satisfies readonly FlowOwner[];

/** The key's words, also read after each node by screen readers. */
export const FLOW_OWNER_LABEL = {
  me: 'My work',
  team: 'Team’s work',
  external: 'External service',
  prototype: 'Prototype',
} as const satisfies Record<FlowOwner, string>;

/** Border styles per owner, on top of the node's Card surface. */
const OWNER_CLASS: Record<FlowOwner, string> = {
  me: 'border-s-[3px] border-s-accent',
  team: 'border-dashed border-line-strong',
  external: '',
  prototype: 'border-2 border-dotted border-line-strong',
};

/** External parts sit on a sunken fill; everything else on the raised surface. */
const OWNER_SURFACE = { me: 'raised', team: 'raised', external: 'sunken', prototype: 'raised' } as const satisfies Record<
  FlowOwner,
  'raised' | 'sunken'
>;

/** The owners a diagram uses, in key order. */
export function flowOwners(diagram: FlowDiagramData): readonly FlowOwner[] {
  const used = new Set<FlowOwner>(diagram.lanes.flatMap((lane) => [lane.owner, ...lane.nodes.map((node) => node.owner)]));
  return FLOW_OWNERS.filter((owner) => used.has(owner));
}

/** The connector columns between lanes, for the row layout: "minmax(0,1fr) var(--cs-flow-link) …". */
function laneColumns(count: number): string {
  return Array.from({ length: count }, () => 'minmax(0,1fr)').join(' var(--cs-flow-link) ');
}

function OwnerSwatch({ owner }: { readonly owner: FlowOwner }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-4 w-6 shrink-0 rounded-[5px] border border-line', OWNER_SURFACE[owner] === 'sunken' ? 'bg-sunken' : 'bg-raised', OWNER_CLASS[owner])}
    />
  );
}

/** The always-visible key for the owner styles a diagram uses. */
export function FlowLegend({ owners, className }: { readonly owners: readonly FlowOwner[]; readonly className?: string }): ReactNode {
  return (
    <ul aria-label="Key" className={cn('flex flex-wrap gap-x-4 gap-y-2 text-meta text-ink-3', className)} data-flow-legend="">
      {owners.map((owner) => (
        <li key={owner} className="inline-flex items-center gap-2" data-owner={owner}>
          <OwnerSwatch owner={owner} />
          {FLOW_OWNER_LABEL[owner]}
        </li>
      ))}
    </ul>
  );
}

function Node({ node }: { readonly node: FlowNode }): ReactNode {
  return (
    <Card
      as="li"
      surface={OWNER_SURFACE[node.owner]}
      radius="control"
      pad="sm"
      className={cn('flex flex-col gap-1', OWNER_CLASS[node.owner], node.faded && 'bg-transparent shadow-none')}
      data-owner={node.owner}
      data-faded={node.faded ? '' : undefined}
    >
      <span className={cn('text-body-sm leading-snug font-semibold', node.faded ? 'text-ink-3' : 'text-ink')}>
        {node.label}
        <span className="sr-only"> ({FLOW_OWNER_LABEL[node.owner].toLowerCase()})</span>
      </span>
      {node.mono ? <code className="font-mono text-fig text-ink-2">{node.mono}</code> : null}
      <Copy as="span" text={node.detail} className="text-meta text-ink-3" />
    </Card>
  );
}

function Lane({ lane }: { readonly lane: FlowLane }): ReactNode {
  return (
    <Card as="li" surface="surface" radius="card" pad="sm" className="cs-flow__lane flex min-w-0 flex-col gap-3" data-owner={lane.owner}>
      <p className="text-meta font-semibold text-ink-2">{lane.title}</p>
      <ul className="flex flex-col gap-2">
        {lane.nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </ul>
      <Copy as="p" text={lane.note} className="mt-auto rounded-control bg-accent-soft px-2.5 py-1.5 text-meta text-soft-ink" />
    </Card>
  );
}

function Link({ connector }: { readonly connector: FlowConnector }): ReactNode {
  return (
    <li className="cs-flow__link" data-dashed={connector.dashed ? '' : undefined}>
      <span aria-hidden="true" className="cs-flow__arrow">
        <span className="cs-flow__line" />
        <Icon name="chevron-right" size={16} className="cs-flow__head" />
      </span>
      <span className="cs-flow__text flex flex-col gap-0.5">
        <span className="sr-only">Then, </span>
        <span className="text-meta text-ink-2">{connector.label}</span>
        {connector.mono ? <code className="font-mono text-fig text-ink-3">{connector.mono}</code> : null}
      </span>
    </li>
  );
}

export interface FlowDiagramProps {
  readonly diagram: FlowDiagramData;
  /** The diagram title's level: h3 under a section's h2. */
  readonly headingLevel?: 'h3' | 'h4';
  readonly className?: string;
}

export function FlowDiagram({ diagram, headingLevel: Heading = 'h3', className }: FlowDiagramProps): ReactNode {
  const titleId = `flow-${diagram.id}`;
  const lanes = diagram.lanes.length;
  const columns: CSSProperties & Record<'--cs-flow-cols', string> = { '--cs-flow-cols': laneColumns(lanes) };
  return (
    <figure aria-labelledby={titleId} className={cn('@container/flow flex min-w-0 flex-col gap-4', className)} data-flow={diagram.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <Heading id={titleId} className="text-h3-hero text-ink">
          {diagram.title}
        </Heading>
        <FlowLegend owners={flowOwners(diagram)} />
      </div>
      <ol className="cs-flow" data-lanes={lanes} style={columns}>
        {diagram.lanes.map((lane, index) => {
          const connector = diagram.connectors[index];
          return (
            <Fragment key={lane.id}>
              <Lane lane={lane} />
              {connector && index < lanes - 1 ? <Link connector={connector} /> : null}
            </Fragment>
          );
        })}
      </ol>
      {diagram.returnStrip ? (
        <Card surface="sunken" radius="control" pad="sm" className="flex gap-2 text-meta text-ink-2">
          <Icon name="rotate-ccw" size={16} className="mt-0.5 text-ink-3" />
          <Copy text={diagram.returnStrip} />
        </Card>
      ) : null}
      {diagram.sideNote ? (
        <p className="flex max-w-[75ch] gap-2 text-meta text-ink-3">
          <Icon name="info" size={16} className="mt-0.5 text-ink-4" />
          <Copy text={diagram.sideNote} />
        </p>
      ) : null}
    </figure>
  );
}
