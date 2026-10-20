import type { Route } from 'next';
import { figures } from '@/content/apps/figures';
import type { Figure, FigureId } from '@/content/types';

/** /dev/figure/<id>. Typed routes see the dynamic segment, not the 21 ids, hence the cast. */
export function figureHref(id: FigureId): Route {
  return `/dev/figure/${id}` as Route;
}

export function findFigure(id: string): Figure | undefined {
  return figures.find((figure) => figure.id === id);
}

/** The previous and next figure in figures.ts order, wrapping around (3.6 → 1.1). */
export function adjacentFigures(id: FigureId): { readonly previous: Figure; readonly next: Figure } {
  const index = figures.findIndex((figure) => figure.id === id);
  const count = figures.length;
  const previous = figures[(index - 1 + count) % count];
  const next = figures[(index + 1) % count];
  if (index === -1 || !previous || !next) throw new Error(`Unknown figure: ${id}`);
  return { previous, next };
}
