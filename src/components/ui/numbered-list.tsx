import type { ReactNode } from 'react';
import type { IconName, SiteRoute } from '@/content/types';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { SiteLink } from '@/components/ui/site-link';
import { cn } from '@/lib/cn';

export interface NumberedListItem {
  /** Also the element id on `blocks` items, so "#mobile-apps" anchors land on the block. */
  readonly id: string;
  readonly label: string;
  readonly href?: SiteRoute;
  readonly icon?: IconName;
  /** Block content (blocks look only). */
  readonly body?: ReactNode;
}

export interface NumberedListProps {
  readonly items: readonly NumberedListItem[];
  /** rows: 40px rows with hairlines (Services bento card); blocks: big-index blocks (/services). */
  readonly look: 'rows' | 'blocks';
  /** The block title element (blocks look). Default h3. */
  readonly headingLevel?: 'h2' | 'h3';
  readonly className?: string;
}

/** "01", "02", … from the item's position: the order of the data is the numbering. */
export function listIndex(position: number): string {
  return String(position + 1).padStart(2, '0');
}

function RowContent({ item, position }: { readonly item: NumberedListItem; readonly position: number }) {
  return (
    <>
      {item.icon ? <IconTile icon={item.icon} tone="soft" size={24} /> : null}
      <span className="min-w-0 flex-1 text-body-sm font-semibold text-ink">{item.label}</span>
      {item.href ? (
        <Icon
          name="arrow-right"
          size={14}
          className="text-ink-4 opacity-0 transition-opacity duration-(--dur-1) group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
        />
      ) : null}
      <span aria-hidden="true" className="font-mono text-fig text-ink-4 tabular-nums">
        {listIndex(position)}
      </span>
    </>
  );
}

/**
 * An ordered list whose visible index ("01"…) mirrors the list order. The <ol> carries the
 * numbering for screen readers, so the printed index is aria-hidden.
 */
export function NumberedList({ items, look, headingLevel: Heading = 'h3', className }: NumberedListProps) {
  if (look === 'rows') {
    return (
      <ol className={cn('divide-y divide-line', className)}>
        {items.map((item, position) => (
          <li key={item.id}>
            {item.href ? (
              <SiteLink
                href={item.href}
                className="group/row -mx-2 flex min-h-10 items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-(--dur-1) hover:bg-sunken"
              >
                <RowContent item={item} position={position} />
              </SiteLink>
            ) : (
              <div className="flex min-h-10 items-center gap-3 py-1.5">
                <RowContent item={item} position={position} />
              </div>
            )}
          </li>
        ))}
      </ol>
    );
  }

  // Blocks respond to their container (2 columns from 48rem), not to the viewport. A size
  // container has no intrinsic width, so w-full keeps it from collapsing inside a flex row.
  return (
    <div className={cn('@container w-full', className)}>
      <ol className="grid gap-x-10 gap-y-10 @3xl:grid-cols-2">
        {items.map((item, position) => (
          <li key={item.id} id={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-line pt-6">
            <span
              aria-hidden="true"
              className="font-mono text-[2.5rem] leading-none font-medium tracking-tight text-ink-4 tabular-nums @md:text-[4rem]"
            >
              {listIndex(position)}
            </span>
            <div className="min-w-0">
              <Heading className="text-h3-hero text-ink">
                {item.href ? (
                  <SiteLink href={item.href} className="underline-offset-4 hover:text-accent-ink hover:underline">
                    {item.label}
                  </SiteLink>
                ) : (
                  item.label
                )}
              </Heading>
              {item.body ? <div className="mt-3 text-body text-ink-2">{item.body}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
