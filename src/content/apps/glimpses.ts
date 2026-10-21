import type { Glimpse, GlimpseStep, Tap } from '@/content/types';

/*
 * Glimpse sequences (design §5.3, PLAN "Glimpse player"). The player is
 * src/components/showcase/glimpse.tsx; its sequencing rules are src/lib/glimpse.ts.
 *
 * Home: exactly 3 steps per app, in the PLAN's order (tests/unit/content.invariants.test.ts):
 * SME 1.1 → 1.2 → 1.6, Citizen 2.1 → 2.3 → 2.4 (loop 1 Smile SAFE Taytay, loop 2 1Hope),
 * Responder 3.1 → 3.2 → 3.3. Case-study heroes (`hero.<slug>`) add one more key screen each;
 * their flank phones show the rest.
 *
 * Contract for each step (the replicas follow the motion contract in src/styles/replica.css):
 * - `state` is rendered with [data-active] for `holdMs`, and its in-screen animation plays the
 *   step's story. Two kinds of replica state exist:
 *   - a start state that animates toward a different `posterState` (1.2 grid → confirmed,
 *     1.6 idle → enhanced, 2.3 idle → countdown, 2.4 queue → connected, 2.5 list → map);
 *   - an animated state whose static render IS its final frame, so `posterState` is the same
 *     state (Responder 3.1 online, 3.2 toast, 3.3 on-site, 3.5 thread: the replicas'
 *     "*_TIMELINE" constants in responder/parts/timeline.ts). Such a poster step needs no
 *     separate poster tree, which keeps the Home trio inside its DOM budget.
 * - `posterState` is the static state shown for reduced motion, without JavaScript, before
 *   playback starts and after it ends ("its final coherent state", e.g. 3.3 at 18 m · ON SITE).
 * - `taps` are logical px on the 390×844 canvas, MEASURED on the replicas (the builders'
 *   reports), not design §5.3's estimates. A ring appears at `atMs`, scales in over 180 ms and
 *   fades over 270 ms, so `atMs` is the screen's reaction time minus 180 ms: the ring lands
 *   exactly when the screen reacts. A hold keeps its ring for holdMs, until the release.
 * - `caption` is the FIG line's text (the player adds "FIG <id>"); it matches the figure's
 *   caption in figures.ts (tests/unit/glimpse-data.test.ts), and the player appends the brand
 *   name on rotating skins and an "In rollout" note for figures that are not fully shipped.
 * All data shown is fictional.
 */

/** A ring lands (fully scaled in) this long after its atMs; the screen reacts at that moment. */
const TAP_LANDS_MS = 180;

/** A ring fades out over this long after it lands (a hold first keeps it for holdMs). */
const TAP_FADES_MS = 270;

/** A tap whose ring lands when the screen reacts at `reactsAtMs` (ms after the step starts). */
function tapAt(x: number, y: number, reactsAtMs: number): Tap {
  return { x, y, atMs: reactsAtMs - TAP_LANDS_MS, kind: 'tap' };
}

/** 3.2's hold: its ACCEPT tap is answered by the next step (3.3, en route) when the hold ends. */
const DISPATCH_HOLD_MS = 3000;

// ─── Steps shared by Home and the case-study heroes ─────────────────────────────────────

const SME_DASHBOARD: GlimpseStep = {
  figure: '1.1',
  state: 'kpis',
  posterState: 'kpis',
  holdMs: 3200, // auto-scroll −320px over 1.6s from +0.8s: KPI grid to the P&L card
  caption: 'Owner dashboard: real profit after COGS, waste and overhead',
};

const SME_POS: GlimpseStep = {
  figure: '1.2',
  state: 'grid',
  posterState: 'confirmed',
  holdMs: 4400, // grid 1.4s, then the checkout sheet 3.0s (Cash, "Change: ₱190.00", Sale Confirmed!)
  taps: [
    tapAt(251, 804, 1400), // Checkout (button centre): the checkout sheet fades in at 1.4 s
    tapAt(195, 781, 3000), // Confirm Sale (button y 753.6–808): "Sale Confirmed!" at 3.0 s
  ],
  caption: 'Point of sale: cash, GCash, Maya, card or utang',
};

const SME_AI: GlimpseStep = {
  figure: '1.6',
  state: 'idle',
  posterState: 'enhanced',
  holdMs: 3800, // "Enhancing…" 0.4–1.0s, the paragraph types out until about 2.8s, then rest
  taps: [tapAt(298, 179, 400)], // Enhance with AI (pill centre): "Enhancing…" at 0.4 s (ENHANCE_TIMING)
  caption: 'AI insight: the phone does the math, the model writes the words',
};

const SME_LEDGER: GlimpseStep = {
  figure: '1.3',
  state: 'ledger',
  posterState: 'ledger',
  holdMs: 3000,
  caption: 'Credit ledger: the utang notebook, ranked by who owes the most',
};

const CITIZEN_HOME: GlimpseStep = {
  figure: '2.1',
  state: 'top',
  posterState: 'top',
  holdMs: 3200, // auto-scroll −260px from the station hero to the Safety Brief (0.8–2.4s)
  caption: "Home: the LGU's live weather station and AI safety brief",
};

