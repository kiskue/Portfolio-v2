/**
 * The replica kit (architecture D4): hook-free Server Components shared by the SME, Citizen and
 * Responder replicas. Styles live in src/styles/replica.css.
 *
 * Rules for every part and every replica built from them:
 * - Markup is div, span and svg only: no button, input, link, image or heading, because a
 *   replica is an inert picture (role="img" on the frame) and a phone may sit inside a link.
 * - Class names start with rx- (app CSS: rx-<app>-*). Lucide glyphs stand in for Ionicons, and
 *   they are ALWAYS drawn through RGlyph, or passed to a kit prop typed `icon: LucideIcon`; both
 *   render plain server-side SVG. Rendering a lucide-react component as JSX (`<Bell />`) would
 *   make each glyph a client component that hydrates; tests/unit/glyphs.test.ts fails on it.
 * - Sizes are logical px on the 390×844 canvas. Colours come from props (hex from the app's
 *   palette is fine in replica code), from rBrand (the --app-* brand bridge with the app's
 *   default brand as fallback) or from rToken (the base tokens RCanvas sets per app and theme).
 * - All data is fictional (research sampleData). No real names, numbers, hosts or ids.
 *
 * MOTION CONTRACT (src/styles/replica.css has the full text):
 * 1. Animations run only inside an ancestor with [data-active] (the glimpse player sets it on
 *    the playing step). Times (atMs, startMs) count from the moment it appears; adding it
 *    restarts everything, removing it snaps back to the poster.
 * 2. An ancestor with [data-paused] freezes them (animation-play-state: paused).
 * 3. Not active, html[data-motion="reduce"], or prefers-reduced-motion with no data-motion on
 *    <html>: no animation, and the poster shows (RStateSequence posterFrame, the full
 *    RTypewriter text, RAutoScroll at its poster offset, pulses and rings at rest).
 * 4. Rules 2 and 3 are enforced in CSS for everything inside .rx-canvas; app CSS only declares
 *    its animations under `[data-active] …` selectors.
 * 5. Replica markup never uses data-active, data-paused or data-next itself (selected = data-on).
 *
 * Parts by module:
 * - canvas: RCanvas · glyph: RGlyph · layout: RStack, RText, RDivider · bars: RAppBar, RTabBar
 * - surfaces: RCard, RListRow, RKpiTile
 * - controls: RButton, RGlassButton, RPill, RIconChip, RSegmented, RCountBadge
 * - fields: RField, RSearchField, RStepper · meters: RProgress, RSegmentBar, RVTimeline
 * - people: RAvatar, RAvatarStack · chat: RBubble, RWaveform (+ waveformHeights)
 * - overlays: RBottomSheet, RModalCard, RToast · call: RCallBackdrop
 * - motion: RStateSequence, RTypewriter, RAutoScroll, RSpinner, RRipple, RLoadingDots
 * - map-canvas, map-scenes, charts (W6): RMapCanvas, MapPin, MapRouteKey, RLineChart, RBarPairs
 * - pending-replica: PendingReplica · tokens: R_CANVAS, rBrand, rToken, rTint, px, pickState
 */
export * from './bars';
export * from './call';
export * from './canvas';
export * from './charts';
export * from './chat';
export * from './controls';
export * from './fields';
export * from './glyph';
export * from './layout';
export * from './map-canvas';
export * from './map-scenes';
export * from './meters';
export * from './motion';
export * from './overlays';
export * from './pending-replica';
export * from './people';
export * from './surfaces';
export * from './tokens';
export * from './types';
