/* The music's pure rules (design: opt-in "Ride The Wind"): the button's state machine and the day/night tone. */

export type MusicStatus = 'off' | 'starting' | 'on' | 'stopping';
export type MusicEvent = 'press' | 'started' | 'stopped' | 'failed';

export const MUSIC_FADE_IN_S = 2;
export const MUSIC_FADE_OUT_S = 0.6;
export const MUSIC_TONE_RAMP_S = 1.5;

/** The next status after an event. Only a press ever leaves `off`; a failure always returns to it. */
export function nextMusicStatus(status: MusicStatus, event: MusicEvent): MusicStatus {
  if (event === 'failed') return 'off';
  switch (status) {
    case 'off':
      return event === 'press' ? 'starting' : status;
    case 'starting':
      if (event === 'started') return 'on';
      return event === 'press' ? 'stopping' : status;
    case 'on':
      return event === 'press' ? 'stopping' : status;
    case 'stopping':
      if (event === 'stopped') return 'off';
      return event === 'press' ? 'starting' : status;
  }
}

/** True while the song is playing or about to (the button shows "Pause music"). */
export function isMusicPlaying(status: MusicStatus): boolean {
  return status === 'starting' || status === 'on';
}

/** Day is open and bright; night is quieter and muffled by a low-pass filter. */
export function musicTone(dark: boolean): { gain: number; cutoffHz: number } {
  return dark ? { gain: 0.4, cutoffHz: 1500 } : { gain: 0.5, cutoffHz: 20000 };
}
