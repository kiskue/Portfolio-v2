import { expect, type Page } from '@playwright/test';

/*
 * One theme or motion switch, frame by frame (PLAN → Motion: no theme crossfade; and one
 * full-document restyle per switch). `watchSwitch` arms a recorder on a loaded page
 * that is at rest; the next switch, from any trigger, is then recorded:
 * - every attribute write on <html>, with the MutationObserver batch it arrived in. A switch's own
 *   writes arrive in batch 0, in the switch's task; anything later (a guard attribute taken off a
 *   task after) is another batch, and a full-document restyle of its own;
 * - the frames after the switch, each sampled after style and layout and before paint (a
 *   ResizeObserver on a 1px box that a requestAnimationFrame loop resizes every frame): the page's
 *   CSS transitions, and the computed colours and transition-property of the probe elements.
 * `switchRecord` waits for the frames, then reads the probes again once every transition would
 * have ended (the longest, --dur-3, is 320ms): the look the switch must show at once.
 * `expectQuietSwitch` is a switch with one full restyle; `expectGuardedSwitch` is a theme change
 * under reduced motion, which keeps the guard (src/lib/display-store.ts, browserDisplayHost).
 */

/** How many frames after the switch are sampled. */
export const SWITCH_FRAMES = 10;

export interface ProbeStyle {
  readonly color: string;
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly transitionProperty: string;
}

export interface SwitchFrame {
  /** Milliseconds after the switch's writes arrived. */
  readonly at: number;
  /** Every CSS transition on the page, running or pending: "<element> <property> <playState>". */
  readonly transitions: readonly string[];
  /** The probes' computed style, in the order given (null: no such element). */
  readonly probes: readonly (ProbeStyle | null)[];
}

export interface SwitchRecord {
  /** The probes when the recorder was armed, before the switch. */
  readonly before: readonly (ProbeStyle | null)[];
  /** The attributes written on <html>, in order, with their batch (0 = the switch's own task). */
  readonly writes: readonly { readonly name: string | null; readonly batch: number }[];
  readonly frames: readonly SwitchFrame[];
  /** The probes once every transition would have ended. */
  readonly settled: readonly (ProbeStyle | null)[];
}

interface SwitchWatch {
  readonly record: { before: (ProbeStyle | null)[]; writes: { name: string | null; batch: number }[]; frames: SwitchFrame[] };
  readonly read: () => (ProbeStyle | null)[];
  readonly stop: () => void;
}

declare global {
  interface Window {
    __switchWatch?: SwitchWatch;
  }
}

/**
 * Arms the recorder for the next switch. `probes` are CSS selectors of elements whose look the
 * switch changes (the first match each). It waits until no CSS transition runs, so the switch
 * starts from rest (an open sheet or popover has finished its entry).
 */
