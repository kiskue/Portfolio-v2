import type { MusicPlayer } from '@/components/layout/music-player';
import { nextMusicStatus, type MusicEvent, type MusicStatus } from '@/lib/music';

/*
 * The music's state, outside React so the song survives client-side navigation (a hard visit
 * always starts silent). Always loaded and small: the Web Audio graph lives in music-player.ts,
 * a lazy chunk fetched on the first press. The AudioContext and the media element are created
 * here, inside the click, because that is the gesture the browser needs to let sound start;
 * nothing exists before it.
 *
 * A failure before the player exists (the chunk does not load, or play() is refused) ends the
 * session: the element is paused, the context closed and everything dropped, so the next press
 * starts a fresh one inside its own gesture. After the player exists, failures are its job. A
 * player that throws while it is created is a bug: the session ends the same way, and the error is
 * reported (reportError), never swallowed.
 */

interface Session {
  readonly el: HTMLAudioElement;
  readonly ctx: AudioContext | null;
  player: MusicPlayer | null;
}

let status: MusicStatus = 'off';
let session: Session | null = null;
const listeners = new Set<() => void>();

export function subscribeMusic(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMusicSnapshot(): MusicStatus {
  return status;
}

export function getServerMusicSnapshot(): MusicStatus {
  return 'off';
}

function report(event: MusicEvent): void {
  const next = nextMusicStatus(status, event);
  if (next === status) return;
  status = next;
  for (const listener of [...listeners]) listener();
}

/** The Web Audio context, or null where it is missing or refuses to start. */
function createContext(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

/** Ends a session that never got a player: silence, release, forget, and report `failed`. */
function abandon(current: Session): void {
  if (session !== current) return;
  session = null;
  current.el.pause();
  current.ctx?.close().catch(() => undefined);
  report('failed');
}

/** The first press: creates the element and context in the gesture, plays, and fetches the player. */
function startSession(src: string): void {
  const el = new Audio();
  el.preload = 'none';
  el.loop = true;
  // iOS ignores volume, so the element stays muted until the player has wired it (or set a volume).
  el.muted = true;
  el.volume = 0;
  el.src = src;
  const ctx = createContext();
  const current: Session = { el, ctx, player: null };
  session = current;
  const playing = el.play();
  playing.catch(() => {
    if (!current.player) abandon(current);
  });
  import('@/components/layout/music-player').then(
    ({ createMusicPlayer }) => {
      if (session !== current) return;
      try {
        current.player = createMusicPlayer({ el, ctx, playing, report, status: getMusicSnapshot });
      } catch (error) {
        // A bug, not a failed load: the session ends the same way, and the error surfaces.
        abandon(current);
        reportError(error);
      }
    },
    () => abandon(current),
  );
}

/** Called synchronously from the button's click handler. */
export function toggleMusic(src: string): void {
  report('press');
  if (!session) {
    startSession(src);
    return;
  }
  // Before the player exists a press only moves the status; the player catches up on creation.
  if (session.player) {
    if (status === 'starting') session.player.start();
    else if (status === 'stopping') session.player.stop();
  }
}
