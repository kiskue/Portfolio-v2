import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OG_FONT_FAMILY, ogTheme, parseRootTokens, type OgTheme } from '@/components/seo/og-theme';

/*
 * Build-time inputs of the Open Graph cards (both are prerendered, so this runs during
 * `next build`). Paths are relative to the project root, as next/og's docs do it.
 *
 * Fonts: Plus Jakarta Sans, the site's UI and display face, as static TrueType instances (Satori
 * reads neither woff2 nor variable fonts). OFL-1.1: fonts/OFL.txt travels with them.
 */

const FONT_DIR = join(process.cwd(), 'src', 'components', 'seo', 'fonts');
const FACES = [
  { file: 'PlusJakartaSans-Medium.ttf', weight: 500 },
  { file: 'PlusJakartaSans-Bold.ttf', weight: 700 },
  { file: 'PlusJakartaSans-ExtraBold.ttf', weight: 800 },
] as const;

export interface OgFont {
  readonly name: string;
  readonly data: Buffer;
  readonly weight: (typeof FACES)[number]['weight'];
  readonly style: 'normal';
}

export async function loadOgFonts(): Promise<OgFont[]> {
  return Promise.all(
    FACES.map(async ({ file, weight }) => ({
      name: OG_FONT_FAMILY,
      data: await readFile(join(FONT_DIR, file)),
      weight,
      style: 'normal' as const,
    })),
  );
}

export async function loadOgTheme(): Promise<OgTheme> {
  return ogTheme(parseRootTokens(await readFile(join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8')));
}
