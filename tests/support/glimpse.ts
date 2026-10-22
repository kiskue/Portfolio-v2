import type { Locator } from '@playwright/test';
import { apps } from '@/content/apps/apps';
import { figures } from '@/content/apps/figures';
import { glimpses } from '@/content/apps/glimpses';
import type { Glimpse, GlimpseStep } from '@/content/types';
import { caseStudyHref } from '@/lib/routes';

/*
 * Reading a glimpse player from the DOM, through its attribute contract
 * (src/components/showcase/glimpse.client.tsx):
 *   [data-glimpse-root]        the player, with data-status (playing | paused | suspended | ended)
 *                              and data-ready once hydrated;
 *   [data-glimpse-column=N]    a trio column, linking to its case study;
 *   [data-glimpse-track=N]     one app's phone, data-paused while paused or suspended;
 *   its child frames           data-step, data-kind (play | poster), data-shown on the one on
 *                              screen, data-active while its replica animates;
 *   [data-glimpse-dots=N]      step buttons ("Step 2 of 3: …");
 *   [data-glimpse-control]     the Pause / Play / Replay button.
 * Steps and posters come from src/content/apps/glimpses.ts (plain data, safe to import here).
 */

export type FrameKind = 'play' | 'poster';

export interface ShownFrame {
  readonly step: number;
  readonly kind: FrameKind;
}

/**
 * The frame that shows a step's posterState (PLAN: "Each step has a posterState for reduced
 * motion and no-JS"): a separate poster frame when the poster state differs from the played one.
 */
export function posterKind(step: GlimpseStep): FrameKind {
  const play = step.state ?? figures.find((figure) => figure.id === step.figure)?.states[0];
  return step.posterState !== undefined && step.posterState !== play ? 'poster' : 'play';
}

/** What a track shows before playback, without JavaScript and under reduced motion. */
export function posterFrame(glimpse: Glimpse): ShownFrame {
  const step = glimpse.steps[glimpse.posterStep];
  if (!step) throw new Error(`${glimpse.id} has no poster step ${glimpse.posterStep}`);
  return { step: glimpse.posterStep, kind: posterKind(step) };
}

/**
 * The glimpse behind each track of a player: a hero shows one glimpse (its root's label is the
 * glimpse label); a trio column links to its app's case study (Home's `home.<app>` glimpses).
 */
export async function playerGlimpses(root: Locator): Promise<Glimpse[]> {
  const label = await root.getAttribute('aria-label');
  const single = glimpses.find((glimpse) => glimpse.label === label);
  if (single) return [single];
  const columns = root.locator('[data-glimpse-column]');
  const count = await columns.count();
  const found: Glimpse[] = [];
  for (let track = 0; track < count; track += 1) {
    const href = await root.locator(`[data-glimpse-column="${track}"] a[href]`).first().getAttribute('href');
    const app = apps.find((entry) => caseStudyHref(entry.caseStudy) === href);
    const glimpse = app ? glimpses.find((entry) => entry.id === `home.${app.id}`) : undefined;
    if (!glimpse) throw new Error(`track ${track} links to ${href}, which matches no Home glimpse`);
    found.push(glimpse);
  }
  return found;
}

/** The frame a track has on screen, or null. */
export async function shownFrame(root: Locator, track: number): Promise<ShownFrame | null> {
  const frame = root.locator(`[data-glimpse-track="${track}"] > [data-shown]`);
  if ((await frame.count()) !== 1) return null;
  const [step, kind] = await Promise.all([frame.getAttribute('data-step'), frame.getAttribute('data-kind')]);
  return { step: Number(step), kind: kind === 'poster' ? 'poster' : 'play' };
}

export interface AnimationInfo {
  readonly name: string;
  readonly target: string;
  readonly playState: string;
}

/**
 * Keyframe animations under an element that are running right now (CSS transitions are state
 * feedback, not motion loops, and animation-play-state does not govern them, so they are left out).
 */
export async function runningAnimations(scope: Locator): Promise<AnimationInfo[]> {
  return scope.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === 'running' && !(animation instanceof CSSTransition))
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target;
        const name = animation instanceof CSSAnimation ? animation.animationName : animation.id || 'script animation';
        const classes = (target?.getAttribute('class') ?? '').trim().split(/\s+/).slice(0, 2).join('.');
        const where = target ? `${target.tagName.toLowerCase()}${classes ? `.${classes}` : ''}${effect?.pseudoElement ?? ''}` : '?';
        return { name, target: where, playState: animation.playState };
      }),
  );
}
