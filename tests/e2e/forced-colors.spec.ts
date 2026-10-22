import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';
import { CONTACT_TOPIC_LABELS } from '@/lib/contact/fields';
import { aboutHref, caseStudyHref, contactHref, projectsHref } from '@/lib/routes';
import { SHOWCASE_PARAM } from '@/lib/showcase-filters';
import { fontsReady, hydrated, isDesktopShell } from '../support/page';

/*
 * Forced colours (PLAN "Manual checks: … forced colours"; design §10), against the production
 * build. Forced-colours modes (Windows High Contrast) drop shadows and fills and draw every
 * transparent border, so a SegmentedControl's checked option needs its own rule to stand out:
 * the system Highlight (src/components/ui/segmented-control.tsx). Every control the site renders
 * is checked in the light and the dark forced palette:
 * - the checked option is painted differently from an unchecked one, in its fill or its border;
 * - its text (the label, and any count or monogram) keeps the user's system colours and still
 *   shows: its pixels stand out from what is painted behind them. Computed colours alone cannot
 *   tell: a forced Canvas backplate behind HighlightText hides a label whose styles look right;
 * - its focus ring stays a system colour (CanvasText).
 *
 * E2E specs run in plain Node: import only modules without the server-only guard.
 */

/* One worker per file, tests in order (see tests/e2e/smoke.spec.ts for why). */
test.describe.configure({ mode: 'default' });

const SCHEMES = ['light', 'dark'] as const;

/** The system colours the palette is read from (a text colour must be one of them). */
const SYSTEM_COLOURS = ['Canvas', 'CanvasText', 'Highlight', 'HighlightText', 'LinkText', 'ButtonFace', 'ButtonText', 'GrayText'] as const;
type SystemColour = (typeof SYSTEM_COLOURS)[number];

/** The least contrast between a text's glyphs and what is painted behind them (WCAG AA text). */
const MIN_TEXT_CONTRAST = 4.5;

interface OptionPaint {
  /** The option's background as painted: composited over whatever shows through it. */
  readonly fill: string;
  /** Its border as painted over that fill. */
  readonly border: string;
}

interface TextPart {
  readonly text: string;
  readonly color: string;
}

interface GroupPaint {
  readonly palette: Readonly<Record<SystemColour, string>>;
  readonly checked: OptionPaint;
  readonly unchecked: OptionPaint;
  /** The checked option's visible text parts: its label, then any count or monogram. */
  readonly checkedText: readonly TextPart[];
}

/** The option holding the checked radio. */
function checkedOption(group: Locator): Locator {
  return group.locator('label:has(input:checked)');
}

/** The first enabled option that is not checked. */
function uncheckedOption(group: Locator): Locator {
  return group.locator('label:not(:has(input:checked)):not(:has(input:disabled))').first();
}

/** An option's visible text: the label, and any count or monogram (not the sr-only name, not an icon). */
const TEXT_PARTS = ':scope > span:not(.sr-only)';

/** Centres the group on screen (clear of the sticky top bar) and lets any colour transition end. */
async function settle(group: Locator): Promise<void> {
  await group.evaluate(async (fieldset) => {
    fieldset.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const transitions = fieldset.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition);
    await Promise.all(transitions.map((animation) => animation.finished.catch(() => undefined)));
  });
}

