import { getDisplaySnapshot, subscribeDisplay } from '@/lib/display-store';
import {
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
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  if (exponential) param.exponentialRampToValueAtTime(target, now + seconds);
  else param.linearRampToValueAtTime(target, now + seconds);
}

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
    filter.frequency.value = musicTone(isDark()).cutoffHz;
    gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    el.volume = 1;
  }

  /** Once the element is playing: fade in (or set the volume without a context), then report it. */
  function begin(played: Promise<void>): void {
    const mine = ++token;
    clearTimeout(stopTimer);
    played.then(
      () => {
        if (mine !== token || status() !== 'starting') return;
        const tone = musicTone(isDark());
        if (ctx && gain && filter) {
          ctx.resume().catch(() => undefined);
          filter.frequency.value = tone.cutoffHz;
          ramp(gain.gain, tone.gain, MUSIC_FADE_IN_S, ctx);
        } else {
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
    if (el.error) el.load();
    // play() runs at once, inside the click, because Safari wants it in the gesture.
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
    ramp(filter.frequency, tone.cutoffHz, MUSIC_TONE_RAMP_S, ctx, true);
    if (status() === 'on') ramp(gain.gain, tone.gain, MUSIC_TONE_RAMP_S, ctx);
  });

  if (status() === 'stopping') stop();
  else if (status() === 'starting') begin(playing);
  else el.pause();

  return { start, stop };
}
