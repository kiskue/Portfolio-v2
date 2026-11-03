import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { DRAGON_SPINE } from '@/components/sections/home/dragon/dragon-spine';

/*
 * The committed files scripts/prepare-scene.mjs wrote (`npm run scene:prepare`): the two
 * paintings, the dragon frames and tail, the spine data and the music file.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCENE = join(ROOT, 'public', 'scene');
const MP3 = join(ROOT, 'public', 'audio', 'ride-the-wind.mp3');

async function bytes(path: string): Promise<number> {
  return (await stat(path)).size;
}

async function expectDragonFrame(name: string, maxBytes: number): Promise<void> {
  const path = join(SCENE, name);
  const meta = await sharp(path).metadata();
  expect(meta.format).toBe('webp');
  expect([meta.width, meta.height]).toEqual([800, 706]);
  expect(meta.hasAlpha).toBe(true);
  expect(await bytes(path)).toBeLessThanOrEqual(maxBytes);
}

describe('scene assets (npm run scene:prepare)', () => {
  it.each(['day', 'night'])('%s painting: 1376×768, AVIF ≤ 120,000 B, WebP ≤ 170,000 B', async (name) => {
    const avif = join(SCENE, `${name}.avif`);
    const webp = join(SCENE, `${name}.webp`);
    const avifMeta = await sharp(avif).metadata();
    const webpMeta = await sharp(webp).metadata();
    expect([avifMeta.width, avifMeta.height]).toEqual([1376, 768]);
    expect([webpMeta.width, webpMeta.height]).toEqual([1376, 768]);
    expect(await bytes(avif)).toBeLessThanOrEqual(120_000);
    expect(await bytes(webp)).toBeLessThanOrEqual(170_000);
  });

  it.each(['up', 'level', 'down'])('dragon-%s.webp and dragon-full-%s.webp: 800×706 with alpha, each ≤ 60,000 B', async (pose) => {
    await expectDragonFrame(`dragon-${pose}.webp`, 60_000);
    await expectDragonFrame(`dragon-full-${pose}.webp`, 60_000);
  });

  it('dragon-tail.webp: 800×706 with alpha, ≤ 16,000 B', async () => {
    await expectDragonFrame('dragon-tail.webp', 16_000);
  });

  it('DRAGON_SPINE: frame 800×706, half 30, five arrays of 90, s rising from 0 to 0.9991', () => {
    expect(DRAGON_SPINE.w).toBe(800);
    expect(DRAGON_SPINE.h).toBe(706);
    expect(DRAGON_SPINE.half).toBe(30);
    for (const key of ['x', 'y', 'nx', 'ny', 's'] as const) {
      expect(DRAGON_SPINE[key]).toHaveLength(90);
    }
    const s = DRAGON_SPINE.s;
    expect(s[0]).toBe(0);
    expect(s[89]).toBe(0.9991);
    for (let i = 1; i < s.length; i += 1) {
      expect(s[i]).toBeGreaterThan(s[i - 1] ?? Infinity);
    }
  });

  it('ride-the-wind.mp3: 3,300,000–4,300,000 B, starting with "ID3" or an MPEG frame sync (0xFF 0xE?)', async () => {
    const size = await bytes(MP3);
    expect(size).toBeGreaterThanOrEqual(3_300_000);
    expect(size).toBeLessThanOrEqual(4_300_000);
    const head = readFileSync(MP3).subarray(0, 3);
    const isId3 = head.toString('latin1') === 'ID3';
    const isSync = head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0;
    expect(isId3 || isSync).toBe(true);
  });
});
