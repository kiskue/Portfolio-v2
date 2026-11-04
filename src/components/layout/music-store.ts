import { nextMusicStatus, type MusicEvent, type MusicStatus } from '@/lib/music';

/*
 * The music's state, outside React so the song survives client-side navigation (a hard visit
 * always starts silent). Always loaded and small: the Web Audio graph lives in music-player.ts,
 * a lazy chunk fetched on the first press. The AudioContext and the media element are created
 * here, inside the click, because that is the gesture the browser needs to let sound start;
 * nothing exists before it.
 */

interface Player {
  start(): void;
  stop(): void;
}

interface Session {
  readonly el: HTMLAudioElement;
  readonly ctx: AudioContext | null;
  readonly playing: Promise<void>;
  player: Player | null;
  loading: boolean;
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

/** Fetches the player chunk and hands over the element. A failed fetch pauses the song and reports `failed`. */
function loadPlayer(current: Session): void {
  current.loading = true;
  import('@/components/layout/music-player')
    .then(({ createMusicPlayer }) => {
      current.player = createMusicPlayer({ el: current.el, ctx: current.ctx, playing: current.playing, report, status: getMusicSnapshot });
    })
    .catch(() => {
      current.el.pause();
      report('failed');
    })
    .finally(() => {
      current.loading = false;
    });
}

/** Called synchronously from the button's click handler. */
export function toggleMusic(src: string): void {
  report('press');
  if (!session) {
    const el = new Audio();
    el.preload = 'none';
    el.loop = true;
    el.volume = 0;
    el.src = src;
    const ctx = createContext();
    const current: Session = { el, ctx, playing: el.play(), player: null, loading: false };
    session = current;
    current.playing.catch(() => {
      if (!current.player) report('failed');
    });
    loadPlayer(current);
    return;
  }
  if (session.player) {
    if (status === 'starting') session.player.start();
    else if (status === 'stopping') session.player.stop();
  } else if (!session.loading && status === 'starting') {
    loadPlayer(session);
  }
}