/** The forced palette, and how the checked option and an unchecked one are painted. */
async function paintOf(group: Locator): Promise<GroupPaint> {
  return group.evaluate(
    (fieldset, { names, textParts }) => {
      type Rgba = readonly [number, number, number, number];
      const parse = (value: string): Rgba => {
        const parts = /rgba?\(([^)]*)\)/.exec(value)?.[1]?.split(/[\s,/]+/).filter(Boolean).map(Number);
        if (!parts || parts.length < 3) throw new Error(`unexpected colour "${value}"`);
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
      };
      const over = (top: Rgba, under: Rgba): Rgba => {
        const alpha = top[3] + under[3] * (1 - top[3]);
        if (alpha === 0) return [0, 0, 0, 0];
        const mix = (index: 0 | 1 | 2): number => (top[index] * top[3] + under[index] * under[3] * (1 - top[3])) / alpha;
        return [mix(0), mix(1), mix(2), alpha];
      };
      const css = (colour: Rgba): string => `rgb(${Math.round(colour[0])}, ${Math.round(colour[1])}, ${Math.round(colour[2])})`;
      /** The element's background over its ancestors', down to the first opaque one. */
      const fill = (element: Element): Rgba => {
        const layers: Rgba[] = [];
        for (let node: Element | null = element; node; node = node.parentElement) {
          const layer = parse(getComputedStyle(node).backgroundColor);
          layers.push(layer);
          if (layer[3] >= 1) break;
        }
        return layers.reduceRight<Rgba>((under, top) => over(top, under), [0, 0, 0, 0]);
      };
      const paint = (option: Element): OptionPaint => {
        const style = getComputedStyle(option);
        const base = fill(option);
        const border = Number.parseFloat(style.borderTopWidth) > 0 ? over(parse(style.borderTopColor), base) : base;
        return { fill: css(base), border: css(border) };
      };

      // System colours resolve to the forced palette; a probe that opts out of forcing reads them.
      // A new probe per colour: changing one probe's colour would start a colour transition.
      const palette: Record<string, string> = {};
      for (const name of names) {
        const probe = document.createElement('span');
        probe.style.setProperty('forced-color-adjust', 'none');
        probe.style.color = name;
        document.body.append(probe);
        palette[name] = getComputedStyle(probe).color;
        probe.remove();
      }

      const checked = fieldset.querySelector('label:has(input:checked)');
      const unchecked = fieldset.querySelector('label:not(:has(input:checked)):not(:has(input:disabled))');
      if (!checked || !unchecked) throw new Error('the group needs a checked and an unchecked option');
      return {
        palette: palette as Record<SystemColour, string>,
        checked: paint(checked),
        unchecked: paint(unchecked),
        checkedText: [...checked.querySelectorAll(textParts)].map((part) => ({
          text: part.textContent?.trim() ?? '',
          color: getComputedStyle(part).color,
        })),
      };
    },
    { names: SYSTEM_COLOURS, textParts: TEXT_PARTS },
  );
}

/** WCAG relative luminance of an sRGB colour. */
function luminance(red: number, green: number, blue: number): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

type Rgb = readonly [number, number, number];

interface Pixels {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
  readonly channels: number;
}

