import { expect, test, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import { fontsReady, storeDisplay } from '../support/page';

/*
 * axe cannot judge contrast over an image, so this samples the real pixels behind every hero text
 * (design §3.5): the text is made transparent (the halo text-shadow keeps painting), the viewport
 * is screenshotted at DPR 1, and each text colour is compared with every pixel inside its line
 * rects. The 2nd percentile per text must reach 3 (large text) or 4.5 (everything else).
 */

test.describe.configure({ mode: 'default' });

const VIEWPORTS = [
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

        await page.addStyleTag({
          content:
            '[data-section="hero"] * { color: transparent !important; -webkit-text-fill-color: transparent !important; }',
        });
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        await page.waitForTimeout(400);

        const { data, info } = await sharp(await page.screenshot())
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect(info.channels).toBe(4);

        const failures: string[] = [];
        for (const text of texts) {
          const fg = parseColor(text.color);
          const ratios: number[] = [];
          for (const rect of text.rects) {
            const x0 = Math.max(0, Math.floor(rect.x));
            const y0 = Math.max(0, Math.floor(rect.y));
            const x1 = Math.min(info.width, Math.ceil(rect.x + rect.width));
            const y1 = Math.min(info.height, Math.ceil(rect.y + rect.height));
            for (let y = y0; y < y1; y += 1) {
              for (let x = x0; x < x1; x += 1) {
                const i = (y * info.width + x) * 4;
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
});
