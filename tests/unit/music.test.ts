import { describe, expect, it } from 'vitest';
import {
  isMusicPlaying,
  MUSIC_FADE_IN_S,
  MUSIC_FADE_OUT_S,
  MUSIC_TONE_RAMP_S,
  musicTone,
  nextMusicStatus,
  type MusicEvent,
  type MusicStatus,
} from '@/lib/music';

const STATUSES: readonly MusicStatus[] = ['off', 'starting', 'on', 'stopping'];
const EVENTS: readonly MusicEvent[] = ['press', 'started', 'stopped', 'failed'];

describe('nextMusicStatus', () => {
  it.each<[MusicStatus, MusicEvent, MusicStatus]>([
    ['off', 'press', 'starting'],
    ['starting', 'started', 'on'],
    ['starting', 'press', 'stopping'],
    ['on', 'press', 'stopping'],
    ['stopping', 'stopped', 'off'],
    ['stopping', 'press', 'starting'],
  ])('%s + %s -> %s', (status, event, expected) => {
    expect(nextMusicStatus(status, event)).toBe(expected);
  });

  it.each(STATUSES)('%s + failed -> off', (status) => {
    expect(nextMusicStatus(status, 'failed')).toBe('off');
  });

  it('never plays without a press: from off, every other event stays off', () => {
    for (const event of EVENTS.filter((e) => e !== 'press')) expect(nextMusicStatus('off', event)).toBe('off');
  });

  it('leaves the status unchanged for every other pair', () => {
    const listed = new Set(['off:press', 'starting:started', 'starting:press', 'on:press', 'stopping:stopped', 'stopping:press']);
    for (const status of STATUSES) {
      for (const event of EVENTS) {
        if (event === 'failed' || listed.has(`${status}:${event}`)) continue;
        expect(nextMusicStatus(status, event)).toBe(status);
      }
    }
  });
});

describe('isMusicPlaying', () => {
  it('is true for starting and on only', () => {
    expect(STATUSES.filter(isMusicPlaying)).toEqual(['starting', 'on']);
  });
});

describe('tone and fades', () => {
  it('day is bright and louder, night is muffled and quieter', () => {
    expect(musicTone(false)).toEqual({ gain: 0.5, cutoffHz: 20000 });
    expect(musicTone(true)).toEqual({ gain: 0.4, cutoffHz: 1500 });
  });

  it('has the fade constants', () => {
    expect([MUSIC_FADE_IN_S, MUSIC_FADE_OUT_S, MUSIC_TONE_RAMP_S]).toEqual([2, 0.6, 1.5]);
  });
});
