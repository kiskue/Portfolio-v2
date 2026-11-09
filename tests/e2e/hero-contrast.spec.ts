import { expect, test, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import { fontsReady, storeDisplay } from '../support/page';

/*
 * axe cannot judge contrast over an image, so this samples the real pixels behind every hero text
 * (design §3.5): the text and its underlines are made transparent (the halo text-shadow keeps
 * painting), the viewport is screenshotted at DPR 1, and each text colour is compared with every
 * pixel inside its line rects. The 2nd percentile per text must reach 3 (large text) or 4.5
 * (everything else).
 * On a short screen the hero grows taller than the viewport to fit its text (at 320x568 the
 * credit sits below the fold), so a text below the fold is sampled in a screenshot scrolled to it.
 * 320x568 is there for the text plates, which are narrower below 22.5rem (ledger Ruling 42).
 */

test.describe.configure({ mode: 'default' });

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1447, height: 722 },
  { width: 1920, height: 1080 },
] as const;
const THEMES = ['light', 'dark'] as const;

const LARGE_MIN = 3;
const NORMAL_MIN = 4.5;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface HeroText {
  readonly label: string;
  readonly color: string;
  readonly large: boolean;
  readonly rects: readonly Rect[];
}

function record(testInfo: TestInfo, line: string): void {
  testInfo.annotations.push({ type: 'measured', description: line });
  console.log(`[${testInfo.project.name}] ${line}`);
}

