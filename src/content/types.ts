/**
 * The content model: architecture D3 plus the binding PLAN.md amendments.
 *
 * FROZEN after wave 0. A new field, union member or type goes through the integrator.
 *
 * Content modules are plain typed data with no React. Every user-facing string is a `Field`:
 * plain text, or exactly one whole placeholder token made with `ph('…')` from
 * src/lib/placeholder.ts (tests/unit/content.invariants.test.ts enforces this). Meta lines are
 * `Segments`, rendered joined by " · " with hidden segments skipped, so hiding a token never
 * leaves a dangling separator.
 */
import type { Route } from 'next';

// ─── Primitives ──────────────────────────────────────────────────────────────────────────

export type ISODate = `${number}-${number}-${number}`;
export type Hex = `#${string}`;
/** A root-relative path to a file under public/, e.g. "/store/citizen/1hope/play-icon.webp". */
export type AssetPath = `/${string}`;

/** A "[[…]]" placeholder token. Authored only via ph('…') and always a whole field. */
export type Placeholder = `[[${string}]]`;
/** A user-facing string field: plain text, or exactly one whole `Placeholder`. Render it with <Copy>. */
export type Field = string;
/** Alias kept for the architecture's component signatures (D2); identical to `Field`. */
export type CopyText = Field;
/** A meta line as segments, rendered joined by " · ". Hidden segments are skipped. */
export type Segments = readonly Field[];
/** 'label' marks placeholders and Example items; 'hide' removes token fields and example items. */
export type PlaceholderMode = 'label' | 'hide';

/** Flags shared by collection items. */
export interface Meta {
  /** Shows an "Example" tag in label mode; the item is removed in hide mode. */
  readonly example?: true;
  /** Never rendered in any mode (e.g. work that is not ready to show). */
  readonly hidden?: true;
  /** Never rendered; listed by `npm run content:todo` for the owner to confirm. */
  readonly confirm?: string;
}

// ─── Closed vocabularies (runtime lists drive URL params, schemas and tests) ─────────────

export const APP_IDS = ['sme', 'citizen', 'responder'] as const;
export type AppId = (typeof APP_IDS)[number];

/** Cyclic case-study order: SME → Citizen → Responder (previous / next links follow it). */
export const CASE_STUDY_SLUGS = ['sme-panindio', 'defensys-citizen', 'defensys-responder'] as const;
export type CaseStudySlug = (typeof CASE_STUDY_SLUGS)[number];

/** Case-study sections in page order; each key is also the section's #anchor. */
export const CASE_STUDY_SECTION_KEYS = [
  'overview',
  'problem',
  'built',
  'ai',
  'brands',
  'screens',
  'architecture',
  'challenges',
  'numbers',
  'next',
] as const;
export type CaseStudySectionKey = (typeof CASE_STUDY_SECTION_KEYS)[number];

