/**
 * A figure's states as the tuple pickState expects, taken from the screen's per-state table.
 * Type the table with `satisfies Record<FigureState<'3.x'>, …>` and list the default state
 * (figures.ts states[0]) first: a state added to figures.ts then fails the type check until the
 * screen draws it, and pickState can only return a state the table covers.
 */
export function stateTuple<K extends string>(views: Readonly<Record<K, unknown>>): readonly [K, ...K[]] {
  const [first, ...rest] = Object.keys(views) as K[];
  if (first === undefined) throw new Error('A replica figure has at least one state.');
  return [first, ...rest];
}