const CITIZEN_SOS: GlimpseStep = {
  figure: '2.3',
  state: 'idle',
  posterState: 'countdown',
  holdMs: 3700, // Home 0.9s, then the countdown modal (5 → 3, bar 1 → .6); ends about 3.58s
  taps: [
    tapAt(195, 752, 900), // SOS (centre of the docked button): pressed at 0.9 s, the popup at 1.0 s
    tapAt(273, 542, 3300), // Confirm Call (button centre): pressed at 3.3 s
  ],
  caption: 'SOS: one tap, then a 5-second countdown you can cancel',
};

const CITIZEN_CALL: GlimpseStep = {
  figure: '2.4',
  state: 'queue',
  posterState: 'connected',
  holdMs: 3000, // "You are now #2 in queue" crossfades to "Connected to Dispatcher 07" at 1.5s
  caption: 'Video call: queue position, then the dispatcher',
};

const CITIZEN_HAZARDS: GlimpseStep = {
  figure: '2.5',
  state: 'list',
  posterState: 'map',
  holdMs: 3800, // the hazard list, the map modal slides up 1.32–1.74s, its card rises 1.7–2.08s
  taps: [tapAt(195, 276, 1200)], // the Flood card (centre): tap feedback at 1.2 s
  caption: "Hazards: what's near you, pinned to your location",
};

const RESPONDER_DUTY: GlimpseStep = {
  figure: '3.1',
  state: 'online',
  posterState: 'online',
  holdMs: 2800, // "You're Offline" → "Connecting…" (amber, 0.6–1.0s) → "You're Online" (DUTY_TIMELINE)
  taps: [tapAt(351, 72, 600)], // the duty switch (centre): it flips at 0.6 s
  caption: 'On duty: one switch makes a responder dispatchable',
};

const RESPONDER_DISPATCH: GlimpseStep = {
  figure: '3.2',
  state: 'toast',
  posterState: 'toast',
  holdMs: DISPATCH_HOLD_MS, // the "New ticket assigned" toast at 0, the sheet rises to 50% (0.5–0.92s): NEW EMERGENCY
  // ACCEPT (button centre). No in-screen reaction: the next step (3.3) answers it, so the ring
  // lands as late as it can while still fading out inside this step.
  taps: [tapAt(289, 807, DISPATCH_HOLD_MS - TAP_FADES_MS)],
  caption: 'Dispatch: siren, auto-open map, accept or decline',
};

const RESPONDER_ROUTE: GlimpseStep = {
  figure: '3.3',
  state: 'on-site',
  posterState: 'on-site',
  holdMs: 3600, // 1,240 m FAR → 80 m NEAR (1.2s) → 18 m ON SITE (2.4s); ADD UPDATE / RESOLVE at 2.7s (NAV_TIMELINE)
  caption: 'En route: a road ETA and zones that count down to on-site',
};

const RESPONDER_CHANNELS: GlimpseStep = {
  figure: '3.5',
  state: 'thread',
  posterState: 'thread',
  holdMs: 3400, // hold the mic 0.6–1.8s ("● 0:07 · Slide to cancel"); the own voice note lands 1.9–2.26s (PTT_TIMELINE)
  taps: [{ ...tapAt(356, 806, 600), kind: 'hold', holdMs: 1200 }], // the mic (centre): held at 0.6 s, released at 1.8 s
  caption: 'Channels: hold to talk, transcribed in English or Tagalog',
};

// ─── Glimpses ─────────────────────────────────────────────────────────────────────────────

export const glimpses: readonly Glimpse[] = [
  {
    id: 'home.sme',
    app: 'sme',
    label: 'Preview of SME Panindio: owner dashboard, point of sale and AI insight. Fictional data.',
    steps: [SME_DASHBOARD, SME_POS, SME_AI],
    posterStep: 0,
  },
  {
    id: 'home.citizen',
    app: 'citizen',
    label: 'Preview of Defensys Citizen: home dashboard, SOS countdown and video call. Fictional data.',
    steps: [CITIZEN_HOME, CITIZEN_SOS, CITIZEN_CALL],
    posterStep: 0,
    brandRotation: ['smile-safe-taytay', '1hope'],
  },
  {
    id: 'home.responder',
    app: 'responder',
    label: 'Preview of Defensys Responder: duty switch, incoming dispatch and navigation. Fictional data.',
    steps: [RESPONDER_DUTY, RESPONDER_DISPATCH, RESPONDER_ROUTE],
    posterStep: 0,
  },
  {
    id: 'hero.sme-panindio',
    app: 'sme',
    label: 'Preview of SME Panindio: owner dashboard, point of sale, credit ledger and AI insight. Fictional data.',
    steps: [SME_DASHBOARD, SME_POS, SME_LEDGER, SME_AI],
    posterStep: 0,
  },
  {
    id: 'hero.defensys-citizen',
    app: 'citizen',
    label: 'Preview of Defensys Citizen: home dashboard, SOS countdown, video call and hazard map. Fictional data.',
    steps: [CITIZEN_HOME, CITIZEN_SOS, CITIZEN_CALL, CITIZEN_HAZARDS],
    posterStep: 0,
  },
  {
    id: 'hero.defensys-responder',
    app: 'responder',
    label:
      'Preview of Defensys Responder: duty switch, incoming dispatch, navigation and push-to-talk channels. Fictional data.',
    steps: [RESPONDER_DUTY, RESPONDER_DISPATCH, RESPONDER_ROUTE, RESPONDER_CHANNELS],
    posterStep: 0,
  },
];
