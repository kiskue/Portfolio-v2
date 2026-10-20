import type { Glimpse, GlimpseStep } from '@/content/types';

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
 * - `state` is rendered with [data-active] for `holdMs`. Its in-screen animation (RStateSequence,
 *   RTypewriter, RAutoScroll) runs from `state` toward `posterState`, timed so the screen reacts
 *   about 180 ms after a tap's `atMs` (the tap ring has then fully scaled in).
 * - `posterState` is the static state shown for reduced motion, without JavaScript, before
 *   playback starts and after it ends ("its final coherent state", e.g. 3.3 at 18 m · ON SITE).
 * - `taps` are in logical px on the 390×844 canvas (design §5.3); a hold keeps its ring for holdMs.
 * - `caption` is the FIG line's text (the player adds "FIG <id>"); it matches the figure's
 *   caption in figures.ts (tests/unit/glimpse-data.test.ts), and the player appends the brand
 *   name on rotating skins and an "In rollout" note for figures that are not fully shipped.
 * All data shown is fictional.
 */

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
    { x: 262, y: 806, atMs: 1200, kind: 'tap' }, // Checkout
    { x: 195, y: 812, atMs: 2900, kind: 'tap' }, // Confirm Sale
  ],
  caption: 'Point of sale: cash, GCash, Maya, card or utang',
};

const SME_AI: GlimpseStep = {
  figure: '1.6',
  state: 'idle',
  posterState: 'enhanced',
  holdMs: 3800, // "Enhancing…" 0.6s, typewriter 1.8s, then "AI-generated"
  taps: [{ x: 300, y: 168, atMs: 600, kind: 'tap' }], // Enhance with AI
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
  holdMs: 3200, // auto-scroll −260px from the station hero to the Safety Brief
  caption: "Home: the LGU's live weather station and AI safety brief",
};

const CITIZEN_SOS: GlimpseStep = {
  figure: '2.3',
  state: 'idle',
  posterState: 'countdown',
  holdMs: 3700, // Home 0.9s, then the countdown modal 2.8s (5 → 3, bar 1 → .6)
  taps: [
    { x: 195, y: 768, atMs: 700, kind: 'tap' }, // SOS
    { x: 276, y: 590, atMs: 3200, kind: 'tap' }, // Confirm Call
  ],
  caption: 'SOS: one tap, then a 5-second countdown you can cancel',
};

const CITIZEN_CALL: GlimpseStep = {
  figure: '2.4',
  state: 'queue',
  posterState: 'connected',
  holdMs: 3000, // "You are now #2 in queue" crossfades to "Connected to Dispatcher 07"
  caption: 'Video call: queue position, then the dispatcher',
};

const CITIZEN_HAZARDS: GlimpseStep = {
  figure: '2.5',
  state: 'list',
  posterState: 'map',
  holdMs: 3800, // the hazard list 1.2s, then the map with the flood and "Your Location" pins 2.6s
  taps: [{ x: 195, y: 250, atMs: 1000, kind: 'tap' }], // Flood
  caption: "Hazards: what's near you, pinned to your location",
};

const RESPONDER_DUTY: GlimpseStep = {
  figure: '3.1',
  state: 'offline',
  posterState: 'online',
  holdMs: 2800, // "You're Offline" → "Connecting…" (amber, 0.4s) → "You're Online" (green)
  taps: [{ x: 352, y: 74, atMs: 500, kind: 'tap' }], // the duty switch
  caption: 'On duty: one switch makes a responder dispatchable',
};

const RESPONDER_DISPATCH: GlimpseStep = {
  figure: '3.2',
  state: 'toast',
  posterState: 'sheet',
  holdMs: 3000, // the "New ticket assigned" toast, then the sheet rises to 50%: NEW EMERGENCY · FIRE
  taps: [{ x: 292, y: 806, atMs: 2400, kind: 'tap' }], // ACCEPT
  caption: 'Dispatch: siren, auto-open map, accept or decline',
};

const RESPONDER_ROUTE: GlimpseStep = {
  figure: '3.3',
  state: 'far',
  posterState: 'on-site',
  holdMs: 3600, // ETA "6 min · 2.4 km"; 1,240 → 80 → 18 m, FAR → NEAR → ON SITE; footer to ADD UPDATE / RESOLVE
  caption: 'En route: a road ETA and zones that count down to on-site',
};

const RESPONDER_CHANNELS: GlimpseStep = {
  figure: '3.5',
  state: 'recording',
  posterState: 'thread',
  holdMs: 3400, // hold the mic 1.2s ("● 0:07 · Slide to cancel"); release: own voice bubble, transcript, "English" chip
  taps: [{ x: 360, y: 806, atMs: 300, kind: 'hold', holdMs: 1200 }], // the mic
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
