import type { ReactNode } from 'react';
import { ScreenView, type ScreenViewProps } from '@/components/showcase/screen-view';
import { Copy } from '@/components/ui/copy';
import { getFigure } from '@/content/derived';
import { site } from '@/content/site';
import type { FigureId } from '@/content/types';
import { cn } from '@/lib/cn';
import { fieldOrNull } from '@/lib/placeholder';

export interface ScreenCaptionProps {
  readonly figure: FigureId;
}

/**
 * The visible FIG line for a figure: "FIG 2.3" in mono, then its caption from figures.ts,
 * placeholder-aware through <Copy> (reuse rule 8: a "[[…]]" caption is the shared ph mark in
 * label mode and is left out in hide mode).
 * Use it inside your own <figcaption> when composing a figure by hand (e.g. a phone in a link).
 * The label box has a fixed width, so the late Geist Mono swap never moves the caption text.
 */
export function ScreenCaption({ figure }: ScreenCaptionProps): ReactNode {
  const { id, caption } = getFigure(figure);
  const text = fieldOrNull(caption, site.placeholders);
  return (
    <>
      <span className="inline-block w-14 font-mono text-fig text-ink-2 uppercase">FIG {id}</span>
      {text === null ? null : (
        <>
          {' '}
          <Copy text={text} />
        </>
      )}
    </>
  );
}

export interface ScreenFigureProps extends ScreenViewProps {
  /**
   * Replaces the default caption (the FIG line for replicas, nothing for images). A string is a
   * content field, rendered through <Copy>; any other node is rendered as given.
   */
  readonly caption?: ReactNode;
  /** Classes for the <figure> (ScreenViewProps.className would style the phone). */
  readonly figureClassName?: string;
}

/** The caption node, or null when there is nothing to show (a string field hidden in hide mode). */
function captionContent(caption: ReactNode, view: ScreenViewProps): ReactNode {
  if (caption === undefined) return view.source.kind === 'replica' ? <ScreenCaption figure={view.source.figure} /> : null;
  if (typeof caption === 'string') return fieldOrNull(caption, site.placeholders) === null ? null : <Copy text={caption} />;
  return caption === false ? null : caption;
}

/**
 * A screen as a <figure>: the phone (role="img" with the figure summary or image alt, inert
 * canvas) and a visible <figcaption> with the FIG line. Wall tiles, screens grid, flanks.
 */
export function ScreenFigure({ caption, figureClassName, ...view }: ScreenFigureProps): ReactNode {
  const content = captionContent(caption, view);
  return (
    <figure className={cn('flex w-min flex-col gap-3', figureClassName)} data-screen-figure="">
      <ScreenView {...view} />
      {content === null ? null : <figcaption className="text-meta text-ink-3">{content}</figcaption>}
    </figure>
  );
}