function parseColor(value: string): { r: number; g: number; b: number; a: number } {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (!match) throw new Error(`Unparsable colour: ${value}`);
  const parts = (match[1] ?? '').split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('Hero text contrast', () => {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      test(`every hero text meets WCAG AA over the painting (${theme}, ${viewport.width}x${viewport.height})`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'Pixel sampling runs in the desktop project only.');

        await page.setViewportSize(viewport);
        await storeDisplay(page, { theme, motion: 'reduce' });
        await page.goto('/');
        await page.evaluate(async () => {
          const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-section="hero"] img[data-hero-painting]'));
          await Promise.all(images.map((image) => image.decode()));
        });
        await fontsReady(page);

        const texts = await page.evaluate((): HeroText[] => {
          const hero = document.querySelector('[data-section="hero"]');
          if (!hero) throw new Error('No hero');
          const found: HeroText[] = [];
          const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? '';
            const parent = node.parentElement;
            if (!parent || text.trim() === '') continue;
            if (parent.closest('.sr-only, [hidden]')) continue;
            if (!parent.checkVisibility()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = Array.from(range.getClientRects())
              .filter((rect) => rect.width > 0 && rect.height > 0)
              .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
            if (rects.length === 0) continue;
            const style = getComputedStyle(parent);
            const size = parseFloat(style.fontSize);
            const weight = Number(style.fontWeight);
            found.push({
              label: `${parent.tagName.toLowerCase()} "${text.trim().slice(0, 28)}"`,
              color: style.color,
              large: size >= 24 || (size >= 18.66 && weight >= 700),
              rects,
            });
          }
          return found;
        });
        expect(texts.length).toBeGreaterThan(0);

        // The text and its decorations: a link's underline drawn on the last row of its line box
        // falls inside the next line's rect, and is foreground, not background.
        await page.addStyleTag({
          content:
            '[data-section="hero"] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; }',
        });
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        await page.waitForTimeout(400);

        // Screenshots by scroll position (the rects were measured at the top of the page).
        const shots = new Map<number, { data: Buffer; width: number; height: number; scrollY: number }>();
        const screenshotAt = async (top: number) => {
          const cached = shots.get(top);
          if (cached) return cached;
          const scrollY = await page.evaluate(async (y) => {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            return window.scrollY;
          }, top);
          if (top > 0) await page.waitForTimeout(200);
          const { data, info } = await sharp(await page.screenshot())
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          expect(info.channels).toBe(4);
          const shot = { data, width: info.width, height: info.height, scrollY };
          shots.set(top, shot);
          return shot;
        };

        const failures: string[] = [];
        for (const text of texts) {
          const fg = parseColor(text.color);
          const ratios: number[] = [];
          // Below the fold: scroll so the text's last line sits 16 px above the bottom edge.
          const bottom = Math.max(...text.rects.map((rect) => rect.y + rect.height));
          const { data, width, height, scrollY } = await screenshotAt(bottom > viewport.height ? Math.ceil(bottom - viewport.height + 16) : 0);
          for (const rect of text.rects) {
            const x0 = Math.max(0, Math.floor(rect.x));
            const y0 = Math.max(0, Math.floor(rect.y - scrollY));
            const x1 = Math.min(width, Math.ceil(rect.x + rect.width));
            const y1 = Math.min(height, Math.ceil(rect.y - scrollY + rect.height));
            for (let y = y0; y < y1; y += 1) {
              for (let x = x0; x < x1; x += 1) {
                const i = (y * width + x) * 4;
                const br = data[i] ?? 0;
                const bg = data[i + 1] ?? 0;
                const bb = data[i + 2] ?? 0;
                const r = fg.r * fg.a + br * (1 - fg.a);
                const g = fg.g * fg.a + bg * (1 - fg.a);
                const b = fg.b * fg.a + bb * (1 - fg.a);
                ratios.push(contrast(luminance(r, g, b), luminance(br, bg, bb)));
              }
            }
          }
          expect(ratios.length, `${text.label} has sampled pixels`).toBeGreaterThan(0);
          ratios.sort((a, b) => a - b);
          const min = ratios[0] ?? 0;
          const p2 = ratios[Math.floor((ratios.length - 1) * 0.02)] ?? 0;
          const need = text.large ? LARGE_MIN : NORMAL_MIN;
          record(
            testInfo,
            `${theme} ${viewport.width}x${viewport.height} ${text.label}${text.large ? ' (large)' : ''}: min ${min.toFixed(2)}, p2 ${p2.toFixed(2)} (need ${need})`,
          );
          if (p2 < need) failures.push(`${text.label}: p2 ${p2.toFixed(2)} < ${need}`);
        }
        expect(failures).toEqual([]);
      });
    }
  }

  for (const theme of THEMES) {
    test(`the painting outside the text stays unveiled (${theme})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'Pixel sampling runs in the desktop project only.');

      await page.setViewportSize({ width: 1447, height: 722 });
      await storeDisplay(page, { theme, motion: 'reduce' });
      await page.goto('/');
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-section="hero"] img[data-hero-painting]'));
        await Promise.all(images.map((image) => image.decode()));
      });
      await fontsReady(page);

      const box = await page.locator('[data-section="hero"]').boundingBox();
      if (!box) throw new Error('No hero box');
      // The castle: the hero's right 18% by its middle third, away from all text.
      const clip = {
        x: Math.round(box.x + box.width * 0.82),
        y: Math.round(box.y + box.height * 0.33),
        width: Math.round(box.width * 0.18),
        height: Math.round(box.height * 0.33),
      };
      const decode = async (png: Buffer) => (await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
      const veiled = await decode(await page.screenshot({ clip }));
      await page.addStyleTag({
        content: [
          "[data-hero-layer^='scrim'], .hero-fade { display: none !important; }",
          '.hero-content header > div:first-child::before, .hero-content header > p::before, .hero-credit::before { display: none !important; }',
        ].join('\n'),
      });
      await page.waitForTimeout(300);
      const bare = await decode(await page.screenshot({ clip }));
      expect(veiled.length).toBe(bare.length);

      let diff = 0;
      let sumVeiled = 0;
      let sumBare = 0;
      for (let i = 0; i < veiled.length; i += 1) {
        diff += Math.abs((veiled[i] ?? 0) - (bare[i] ?? 0));
        sumVeiled += veiled[i] ?? 0;
        sumBare += bare[i] ?? 0;
      }
      const mean = diff / veiled.length;
      record(
        testInfo,
        `${theme} castle region: mean ${(sumVeiled / veiled.length).toFixed(1)} as is, ${(sumBare / bare.length).toFixed(1)} without scrims and plates, mean abs diff ${mean.toFixed(2)} per channel (max 6)`,
      );
      expect(mean).toBeLessThanOrEqual(6);
    });
  }
});