export const PROJECT_TYPES = ['mobile', 'web', 'ai', 'tooling'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_CONTEXTS = ['personal', 'company', 'client'] as const;
export type ProjectContext = (typeof PROJECT_CONTEXTS)[number];

/** Status shapes: live = filled, beta = half, building = ring with dot, prototype = dashed ring. */
export const STATUSES = ['live', 'beta', 'building', 'prototype'] as const;
export type Status = (typeof STATUSES)[number];

export const CONTACT_TOPICS = ['hiring', 'project', 'testimonial', 'other'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Delivery state of a feature or screen that is not plainly shipped. */
export type Rollout = 'shipped' | 'in-rollout' | 'in-progress';

/** Lucide icon keys (kebab-case of the lucide-react export). The UI registry maps every key. */
export const ICON_NAMES = [
  // Nav and bento cards
  'house',
  'folder-open',
  'layers',
  'smartphone',
  'message-square-quote',
  'user-round',
  'message-circle',
  'sparkles',
  'rocket',
  'award',
  // Utility
  'accessibility',
  'moon',
  'sun',
  'volume-2',
  'volume-x',
  'monitor',
  'mail',
  'arrow-up-right',
  'arrow-right',
  'arrow-left',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'pause',
  'play',
  'rotate-ccw',
  'menu',
  'x',
  'copy',
  'check',
  'download',
  'send',
  'loader-circle',
  'circle-alert',
  'info',
  'badge-check',
  'graduation-cap',
  'clock',
  'calendar',
  'map-pin',
  'map',
  'globe',
  'briefcase',
  'users',
  'file-text',
  'image',
  'star',
  // Products, services and AI builds
  'bot',
  'cloud-sun',
  'hospital',
  'captions',
  'shield-check',
  'code',
  'radio',
  'wifi-off',
  'database',
  'store',
  'siren',
  'mic',
  'video',
  'palette',
  'id-card',
  'stethoscope',
  'chart-column',
  'wrench',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/**
 * simple-icons 16.35.0 exports used for tool and social glyphs (tests/unit/simple-icons.test.ts
 * proves each exists). Absent from simple-icons, so never listed here: LinkedIn (official mark),
 * VS Code, OpenAI, Zustand, React Native, Playwright, Motion (monogram tiles).
 */
export const SIMPLE_ICON_KEYS = [
  'siExpo',
  'siReact',
  'siTypescript',
  'siNextdotjs',
  'siTailwindcss',
  'siReactquery',
  'siSocketdotio',
  'siWebrtc',
  'siSqlite',
  'siNestjs',
  'siFastapi',
  'siMysql',
  'siGooglegemini',
  'siOllama',
  'siMaplibre',
  'siStorybook',
  'siJest',
  'siGithubactions',
  'siVercel',
  'siGithub',
  'siClaudecode',
] as const;
export type SimpleIconKey = (typeof SIMPLE_ICON_KEYS)[number];

// ─── Routes ──────────────────────────────────────────────────────────────────────────────

/** A case-study page, optionally at one of its section anchors. */
export type CaseStudyPath = `/projects/${CaseStudySlug}` | `/projects/${CaseStudySlug}#${CaseStudySectionKey}`;
/**
 * Any internal link the content can hold. Plain `Route` covers static pages (with ?query or
 * #hash) but not dynamic ones, so case-study paths are added explicitly.
 */
export type SiteRoute = Route | Route<CaseStudyPath>;

// ─── Site, glyphs and profile ────────────────────────────────────────────────────────────

export type ToolGlyph =
  | { readonly kind: 'si'; readonly icon: SimpleIconKey }
  | { readonly kind: 'official'; readonly icon: 'linkedin' }
  | { readonly kind: 'monogram'; readonly text: string };
/** A social or contact mark: a brand glyph, or a UI icon (e.g. the email envelope). */
export type SocialGlyph = ToolGlyph | { readonly kind: 'icon'; readonly icon: IconName };

export interface Tool extends Meta {
  readonly id: string;
  readonly label: string;
  readonly glyph: ToolGlyph;
}

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: Route;
  readonly icon: IconName;
  /** 'prefix' keeps Projects active on /projects/[slug]. */
  readonly match: 'exact' | 'prefix';
}

export interface Site {
  /** Canonical origin for metadataBase and absolute URLs. */
  readonly url: string;
  readonly name: string;
  /** 'label' keeps the site noindex with no sitemap; switch to 'hide' to go public. */
  readonly placeholders: PlaceholderMode;
  /** The date every counted or store fact is "as of". */
  readonly asOf: ISODate;
  readonly copyrightYear: number;
  /** The template's seven nav items, in the template's order. */
  readonly nav: readonly NavItem[];
  readonly contactHref: Route;
}

export interface SocialLink {
  readonly id: 'github' | 'linkedin' | 'email';
  readonly label: string;
  readonly href: string;
  readonly glyph: SocialGlyph;
}

export interface Availability extends Meta {
  readonly status: 'open' | 'limited' | 'closed';
  readonly label: Field;
}

export interface Education extends Meta {
  readonly degree: string;
  readonly school: string;
  /** Short school name for tight spaces, e.g. "TCU". */
  readonly short: string;
  readonly year: Field;
}

export interface Profile extends Meta {
  readonly name: string;
  /** "@kiskue". */
  readonly handle: string;
  /** Positioning title; defaults to "Mobile & full-stack engineer" with a confirm note. */
  readonly title: Field;
  readonly location: string;
  readonly timezone: string;
  readonly email: string;
  readonly links: readonly SocialLink[];
  readonly availability: Availability;
  /** Contact line reply-time promise, e.g. ph('I reply within 1–2 business days'). */
  readonly replyTime: Field;
  /** null → label mode shows a "[[N]]+ years" placeholder stat; hide mode omits it. */
  readonly yearsOfExperience: number | null;
  /** null → label mode shows a non-link placeholder chip; hide mode omits it. */
  readonly cvUrl: string | null;
  /** null → no verified badge slot anywhere. */
  readonly verifiedCredentialUrl: string | null;
  readonly education: Education;
  readonly bio: readonly Field[];
  readonly portraitAlt: string;
}

/** A page header: H1 plus intro. */
export interface PageIntro {
  readonly title: string;
  readonly intro: Field;
  readonly eyebrow?: string;
}
export type PageKey = 'projects' | 'showcase' | 'services' | 'testimonials' | 'about' | 'contact' | 'not-found';

export type BentoArea = 'proj' | 'about' | 'ai' | 'live' | 'serv' | 'cred' | 'testi';
export interface BentoCardCopy {
  readonly title: string;
  readonly description: Field;
  readonly linkLabel?: string;
  /** Small print under the card body, e.g. the Live card's "from one white-label codebase". */
  readonly footnote?: Field;
}

export interface EmptyState {
  readonly title: string;
  readonly body?: Field;
  readonly cta?: { readonly label: string; readonly href: SiteRoute };
}

export interface HomeContent {
  /** The H1 as two block lines. */
  readonly headline: readonly [string, string];
  readonly subline: Field;
  readonly ctas: { readonly contact: string; readonly projects: string; readonly cv: string };
  readonly tools: { readonly eyebrow: string; readonly title: string };
  readonly cards: Readonly<Record<BentoArea, BentoCardCopy>>;
  readonly testimonialsEmpty: EmptyState;
}

// ─── Apps and brands ─────────────────────────────────────────────────────────────────────

export type AppIcon =
  | { readonly kind: 'image'; readonly src: AssetPath }
  | { readonly kind: 'monogram'; readonly text: string };

export interface AppInfo {
  readonly id: AppId;
  readonly name: string;
  readonly short: string;
  readonly caseStudy: CaseStudySlug;
  readonly context: ProjectContext;
  readonly icon: AppIcon;
  /** The Projects-card label chip, e.g. ['SME Panindio', 'Personal', 'private beta']. */
  readonly stageLabel: Segments;
  readonly distribution:
    | { readonly kind: 'stores' }
    | { readonly kind: 'private' | 'beta'; readonly label: string };
}

export type CitizenBrandId = 'smile-safe-taytay' | '1hope' | 'sjdm-app' | 'defensys-safe' | 'safe-icb' | 'aero-app';
export type ResponderBrandId = 'defensys' | 'smile-taytay' | 'sjdm' | 'bagong-pag-asa';
export type BrandId = CitizenBrandId | ResponderBrandId;

/**
 * Only these hues change per brand. Emergency, severity, status and call colours never do;
 * they live in each app's replica CSS.
 */
export interface BrandPalette {
  /** Brand fill: header tint, buttons, gradient start. */
  readonly primary: Hex;
  /** Second brand hue: gradient end; Responder header titles and hamburger. */
  readonly secondary: Hex;
  /** Brand hue for text, icons and focus rings (Citizen primaryAccent; Responder light accent). */
  readonly accent: Hex;
  /** Title ink in the brand hue (Citizen: primary; Responder: secondary, as shipped). */
  readonly titleInk: Hex;
  /** Light tint for text on dark imagery or gradients; brandVars falls back to secondary. */
  readonly lightText?: Hex;
}

/** What the Citizen replica header shows: the public store icon, or a wordmark. */
export type HeaderMark = { readonly kind: 'icon' } | { readonly kind: 'wordmark'; readonly text: string };

interface BrandBase<A extends 'citizen' | 'responder', Id extends BrandId> extends Meta {
  readonly id: Id;
  readonly app: A;
  /** Exactly as published (Citizen: the store name, e.g. "1Hope"). */
  readonly name: string;
  readonly locality: string;
  readonly palette: BrandPalette;
  /** The brand selected by default in switchers and replicas (one per app). */
  readonly isDefault?: true;
}

export interface CitizenBrand extends BrandBase<'citizen', CitizenBrandId> {
  /** The public store icon: /store/citizen/<brand>/play-icon.webp. Never a repo logo or seal. */
  readonly icon: AssetPath;
  readonly headerMark: HeaderMark;
}

export interface ResponderBrand extends BrandBase<'responder', ResponderBrandId> {
  /** Responder builds have no public store icon; the monogram stands in. */
  readonly icon: null;
  readonly monogram: string;
  readonly status: 'platform' | 'deployed' | 'in-setup';
  readonly tag?: Field;
}

export type Brand = CitizenBrand | ResponderBrand;

// ─── Store ───────────────────────────────────────────────────────────────────────────────

export type StorePlatform = 'play' | 'appstore';
export type StoreListingId = `${CitizenBrandId}.${StorePlatform}`;
/** A Google Play install band as published, e.g. "5K+". */
export type InstallBand = `${number}${'' | 'K' | 'M'}+`;

export interface StoreRating {
  readonly value: number;
  readonly count: number;
}

export interface StoreIcon {
  readonly src: AssetPath;
  readonly width: number;
  readonly height: number;
}

/** A real screenshot. `marketing` images (frame or text baked in) are never put inside a PhoneFrame. */
export interface ScreenImage {
  readonly src: AssetPath;
  readonly width: number;
  readonly height: number;
  /** Real alt text, always. */
  readonly alt: string;
  readonly provenance: 'play' | 'appstore' | 'device';
  readonly presentation: 'raw' | 'marketing';
}

export interface StoreListing {
  readonly id: StoreListingId;
  readonly brand: CitizenBrandId;
  readonly platform: StorePlatform;
  readonly name: string;
  readonly url: string;
  readonly publisher: string;
  /** Google Play only; App Store listings have no install band. */
  readonly installs: InstallBand | null;
  readonly rating: StoreRating | null;
  readonly asOf: ISODate;
  readonly icon: StoreIcon;
  readonly screenshots: readonly ScreenImage[];
}

/** Store facts computed in src/content/derived.ts (never hard-coded in copy or JSX). */
export interface StoreSummary {
  readonly listings: number;
  readonly play: number;
  readonly appstore: number;
  /** Brands with at least one public listing ("6 apps"). */
  readonly publicBrands: number;
  readonly screenshots: number;
  /** The highest install band that passes the display rule (≥1K), or null. */
  readonly topInstalls: {
    readonly listing: StoreListingId;
    readonly brand: CitizenBrandId;
    readonly installs: InstallBand;
  } | null;
  /** The most-reviewed rating that passes the display rule (≥5 ratings), or null. */
  readonly topRating: ({ readonly listing: StoreListingId; readonly brand: CitizenBrandId } & StoreRating) | null;
  readonly asOf: ISODate;
}

// ─── Figures, screens and glimpses ───────────────────────────────────────────────────────

export type SmeFigureId = `1.${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export type CitizenFigureId = `2.${1 | 2 | 3 | 4 | 5 | 6}`;
export type ResponderFigureId = `3.${1 | 2 | 3 | 4 | 5 | 6}`;
export type FigureId = SmeFigureId | CitizenFigureId | ResponderFigureId;

export interface Figure {
  readonly id: FigureId;
  readonly app: AppId;
  /** The research `signatureScreens` id this replica is built from. */
  readonly key: string;
  readonly title: string;
  /** The visible caption after "FIG <id>" (the UI adds the FIG label). */
  readonly caption: Field;
  /** Static accessible summary for the role="img" frame. */
  readonly summary: string;
  readonly purpose: Field;
  /** P0 replicas are built first. */
  readonly priority: 'P0' | 'P1';
  readonly theme: 'light' | 'dark';
  /** Status-bar glyph colour: 'light' glyphs sit on dark headers. */
  readonly statusBar: 'light' | 'dark';
  /** In-screen states; states[0] is the default (static) state. */
  readonly states: readonly [string, ...string[]];
  /** Whether brand colours re-skin this screen. */
  readonly brandable: boolean;
  readonly rollout?: Rollout;
}

export type ReplicaSource = {
  readonly kind: 'replica';
  readonly figure: FigureId;
  readonly state?: string;
  readonly brand?: BrandId;
};
export type ImageSource = { readonly kind: 'image'; readonly image: ScreenImage };
/** The only way a screen is specified: a coded replica or a real image, in one phone frame. */
export type ScreenSource = ReplicaSource | ImageSource;

export type ResolvedScreen =
  | { readonly kind: 'replica'; readonly figure: Figure; readonly state: string; readonly brand: Brand | null }
  | { readonly kind: 'image'; readonly image: ScreenImage };

export interface Tap {
  /** Logical px on the 390×844 canvas. */
  readonly x: number;
  readonly y: number;
  readonly atMs: number;
  readonly kind: 'tap' | 'hold';
  readonly holdMs?: number;
}

export interface GlimpseStep {
  readonly figure: FigureId;
  readonly state?: string;
  /** The state shown for reduced motion and no-JS. */
  readonly posterState?: string;
  readonly holdMs: number;
  readonly taps?: readonly Tap[];
  readonly caption?: Field;
}

export type GlimpseId = `home.${AppId}` | `hero.${CaseStudySlug}`;

export interface Glimpse {
  readonly id: GlimpseId;
  readonly app: AppId;
  /** Accessible label for the whole preview, e.g. "Preview of SME Panindio: … Fictional data." */
  readonly label: string;
  readonly steps: readonly [GlimpseStep, ...GlimpseStep[]];
  /** Index into `steps` shown for reduced motion and no-JS. */
  readonly posterStep: number;
  /** Home Citizen: Smile SAFE Taytay on loop 1, 1Hope on loop 2. */
  readonly brandRotation?: readonly CitizenBrandId[];
}

export type ShowcaseSourceKind = 'replica' | 'real';

interface ShowcaseEntryBase {
  readonly id: string;
  readonly app: AppId;
  readonly caseStudy: CaseStudySlug;
  readonly label: string;
}

/** One tile on the Showcase wall, with its facets. */
export type ShowcaseEntry =
  | (ShowcaseEntryBase & {
      readonly source: 'replica';
      readonly figure: Figure;
      readonly screen: ReplicaSource;
      /** Replicas are re-skinned by the surrounding BrandScope. */
      readonly brand: null;
    })
  | (ShowcaseEntryBase & {
      readonly source: 'real';
      readonly listing: StoreListing;
      /** 1-based position within the listing's screenshots. */
      readonly position: number;
      readonly screen: ImageSource;
      readonly brand: CitizenBrandId;
    });

// ─── Projects ────────────────────────────────────────────────────────────────────────────

export type Ownership = 'sole' | 'primary' | 'contributor' | 'collaborator' | 'rnd';

export type ProjectLink =
  | { readonly kind: 'case-study'; readonly slug: CaseStudySlug }
  /** `href` may be a whole placeholder token until confirmed: render a non-link chip (label mode) or nothing (hide). */
  | { readonly kind: 'repo' | 'site'; readonly href: Field; readonly label: Field }
  /** A Citizen listing from store-listings.json (the single source of store facts). */
  | { readonly kind: 'store'; readonly listing: StoreListingId }
  /** Any other public store page, e.g. Eventbook Exhibitors. */
  | { readonly kind: 'store-page'; readonly platform: StorePlatform; readonly href: string };

export interface Project extends Meta {
  readonly slug: string;
  readonly title: string;
  readonly summary: Field;
  readonly context: ProjectContext;
  /** Required (by test) when context is 'company' or 'client'. */
  readonly company?: Field;
  readonly role: Field;
  readonly ownership: Ownership;
  readonly types: readonly [ProjectType, ...ProjectType[]];
  readonly status: Status;
  readonly statusLabel: Field;
  readonly stack: readonly string[];
  readonly icon: IconName;
  readonly links: readonly ProjectLink[];
  readonly period?: Field;
  readonly caseStudy?: CaseStudySlug;
  readonly app?: AppId;
}

// ─── Case studies ────────────────────────────────────────────────────────────────────────

export interface Metric extends Meta {
  readonly id: string;
  readonly value: Field;
  readonly label: Field;
  /** Where the number comes from, e.g. "Counted in the app repository". */
  readonly source: Field;
  readonly asOf: ISODate;
}

export interface Feature {
  readonly id: string;
  readonly title: string;
  readonly body: Field;
  /** The static md phone beside the feature row. */
  readonly screen: ScreenSource;
  readonly rollout?: Rollout;
}

export interface Challenge extends Meta {
  readonly id: string;
  readonly title: string;
  readonly problem: Field;
  readonly did: Field;
  readonly proof: Field;
  /** Spans both columns. */
  readonly flagship?: true;
}

/** Diagram ownership styles: me = accent bar, team = dashed, external = sunken, prototype = dotted. */
export type FlowOwner = 'me' | 'team' | 'external' | 'prototype';

export interface FlowNode {
  readonly id: string;
  readonly label: string;
  readonly owner: FlowOwner;
  readonly detail?: Field;
  /** A short protocol label in mono. Never a host, port, path, id or header name. */
  readonly mono?: string;
  readonly faded?: true;
}

export interface FlowLane {
  readonly id: string;
  readonly title: string;
  readonly owner: FlowOwner;
  readonly nodes: readonly FlowNode[];
  readonly note?: Field;
}

export interface FlowConnector {
  readonly label: string;
  readonly mono?: string;
  readonly dashed?: true;
}

export interface FlowDiagram {
  readonly id: string;
  readonly title: string;
  readonly lanes: readonly [FlowLane, ...FlowLane[]];
  /** Exactly lanes.length - 1 (tested). */
  readonly connectors: readonly FlowConnector[];
  readonly returnStrip?: Field;
  readonly sideNote?: Field;
}

export type CaseStudySpecial =
  | {
      readonly kind: 'ai';
      readonly title: string;
      readonly figures: readonly FigureId[];
      readonly guardrails: readonly Field[];
      readonly diagram: FlowDiagram;
    }
  | { readonly kind: 'brands'; readonly app: 'citizen' | 'responder'; readonly caption: Field };

export interface CaseStudyGlance {
  readonly role: Segments;
  readonly context: Segments;
  readonly platforms: Segments;
  readonly stack: readonly string[];
  readonly status: Segments;
  readonly timeline: Field;
  readonly links: readonly ProjectLink[];
}

export interface CaseStudy extends Meta {
  readonly slug: CaseStudySlug;
  readonly app: AppId;
  readonly projectSlug: string;
  readonly eyebrow: Segments;
  readonly title: string;
  readonly summary: Field;
  readonly factLine?: Field;
  /** Ids of three entries in `metrics` (tested to resolve). */
  readonly heroStats: readonly [string, string, string];
  readonly hero: {
    readonly glimpse: GlimpseId;
    readonly flanks: readonly [ScreenSource, ScreenSource];
    readonly caption?: Field;
  };
  readonly glance: CaseStudyGlance;
  readonly problem: { readonly paragraphs: readonly Field[]; readonly constraints: readonly Field[] };
  /** Static feature rows, each with an md phone (no scrollytelling). */
  readonly features: readonly Feature[];
  readonly specials: readonly CaseStudySpecial[];
  /** The Screens grid. Real images (store or device) can sit beside replicas. */
  readonly screens: readonly ScreenSource[];
  readonly architecture: readonly FlowDiagram[];
  readonly challenges: readonly Challenge[];
  readonly metrics: readonly Metric[];
  /** Honest gaps, shown in Next. */
  readonly gaps: readonly Field[];
  /** The sections this case study renders, in page order. */
  readonly sections: readonly CaseStudySectionKey[];
}

// ─── Services, people and pages ──────────────────────────────────────────────────────────

export type ServiceId = 'mobile-apps' | 'white-label' | 'realtime' | 'offline-first' | 'grounded-ai';

export interface Service extends Meta {
  readonly id: ServiceId;
  readonly title: string;
  readonly short: string;
  readonly icon: IconName;
  readonly goodFit: readonly Field[];
  readonly deliverables: readonly Field[];
  readonly proof: { readonly slug: CaseStudySlug; readonly anchor?: CaseStudySectionKey };
  readonly stack: readonly string[];
  readonly engagement: Field;
}

export interface ProcessStep {
  readonly id: string;
  readonly title: string;
  readonly body: Field;
}

export interface Engagement extends Meta {
  readonly id: string;
  readonly title: string;
  readonly body: Field;
}

export interface Testimonial extends Meta {
  readonly id: string;
  readonly quote: Field;
  readonly name: Field;
  readonly role: Field;
  readonly tags: readonly string[];
  readonly project?: CaseStudySlug;
}

export interface Credential extends Meta {
  readonly id: string;
  readonly kind: 'degree' | 'certification';
  readonly title: Field;
  readonly issuer: Field;
  readonly year: Field;
  readonly url: string | null;
}

export interface AiBuild extends Meta {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly status: Status;
  readonly href: SiteRoute;
}

export interface Faq extends Meta {
  readonly id: string;
  readonly q: string;
  readonly a: Field;
}

export interface ExperienceEntry extends Meta {
  readonly id: string;
  readonly period: Field;
  readonly title: Field;
  readonly org: Field;
  readonly body: Field;
  /** Slugs from projects.ts (tested to resolve). */
  readonly projects: readonly string[];
  readonly highlights?: readonly Field[];
}

export interface SkillTier extends Meta {
  readonly depth: 'core' | 'production' | 'working';
  readonly label: string;
  readonly blurb: Field;
  readonly items: readonly string[];
}