export async function watchSwitch(page: Page, probes: readonly string[]): Promise<void> {
  await page.waitForFunction(() => !document.getAnimations().some((animation) => animation instanceof CSSTransition));
  await page.evaluate(
    ({ selectors, frames }) => {
      const describe = (node: unknown): string => {
        if (!(node instanceof Element)) return String(node);
        const classes = [...node.classList].slice(0, 3).map((name) => `.${name}`);
        return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${classes.join('')}`;
      };
      const read = (): (ProbeStyle | null)[] =>
        selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const style = getComputedStyle(element);
          return { color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, transitionProperty: style.transitionProperty };
        });
      const record: SwitchWatch['record'] = { before: read(), writes: [], frames: [] };
      let batch = 0;
      let switchedAt: number | null = null;
      const writes = new MutationObserver((mutations) => {
        switchedAt ??= performance.now();
        for (const mutation of mutations) record.writes.push({ name: mutation.attributeName, batch });
        batch += 1;
      });
      writes.observe(document.documentElement, { attributes: true });

      const box = document.createElement('div');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position: fixed; top: 0; left: 0; width: 1px; height: 1px; visibility: hidden; pointer-events: none;';
      document.body.append(box);
      const sampler = new ResizeObserver(() => {
        if (switchedAt === null || record.frames.length >= frames) return;
        const transitions = document
          .getAnimations()
          .filter((animation): animation is CSSTransition => animation instanceof CSSTransition)
          .map((animation) => {
            const effect = animation.effect instanceof KeyframeEffect ? animation.effect : null;
            return `${describe(effect?.target)}${effect?.pseudoElement ?? ''} ${animation.transitionProperty} ${animation.playState}`;
          });
        record.frames.push({ at: Math.round(performance.now() - switchedAt), transitions, probes: read() });
      });
      sampler.observe(box);
      let frame = 0;
      const resize = (): void => {
        box.style.width = box.style.width === '1px' ? '2px' : '1px';
        frame = requestAnimationFrame(resize);
      };
      frame = requestAnimationFrame(resize);

      window.__switchWatch = {
        record,
        read,
        stop: () => {
          writes.disconnect();
          sampler.disconnect();
          cancelAnimationFrame(frame);
          box.remove();
        },
      };
    },
    { selectors: [...probes], frames: SWITCH_FRAMES },
  );
}

/** Waits for the frames after the switch, then for every transition to have ended, and stops the recorder. */
export async function switchRecord(page: Page): Promise<SwitchRecord> {
  await page.waitForFunction((frames) => (window.__switchWatch?.record.frames.length ?? 0) >= frames, SWITCH_FRAMES, { timeout: 10_000 });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const watch = window.__switchWatch;
    if (!watch) throw new Error('watchSwitch was not armed');
    watch.stop();
    window.__switchWatch = undefined;
    return { ...watch.record, settled: watch.read() };
  });
}

const GUARD = 'data-display-switching';

const colours = (probes: readonly (ProbeStyle | null)[]) =>
  probes.map((probe) => (probe ? { color: probe.color, backgroundColor: probe.backgroundColor, borderColor: probe.borderColor } : null));

/**
 * PLAN → Motion, for every switch: no CSS transition still running or pending in any frame after
 * it, and the settled colours already in the first frame painted after it and in every frame after
 * that. `changed` names the probes whose look the switch changes, so the check cannot pass on a
 * switch that did nothing.
 */
function expectInstantColours(record: SwitchRecord, changed: readonly number[]): void {
  expect(record.writes.length, 'the switch wrote <html>').toBeGreaterThan(0);
  for (const index of changed) {
    expect(record.settled[index], `probe ${index} exists`).not.toBeNull();
    expect(record.settled[index], `probe ${index} looks different after the switch`).not.toEqual(record.before[index]);
  }
  expect(record.frames).toHaveLength(SWITCH_FRAMES);
  expect(record.frames.flatMap((frame) => frame.transitions.map((transition) => `+${frame.at}ms ${transition}`)), 'no CSS transition runs after the switch').toEqual([]);
  record.frames.forEach((frame, index) => {
    expect(colours(frame.probes), `frame ${index + 1} after the switch (+${frame.at}ms) already shows the settled colours`).toEqual(colours(record.settled));
  });
}

/**
 * One full restyle (the store finishes the switch's transitions): on top of the instant colours,
 * <html> is written in the switch's own task only and never carries the transition guard, so
 * nothing restyles the whole document a task later, and no frame after the switch has its
 * transitions turned off (transition-property is already the settled one).
 */
export function expectQuietSwitch(record: SwitchRecord, changed: readonly number[]): void {
  expect(record.writes.filter((write) => write.name === GUARD), 'no transition guard is set on <html>').toEqual([]);
  expect(record.writes.filter((write) => write.batch > 0), "<html> is written only in the switch's own task").toEqual([]);
  expectInstantColours(record, changed);
  record.frames.forEach((frame, index) => {
    expect(frame.probes, `frame ${index + 1} after the switch (+${frame.at}ms) already shows the settled look`).toEqual(record.settled);
  });
}

/**
 * A theme change under reduced motion, where every element transitions its colour (motion.css):
 * the store suspends transitions with the guard instead, taken off a task later (a second full
 * restyle, as every switch had before the store finished transitions). The colours still change at once.
 */
export function expectGuardedSwitch(record: SwitchRecord, changed: readonly number[]): void {
  const guard = record.writes.filter((write) => write.name === GUARD).map((write) => write.batch > 0);
  expect(guard, "the guard is set in the switch's task and taken off in a later one").toEqual([false, true]);
  expectInstantColours(record, changed);
}
