import { figures, type FigureState } from '@/content/apps/figures';
import type { CitizenFigureId } from '@/content/types';

/**
 * A Citizen figure's states, read from figures.ts (the single source), as the non-empty tuple
 * the kit's pickState narrows against. A screen therefore draws exactly its figure's states,
 * and a renamed state fails the type check where the screen switches on it.
 */
export function figureStates<Id extends CitizenFigureId>(id: Id): readonly [FigureState<Id>, ...FigureState<Id>[]] {
  const figure = figures.find((entry) => entry.id === id);
  if (!figure) throw new Error(`figures.ts has no figure ${id}`);
  return figure.states as unknown as readonly [FigureState<Id>, ...FigureState<Id>[]];
}