async function screenshotPixels(element: Locator): Promise<Pixels> {
  const png = await element.screenshot({ animations: 'disabled', caret: 'hide' });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function pixelAt(image: Pixels, index: number): Rgb {
  const at = index * image.channels;
  return [image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0];
}

/** The per-channel median of some pixels. */
function median(colours: readonly Rgb[]): Rgb {
  const channel = (index: 0 | 1 | 2): number => {
    const values = colours.map((colour) => colour[index]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  return [channel(0), channel(1), channel(2)];
}

/** Device pixels left out at each edge of a text's screenshot (a box edge between two CSS pixels at 2x). */
const EDGE = 2;

/** Inline styles that draw a text black on white, unforced and without transitions. */
const REFERENCE_STYLES = [
  ['forced-color-adjust', 'none'],
  ['color', 'black'],
  ['background-color', 'white'],
  ['transition', 'none'],
] as const;

/**
 * How much a text's glyphs stand out, on screen, from what is painted right behind them. A second
 * screenshot draws the same glyphs black on white to find which pixels are glyph cores and which
 * are clear paper between them; the result is the contrast between the colours the real
 * screenshot shows on each (their medians). A text hidden by a backplate of its own colour
 * measures 1.
 */
async function glyphContrast(text: Locator): Promise<number> {
  const real = await screenshotPixels(text);
  await text.evaluate((element, styles) => {
    for (const [property, value] of styles) element.style.setProperty(property, value, 'important');
  }, REFERENCE_STYLES);
  const reference = await screenshotPixels(text);
  await text.evaluate((element, styles) => {
    for (const [property] of styles) element.style.removeProperty(property);
  }, REFERENCE_STYLES);
  if (real.width !== reference.width || real.height !== reference.height) throw new Error('the two screenshots differ in size');

  // Glyph cores are near black in the reference; paper is white, inside the glyphs' bounding box.
  // The shot's outer pixels are left out: the box rarely sits on whole pixels, so they mix in
  // whatever is around it.
  const { width, height } = reference;
  const cores: number[] = [];
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = EDGE; y < height - EDGE; y += 1) {
    for (let x = EDGE; x < width - EDGE; x += 1) {
      const index = y * width + x;
      if (luminance(...pixelAt(reference, index)) >= 0.2) continue;
      cores.push(index);
      [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
    }
  }
  if (cores.length === 0) throw new Error('no glyph pixels found');
  const paper: Rgb[] = [];
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const index = y * width + x;
      if (luminance(...pixelAt(reference, index)) > 0.9) paper.push(pixelAt(real, index));
    }
  }
  if (paper.length === 0) throw new Error('no clear pixels between the glyphs');
  const ink = luminance(...median(cores.map((index) => pixelAt(real, index))));
  const behind = luminance(...median(paper));
  return (Math.max(ink, behind) + 0.05) / (Math.min(ink, behind) + 0.05);
}

/**
 * The checks for one SegmentedControl: its checked option is painted differently from an
 * unchecked one, its text keeps system colours and shows, and its focus ring is CanvasText.
 */
async function expectCheckedStandsOut(page: Page, group: Locator, what: string): Promise<void> {
  await expect(group, `${what} is on screen`).toBeVisible();
  const checked = checkedOption(group);
  await expect(checked, `${what} has a checked option`).toHaveCount(1);
  await expect(uncheckedOption(group), `${what} has an unchecked option`).toHaveCount(1);
  // The web fonts first: a font swap between the two screenshots of a text would move its glyphs.
  await fontsReady(page);
  await settle(group);
  const paint = await paintOf(group);

  // Painted differently from an unchecked option: the fill or the border.
  expect(paint.checked, `${what}: the checked option is painted like an unchecked one`).not.toEqual(paint.unchecked);

  // Its text keeps the user's palette and shows against what is painted behind it.
  const systemColours = new Set(Object.values(paint.palette));
  const parts = checked.locator(TEXT_PARTS);
  expect(paint.checkedText.length, `${what}: the checked option shows its label`).toBeGreaterThan(0);
  await expect(parts).toHaveCount(paint.checkedText.length);
  for (const [index, part] of paint.checkedText.entries()) {
    expect(systemColours.has(part.color), `${what}: "${part.text}" is ${part.color}, not a system colour`).toBe(true);
    await expect(parts.nth(index)).toBeVisible();
    const contrast = await glyphContrast(parts.nth(index));
    expect(contrast, `${what}: "${part.text}" stands out from what is painted behind it`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  }

  // Its focus ring stays a system colour. A key press first, so the programmatic focus is
  // keyboard focus (:focus-visible), as when tabbing into the group.
  await page.keyboard.press('Shift');
  await checked.locator('input').focus();
  await settle(group);
  const ring = await checked.evaluate((label) => {
    const style = getComputedStyle(label);
    return { focusVisible: label.querySelector(':focus-visible') !== null, style: style.outlineStyle, color: style.outlineColor };
  });
  expect(ring, `${what}: the focus ring`).toEqual({ focusVisible: true, style: 'solid', color: paint.palette.CanvasText });
}

/** Opens Display settings: the rail's popover at 1280px and wider, the footer disclosure below. */
async function openDisplaySettings(page: Page): Promise<Locator> {
  if (isDesktopShell(page)) {
    await page.getByRole('complementary').getByRole('button', { name: 'Display settings' }).click();
    const popover = page.getByRole('dialog', { name: 'Display settings' });
    await expect(popover).toBeVisible();
    return popover;
  }
  const footer = page.getByRole('contentinfo');
  const trigger = footer.getByRole('button', { name: 'Display settings' });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return footer;
}

for (const scheme of SCHEMES) {
  test.describe(`forced colours, ${scheme} palette`, () => {
    test.beforeEach(async ({ page }) => {
      // Before the first paint, so nothing transitions into the forced palette. Reduced motion
      // keeps the glimpse player on its first app while the stage picker is checked.
      await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme, reducedMotion: 'reduce' });
    });

    test('/projects: the Type and Context filters', async ({ page }) => {
      await page.goto(projectsHref(), { waitUntil: 'load' });
      await hydrated(page);
      for (const legend of ['Type', 'Context']) {
        await expectCheckedStandsOut(page, page.getByRole('group', { name: legend, exact: true }), `/projects ${legend}`);
      }
    });

    test('/projects/defensys-citizen: the brand switcher (store icons) and the Screens source toggle', async ({ page }) => {
      await page.goto(caseStudyHref('defensys-citizen'), { waitUntil: 'load' });
      await hydrated(page);
      await expectCheckedStandsOut(page, page.locator('[data-brand-switcher]').getByRole('group'), 'Citizen brand switcher');
      await expectCheckedStandsOut(page, page.locator('#screens [data-source-toggle]').getByRole('group'), 'Citizen source toggle');
    });

    test('/projects/defensys-responder: the brand switcher (monograms)', async ({ page }) => {
      await page.goto(caseStudyHref('defensys-responder'), { waitUntil: 'load' });
      await hydrated(page);
      await expectCheckedStandsOut(page, page.locator('[data-brand-switcher]').getByRole('group'), 'Responder brand switcher');
    });

    test('/showcase: the App, Brand and Source filters', async ({ page }) => {
      await page.goto(`/showcase?${SHOWCASE_PARAM.app}=citizen`, { waitUntil: 'load' });
      await page.locator('[data-showcase-filters][data-ready]').waitFor();
      const filters = page.locator('[data-showcase-filters]');
      await expect(filters.getByRole('radio', { name: 'Defensys Citizen' })).toBeChecked();
      for (const legend of ['App', 'Brand', 'Source']) {
        await expectCheckedStandsOut(page, filters.getByRole('group', { name: legend, exact: true }), `/showcase ${legend}`);
      }
    });

    test('/showcase: the Responder brands (monograms)', async ({ page }) => {
      await page.goto(`/showcase?${SHOWCASE_PARAM.app}=responder`, { waitUntil: 'load' });
      await page.locator('[data-showcase-filters][data-ready]').waitFor();
      const filters = page.locator('[data-showcase-filters]');
      await expect(filters.getByRole('radio', { name: 'Defensys Responder' })).toBeChecked();
      await expectCheckedStandsOut(page, filters.getByRole('group', { name: 'Brand', exact: true }), '/showcase Responder brand');
    });

    test('/contact: the topic', async ({ page }) => {
      await page.goto(contactHref('project'), { waitUntil: 'load' });
      await hydrated(page);
      const topic = page.getByRole('form', { name: 'Send a message' }).getByRole('group');
      await expect(topic.getByRole('radio', { name: CONTACT_TOPIC_LABELS.project })).toBeChecked();
      await expectCheckedStandsOut(page, topic, '/contact topic');
    });

    test('the shell: Display settings (Theme and Motion)', async ({ page }) => {
      await page.goto(aboutHref(), { waitUntil: 'load' });
      await hydrated(page);
      const panel = await openDisplaySettings(page);
      for (const legend of ['Theme', 'Motion']) {
        await expectCheckedStandsOut(page, panel.getByRole('group', { name: legend, exact: true }), `Display settings ${legend}`);
      }
    });

    test('Home: the glimpse stage picker (single-phone layout)', async ({ page }) => {
      // The picker shows only in the single-phone stage, on narrow cards (design §5.3): a phone's width.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/', { waitUntil: 'load' });
      await hydrated(page);
      const picker = page.locator('[data-section="bento"]').getByRole('group', { name: 'Show app', exact: true });
      await expectCheckedStandsOut(page, picker, 'Home stage picker');
    });
  });
}
