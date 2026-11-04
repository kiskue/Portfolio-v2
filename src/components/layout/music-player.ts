import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';
import {
  isMusicPlaying,
  MUSIC_FADE_IN_S,
  MUSIC_FADE_OUT_S,
  MUSIC_TONE_RAMP_S,
  musicTone,
  type MusicEvent,
  type MusicStatus,
} from '@/lib/music';

/* The lazy half of the music: the Web Audio graph, the fades and the day/night tone. */

export interface MusicPlayerOptions {
  readonly el: HTMLAudioElement;
  readonly ctx: AudioContext | null;
  /** The `play()` promise of the first press. */
  readonly playing: Promise<void>;
  readonly report: (event: MusicEvent) => void;
  readonly status: () => MusicStatus;
}

export interface MusicPlayer {
  start(): void;
  stop(): void;
}

const isDark = (): boolean => getDisplaySnapshot().resolved.dark;

/** Moves an AudioParam from where it is now to `target` over `seconds`. */
function ramp(param: AudioParam, target: number, seconds: number, ctx: AudioContext, exponential = false): void {
  const now = ctx.currentTime;
  const from = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);
  if (exponential) param.exponentialRampToValueAtTime(target, now + seconds);
  else param.linearRampToValueAtTime(target, now + seconds);
}

/** A filter cutoff the context accepts: above half the sample rate Chromium warns. */
const cutoffFor = (ctx: AudioContext, dark: boolean): number => Math.min(musicTone(dark).cutoffHz, ctx.sampleRate / 2);

export function createMusicPlayer({ el, ctx, playing, report, status }: MusicPlayerOptions): MusicPlayer {
  // Each start or stop makes the earlier one stale: its promise or timer then does nothing.
  let token = 0;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  let gain: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  if (ctx) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = Math.SQRT1_2;
    filter.frequency.value = cutoffFor(ctx, isDark());
    gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    el.muted = false;
    el.volume = 1;
  }

  /** Silent at once: the gain to 0 (without a context, the element muted), so the next start fades in. */
  function silence(): void {
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.value = 0;
    } else {
      el.muted = true;
    }
  }

  /** Playback ended on its own account (an error, or the browser's media controls paused it). */
  function fail(): void {
    token += 1;
    clearTimeout(stopTimer);
    // From silence, the next start (a press or an outside resume) fades in again.
    silence();
    report('failed');
  }
  el.addEventListener('error', fail);
  el.addEventListener('pause', () => {
    // A pause the player asked for happens while stopping; a late event after a new play() is stale.
    if (el.paused && isMusicPlaying(status())) fail();
  });
  el.addEventListener('play', () => {
    // An outside resume (lock screen, headset, media key) counts as a press: the button follows and the
    // song fades in from the current gain. Our own start() plays while the status is already `starting`.
    if (isMusicPlaying(status())) return;
    report('press');
    begin(Promise.resolve());
  });

  /** Once the element is playing: fade in (or set the volume without a context), then report it. */
  function begin(played: Promise<void>): void {
    const mine = ++token;
    clearTimeout(stopTimer);
    played.then(
      () => {
        if (mine !== token || status() !== 'starting') return;
        const dark = isDark();
        const tone = musicTone(dark);
        if (ctx && gain && filter) {
          filter.frequency.value = cutoffFor(ctx, dark);
          ramp(gain.gain, tone.gain, MUSIC_FADE_IN_S, ctx);
        } else {
          el.muted = false;
          el.volume = tone.gain;
        }
        report('started');
      },
      () => {
        if (mine === token) report('failed');
      },
    );
  }

  function start(): void {
    // Both calls run at once, inside the click: Safari wants play() and resume() in the gesture.
    ctx?.resume().catch(() => undefined);
    if (el.error) el.load();
    begin(el.play());
  }

  function stop(): void {
    const mine = ++token;
    clearTimeout(stopTimer);
    const finish = (): void => {
      if (mine !== token) return;
      el.pause();
      report('stopped');
    };
    if (ctx && gain) {
      ramp(gain.gain, 0, MUSIC_FADE_OUT_S, ctx);
      stopTimer = setTimeout(finish, MUSIC_FADE_OUT_S * 1000);
    } else {
      finish();
    }
  }

  let dark = isDark();
  subscribeDisplay(() => {
    const next = isDark();
    if (next === dark) return;
    dark = next;
    const tone = musicTone(next);
    if (!ctx || !gain || !filter) {
      if (status() === 'on') el.volume = tone.gain;
      return;
    }
    ramp(filter.frequency, cutoffFor(ctx, next), MUSIC_TONE_RAMP_S, ctx, true);
    if (status() === 'on') ramp(gain.gain, tone.gain, MUSIC_TONE_RAMP_S, ctx);
  });

  if (status() === 'stopping') stop();
  else if (status() === 'starting') begin(playing);
  else el.pause();

  return { start, stop };
}
