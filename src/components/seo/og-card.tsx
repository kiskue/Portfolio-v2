import type { ReactElement, ReactNode } from 'react';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { OG_FONT_FAMILY, type OgTheme } from '@/components/seo/og-theme';
import { apps } from '@/content/apps/apps';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import { caseStudies } from '@/content/case-studies';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { AppId, Brand, CaseStudySlug } from '@/content/types';
import { fieldOrNull, segments, visible } from '@/lib/placeholder';
import { OG_IMAGE_SIZE } from '@/lib/seo';

/*
 * The Open Graph cards (PLAN.md → SEO: "a flex-only layout with name, headline and app colour
 * bars, plus one per case study"). next/og renders a subset of CSS with Satori: flexbox and
 * absolute positioning only, every element with more than one child is display:flex, no CSS
 * variables (colours come from og-theme.ts). The data builders are separate from the markup so
 * tests can check the words without rendering a PNG.
 *
 * A card is a raster image, so a placeholder token cannot be marked as one: token fields and
 * segments are left out in both modes, as hide mode does.
 */

// ─── Data ────────────────────────────────────────────────────────────────────────────────

/** The distinct brand primaries of a white-label app, in store order. */
function brandPrimaries(brands: readonly Brand[]): string[] {
  return [...new Set(visible(brands, 'hide').map((brand) => brand.palette.primary.toLowerCase()))];
}

/**
 * An app's colour bar: Citizen and Responder show their brands' primaries (one codebase, several
 * brands); SME Panindio has one brand, so its own navy, green and amber (src/core/theme in the
 * app, as the SME replicas use them).
 */
export function appColours(app: AppId): readonly string[] {
  switch (app) {
    case 'sme':
      return [SME.navy, SME.green, SME.amber];
    case 'citizen':
      return brandPrimaries(citizenBrands);
    case 'responder':
      return brandPrimaries(responderBrands);
  }
}

/** "Gerric Measco" → "GM", as on the site icon. */
export function monogram(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

interface Byline {
  readonly monogram: string;
  readonly name: string;
  /** "Mobile & full-stack engineer · Taguig City, PH". */
  readonly byline: string;
}

function byline(): Byline {
  return {
    monogram: monogram(site.name),
    name: site.name,
    byline: segments([profile.title, profile.location], 'hide').join(' · '),
  };
}

export interface CardApp {
  readonly name: string;
  /** The app's stage without its name, e.g. "Personal · private beta". */
  readonly stage: string;
  readonly colours: readonly string[];
}

export interface SiteCardData extends Byline {
  readonly headline: readonly [string, string];
  readonly apps: readonly CardApp[];
}

export function siteCardData(): SiteCardData {
  return {
    ...byline(),
    headline: home.headline,
    apps: apps.map((app) => ({
      name: app.name,
      stage: segments(app.stageLabel, 'hide')
        .filter((segment) => segment !== app.name)
        .join(' · '),
      colours: appColours(app.id),
    })),
  };
}

export interface CaseStudyCardData extends Byline {
  /** "Case study · Personal product · Private beta" (shown upper-case). */
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string | null;
  readonly colours: readonly string[];
}

export function caseStudyCardData(slug: CaseStudySlug): CaseStudyCardData {
  const study = caseStudies.find((entry) => entry.slug === slug);
  if (!study) throw new Error(`No case study for slug ${JSON.stringify(slug)}`);
  return {
    ...byline(),
    eyebrow: ['Case study', ...segments(study.eyebrow, 'hide')].join(' · '),
    title: study.title,
    summary: fieldOrNull(study.summary, 'hide'),
    colours: appColours(study.app),
  };
}

// ─── Markup ──────────────────────────────────────────────────────────────────────────────

const PAD_X = 72;

function Frame({ theme, children }: { readonly theme: OgTheme; readonly children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        width: OG_IMAGE_SIZE.width,
        height: OG_IMAGE_SIZE.height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: `60px ${PAD_X}px 64px`,
        backgroundColor: theme.bg,
        // The site's periwinkle glow (top right) and the avatar's peach glow (behind the monogram).
        backgroundImage: [
          `radial-gradient(circle at 92% 0%, ${theme.glow} 0%, ${theme.glowFade} 58%)`,
          `radial-gradient(circle at 7% 13%, ${theme.peach} 0%, ${theme.peachFade} 24%)`,
        ].join(', '),
        color: theme.ink,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      {children}
    </div>
  );
}

function MonogramTile({ theme, text, size }: { readonly theme: OgTheme; readonly text: string; readonly size: number }): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Math.round(size * 0.24),
        backgroundColor: theme.ink,
        color: theme.onInk,
        fontSize: Math.round(size * 0.42),
        fontWeight: 800,
        letterSpacing: -1,
      }}
    >
      {text}
    </div>
  );
}

function ColourBar({ colours, height, radius }: { readonly colours: readonly string[]; readonly height: number; readonly radius: number }): ReactElement {
  return (
    <div style={{ display: 'flex', width: '100%', height, borderRadius: radius, overflow: 'hidden' }}>
      {colours.map((colour, index) => (
        <div key={`${colour}-${index}`} style={{ flexGrow: 1, flexBasis: 0, height, backgroundColor: colour }} />
      ))}
    </div>
  );
}

function Identity({ theme, data, tile, nameSize, bylineSize }: {
  readonly theme: OgTheme;
  readonly data: Byline;
  readonly tile: number;
  readonly nameSize: number;
  readonly bylineSize: number;
}): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(tile * 0.3) }}>
      <MonogramTile theme={theme} text={data.monogram} size={tile} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: nameSize, fontWeight: 800, letterSpacing: -0.5 }}>{data.name}</div>
        {data.byline ? <div style={{ fontSize: bylineSize, fontWeight: 500, color: theme.ink3 }}>{data.byline}</div> : null}
      </div>
    </div>
  );
}

/** The site card: who, the Home headline, and one colour bar per app. */
export function SiteCard({ data, theme }: { readonly data: SiteCardData; readonly theme: OgTheme }): ReactElement {
  return (
    <Frame theme={theme}>
      <Identity theme={theme} data={data} tile={76} nameSize={34} bylineSize={22} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
          paddingBottom: 8,
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: -2.5,
        }}
      >
        <div>{data.headline[0]}</div>
        <div>{data.headline[1]}</div>
      </div>
      <div style={{ display: 'flex', gap: 28 }}>
        {data.apps.map((app) => (
          <div key={app.name} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, gap: 14 }}>
            <ColourBar colours={app.colours} height={14} radius={7} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{app.name}</div>
              {app.stage ? <div style={{ fontSize: 18, fontWeight: 500, color: theme.ink3 }}>{app.stage}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** One case study's card: eyebrow, title, summary, byline, and the app's colours along the bottom. */
export function CaseStudyCard({ data, theme }: { readonly data: CaseStudyCardData; readonly theme: OgTheme }): ReactElement {
  return (
    <Frame theme={theme}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase', color: theme.accentInk }}>
        {data.eyebrow}
      </div>
      <div style={{ marginTop: 18, fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3.2 }}>{data.title}</div>
      {data.summary ? (
        <div
          style={{
            display: 'block',
            lineClamp: 3,
            marginTop: 24,
            maxWidth: 1010,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.42,
            color: theme.ink2,
          }}
        >
          {data.summary}
        </div>
      ) : null}
      <div style={{ display: 'flex', marginTop: 'auto' }}>
        <Identity theme={theme} data={data} tile={52} nameSize={24} bylineSize={18} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex' }}>
        <ColourBar colours={data.colours} height={16} radius={0} />
      </div>
    </Frame>
  );
}
