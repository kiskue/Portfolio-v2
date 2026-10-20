import {
  siClaudecode,
  siExpo,
  siFastapi,
  siGithub,
  siGithubactions,
  siGooglegemini,
  siJest,
  siMaplibre,
  siMysql,
  siNestjs,
  siNextdotjs,
  siOllama,
  siReact,
  siReactquery,
  siSocketdotio,
  siSqlite,
  siStorybook,
  siTailwindcss,
  siTypescript,
  siVercel,
  siWebrtc,
  type SimpleIcon,
} from 'simple-icons';
import type { SimpleIconKey, ToolGlyph } from '@/content/types';
import { cn } from '@/lib/cn';

/**
 * Only the glyphs the content uses, imported by name so the rest of simple-icons is tree-shaken
 * away. `satisfies` makes a missing key (a new SimpleIconKey) a compile error.
 */
const SIMPLE_ICONS = {
  siExpo,
  siReact,
  siTypescript,
  siNextdotjs,
  siTailwindcss,
  siReactquery,
  siSocketdotio,
  siWebrtc,
  siSqlite,
  siNestjs,
  siFastapi,
  siMysql,
  siGooglegemini,
  siOllama,
  siMaplibre,
  siStorybook,
  siJest,
  siGithubactions,
  siVercel,
  siGithub,
  siClaudecode,
} as const satisfies Record<SimpleIconKey, SimpleIcon>;

/**
 * LinkedIn's "In" mark (simple-icons does not ship it). Monochrome: the rounded square is
 * filled with currentColor and the letters are cut out, as in LinkedIn's one-colour logo.
 */
const LINKEDIN_PATH =
  'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';

export interface BrandGlyphProps {
  readonly glyph: ToolGlyph;
  /** Rendered size in px (default 18, the tools strip size). */
  readonly size?: number;
  /** Accessible name. Omit it when visible text names the tool (the default): the glyph is decorative. */
  readonly label?: string;
  readonly className?: string;
}

function a11y(label: string | undefined) {
  return label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true } as const);
}

/**
 * A tool or social mark in currentColor (reuse rule 2): a simple-icons path, LinkedIn's official
 * mark, or a monogram tile for tools simple-icons lacks (Zustand, React Native, Playwright…).
 */
export function BrandGlyph({ glyph, size = 18, label, className }: BrandGlyphProps) {
  if (glyph.kind === 'monogram') {
    return (
      <span
        {...a11y(label)}
        style={{ width: size, height: size }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[25%] border-[1.5px] border-current font-mono text-[0.75rem] leading-none font-medium',
          className,
        )}
      >
        {glyph.text}
      </span>
    );
  }

  const path = glyph.kind === 'si' ? SIMPLE_ICONS[glyph.icon].path : LINKEDIN_PATH;
  return (
    <svg
      {...a11y(label)}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <path d={path} />
    </svg>
  );
}
