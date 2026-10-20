import type { FigureState } from '@/content/apps/figures';
import type { CaseStudy, CitizenBrandId, CitizenFigureId, FlowDiagram, ReplicaSource } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Defensys Citizen (company work, DGSI). Public-safe by construction: no endpoints, hosts,
 * ids, header or key names, and no internal incident stories. The store figures are facts
 * about the app as of 2026-10-19, never personal results; tests/unit/case-studies.test.ts
 * checks them against the store data and pins the binding claims (PLAN.md, review.md).
 */

const AS_OF = '2026-10-19';

const V1_HISTORY =
  "A fact about the app that includes the v1 app's history: keep it framed that way unless your v1 involvement is confirmed.";

/** A Citizen replica. figures.ts and brands.ts type-check the state and the brand. */
function replica<Id extends CitizenFigureId>(figure: Id, state?: FigureState<Id>, brand?: CitizenBrandId): ReplicaSource {
  return { kind: 'replica', figure, ...(state === undefined ? {} : { state }), ...(brand === undefined ? {} : { brand }) };
}

/**
 * The platform both Defensys apps plug into. The Command Center and the API are the DGSI
 * team's; the Responder case study reuses this diagram.
 */
export const defensysEcosystem: FlowDiagram = {
  id: 'defensys-ecosystem',
  title: 'The Defensys ecosystem',
  lanes: [
    {
      id: 'citizens',
      title: 'Citizens',
      owner: 'me',
      nodes: [
        { id: 'citizen-app', label: 'Citizen app', owner: 'me', detail: 'Six public brands from one white-label codebase.' },
        {
          id: 'citizen-web',
          label: 'Citizen Web (Bagong Pag-asa)',
          owner: 'me',
          detail: 'I contributed the Sumbong (citizen complaints) module and the rebrand.',
        },
      ],
    },
    {
      id: 'platform',
      title: 'Platform core',
      owner: 'team',
      nodes: [
        {
          id: 'api',
          label: 'Defensys API',
          owner: 'team',
          detail: 'Built by the DGSI team. I added the AI weather safety brief and facility-suggestion endpoints.',
        },
        { id: 'command-center', label: 'Command Center web console', owner: 'team', detail: 'Built by the DGSI team.' },
      ],
    },
    {
      id: 'field',
      title: 'Field',
      owner: 'me',
      nodes: [
        {
          id: 'responder-app',
          label: 'Responder app',
          owner: 'me',
          detail: 'Dispatch, navigation, location and calls in one white-label app.',
        },
        {
          id: 'ptt-hardware',
          label: 'Hardware push-to-talk',
          owner: 'prototype',
          detail: 'R&D: reading the push-to-talk keys of rugged Android radios.',
        },
      ],
    },
  ],
  connectors: [
    {
      label: 'SOS video calls through the dispatcher queue · tickets and chat · hazards and news',
      mono: 'WebRTC · Socket.IO',
    },
    { label: 'Dispatch assignments · live location · incident room and push-to-talk', mono: 'Socket.IO · push · WebRTC' },
  ],
  sideNote: 'Citizens and responders who call the command center join the same agent queue.',
};

const whiteLabelPipeline: FlowDiagram = {
  id: 'citizen-white-label',
  title: 'One codebase, many store apps',
  lanes: [
    {
      id: 'brand',
      title: 'Build input',
      owner: 'me',
      nodes: [{ id: 'brand-key', label: 'Brand key', owner: 'me', detail: 'Picks one of the 8 configured brands at build time.' }],
    },
    {
      id: 'config',
      title: 'Build-time config',
      owner: 'me',
      nodes: [
        { id: 'app-config', label: 'app.config.ts', owner: 'me', detail: 'Name, app IDs, icons and splash for the brand.' },
        {
          id: 'brand-colors',
          label: 'brandColors.js',
          owner: 'me',
          detail: 'Light and dark palettes, baked into Tailwind and read by the runtime theme.',
        },
      ],
    },
    {
      id: 'ci',
      title: 'EAS Workflows',
      owner: 'me',
      nodes: [
        {
          id: 'fingerprint',
          label: 'Native fingerprint check',
          owner: 'me',
          detail: 'Is there already a production build with the same native layer?',
        },
        { id: 'ota-update', label: 'Same fingerprint', owner: 'me', detail: 'Publish an over-the-air update.' },
        {
          id: 'store-build',
          label: 'New fingerprint',
          owner: 'me',
          detail: 'Build and submit. A re-run rebuilds only the platform that failed.',
        },
      ],
    },
    {
      id: 'stores',
      title: 'Stores',
      owner: 'external',
      nodes: [
        { id: 'google-play', label: 'Google Play', owner: 'external', detail: 'Published by Dynamic Global Soft Inc.' },
        { id: 'app-store', label: 'App Store', owner: 'external', detail: "Published under the LGUs' own accounts." },
      ],
    },
  ],
  connectors: [
    { label: 'Read by both config files at build time' },
    { label: "Push to the brand's production branch" },
    { label: 'A store build or an over-the-air update' },
  ],
  sideNote: 'Four brands are wired to these release workflows so far. A manual workflow builds development clients for any of the 8 brands.',
};

export const defensysCitizen: CaseStudy = {
  slug: 'defensys-citizen',
  app: 'citizen',
  projectSlug: 'defensys-citizen',
  eyebrow: ['Company', 'Dynamic Global Soft Inc.', 'Live on the stores'],
  title: 'Defensys Citizen',
  summary:
    'One white-label React Native app that ships as six public-safety apps for Philippine local governments: one-tap SOS video calls to the command center, geotagged reports and live hazard alerts.',
  factLine:
    "Smile SAFE Taytay, the Municipality of Taytay's brand, launched publicly on March 27, 2025, before the app moved to one white-label codebase.",
  heroStats: ['brands-configured', 'store-listings', 'feature-flags'],
  hero: {
    glimpse: 'hero.defensys-citizen',
    flanks: [replica('2.1', 'top', '1hope'), replica('2.1', 'top', 'sjdm-app')],
    caption: 'One codebase, six public brands.',
  },
  glance: {
    role: [
      ph('Your title at DGSI'),
      'I build and maintain the mobile app, one white-label codebase',
      'Integrates with the Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints',
    ],
    context: ['Company work', 'Dynamic Global Soft Inc. (DGSI)'],
    platforms: ['iOS and Android', 'Expo SDK 55', 'React Native 0.83', 'TypeScript'],
    stack: ['TypeScript', 'Expo Router', 'NativeWind', 'TanStack Query', 'Zustand', 'Socket.IO', 'WebRTC', 'expo-maps', 'EAS Workflows'],
    status: ['6 on Google Play', '2 on the App Store', 'App Store listings published under LGU accounts'],
    timeline: ph('YYYY – present'),
    /*
     * The default brand's listings (design §5.5: store links for the selected brand only), as text
     * links from store-listings.json, never official badges (PLAN). The #brands section lists the rest.
     */
    links: [
      { kind: 'store', listing: 'smile-safe-taytay.play' },
      { kind: 'store', listing: 'smile-safe-taytay.appstore' },
    ],
  },
  confirm:
    "Confirm before launch: your DGSI title and start date; whether you worked on the v1 apps (2024–25), because the Taytay launch, installs and rating partly predate the white-label rewrite; Citizen Web's status and public URL (it is not called live anywhere yet); and DGSI approval to show the replicas, diagrams and store assets.",
  problem: {
    paragraphs: [
      'Philippine local governments that run a Defensys command center need a citizen app that does two jobs: put a resident straight through to dispatch with an SOS video call or a geotagged report, and give them a local picture of hazards, earthquakes, weather and air quality.',
      'Each LGU (local government unit) wants the app under its own name, icon, colors and store listing, without a separate codebase per city. Many of the people using it are older residents, often on patchy mobile data.',
    ],
    constraints: [
      'One codebase, many LGU brands',
      'SOS works on weak signal, with or without a location fix',
      'Accessible for older residents: readable contrast and reduced motion',
    ],
  },
  features: [
    {
      id: 'sos',
      title: 'One-tap SOS with a cancellable countdown',
      body: 'An 80 dp SOS button docks on the tab bar. A pre-flight check covers connectivity, account approval, camera and microphone permission and a second signed-in phone, then a 5-second countdown gives the resident time to cancel an accidental tap.',
      screen: replica('2.3', 'countdown'),
    },
    {
      id: 'video-call',
      title: 'A video call through the dispatcher queue',
      body: "The caller joins the command center's dispatcher queue and watches their place in it update live, then sees the dispatcher's call sign as the call connects. Mute, speaker and camera flip are one tap away, Android gets picture-in-picture, and a failed camera falls back to audio only.",
      screen: replica('2.4', 'queue'),
    },
    {
      id: 'reports',
      title: 'Geotagged reports and chat',
      body: 'A report attaches the live map pin, address and coordinates, then the case type, injuries, a description and photos. Tickets move through Pending, Ongoing and Resolved, and an ongoing ticket opens a chat thread with the command center.',
      screen: replica('2.6', 'form'),
    },
    {
      id: 'hazards',
      title: 'Hazards, quakes and live sensors',
      body: "A hazard feed filtered by type shows distance and age, and each hazard opens on a map next to the resident's location. Home adds an earthquake monitor and the LGU's own weather and air-quality stations, banded to the official PAGASA heat-index and DENR air-quality thresholds.",
      screen: replica('2.5', 'map'),
    },
    {
      id: 'safety-brief',
      title: 'Defensight Safety Brief',
      body: 'A bilingual safety brief (English and Filipino) written on the server and grounded in DOST-PAGASA and DENR thresholds, with tips, a disclaimer and an "Ask about conditions" chat. It refetches only when the readings actually change. I added its endpoint to the API built by the DGSI team, and built its card in the app.',
      screen: replica('2.1', 'brief'),
    },
    {
      id: 'live-flags',
      title: 'Live feature flags that never hide SOS',
      body: "The command center switches 11 modules on, off, to maintenance or to coming soon, and the change arrives live over the socket. SOS hides only when a feature list confirmed in the current session turns it off, and offline the button stays pressable so it can explain what's wrong.",
      screen: replica('2.3', 'offline'),
    },
    {
      id: 'brands',
      title: 'One codebase, six public brands',
      body: "One build-time brand key sets each build's name, app IDs, icon, splash and light and dark palettes. Brand colors re-skin headers, tabs and buttons; emergency, severity and status colors never change.",
      screen: replica('2.2', 'feed', '1hope'),
    },
  ],
  specials: [
    {
      kind: 'brands',
      app: 'citizen',
      caption: 'Brand colors re-skin headers, tabs and buttons. Emergency colors never change, by design.',
    },
  ],
  screens: [
    replica('2.1'),
    replica('2.2'),
    replica('2.3'),
    replica('2.4', 'connected'),
    replica('2.5'),
    replica('2.6'),
  ],
  architecture: [whiteLabelPipeline, defensysEcosystem],
  challenges: [
    {
      id: 'sos-reliable',
      title: 'Keeping SOS reliable on flaky networks and live flags',
      problem:
        'Feature flags can flip in the middle of an emergency, and a stale feature list or an offline launch could hide the only way to reach a dispatcher. An earlier design that required location before SOS also did not pass an app store review.',
      did: 'SOS fails open: it hides only when a feature list confirmed in the current session turns it off, and its flag is held steady through the pre-flight check, the countdown and the call. Offline, the button stays pressable so it can explain the problem. Location is optional everywhere, and there is no idle animation, which saves battery and avoids vestibular triggers.',
      proof: 'SOS now starts without a location fix, and a call falls back to audio only if the camera fails.',
      flagship: true,
    },
    {
      id: 'native-modal-handoff',
      title: 'The iOS native-modal handoff',
      problem:
        'iOS presents one native modal at a time. Showing the call while the countdown was still animating out left a stuck backdrop, and the call screen rendered blank on its first show.',
      did: "The call engine starts at confirm, so the socket, the queue registration and the camera warm-up overlap the close animation. The call is presented from the modal's dismiss callback on iOS and at the end of the animation on Android, with a timed fallback, and the call modal mounts hidden, then turns visible on the next frame.",
      proof: 'The call screen now follows the countdown on both platforms, with a timed fallback on iOS in case the dismiss callback never fires.',
    },
    {
      id: 'dispatch-queue',
      title: 'Moving SOS calls from PeerJS and Firebase to the dispatch queue',
      problem:
        'The old call engine lived inside the call modal, so opening any other modal mid-SOS killed the call, and with no agents online the caller waited in silence.',
      did: "One app-level owner opens a dedicated socket per call and joins the dispatcher queue that runs in the DGSI team's API, so leaving the call dequeues the caller without touching the app socket. The screen shows the queue position, ICE candidates wait for the remote description, and a watchdog offers a report as a fallback without cancelling the call.",
      proof: 'Released on Google Play as "Emergency calling, rebuilt": SOS joins the dispatcher queue, with call auto-recovery and a ringing tone.',
    },
    {
      id: 'accessible-color',
      title: 'Accessible color across white-label palettes',
      problem:
        'The 1Hope amber measures 2.42:1 and the SJDM App pink 3.16:1 on white, the default dark primary is 1.34:1 on its own surface, and NativeWind freezes the light palette at build time.',
      did: 'Every brand pairs its fill with an accent shade tuned to at least 4.5:1 for text and small graphics, a runtime check corrects the active tab label, and dark-aware surfaces use inline styles. Emergency, error and severity colors are identical in every brand, so they stay a learned signal.',
      proof: 'Text in 1Hope and SJDM App uses the darker accent shades, and each token module records its measured ratios next to the values.',
    },
    {
      id: 'two-phones',
      title: 'One account on two phones',
      problem:
        'The duplicate-session signal is ambiguous: a reconnecting phone can see its own stale "ghost" connection for up to about 45 seconds, and two phones can lock each other out.',
      did: 'An import-free decision module uses a ghost window, a confirmation probe through a fresh reconnect, an incumbency latch and a bias toward failing open. SOS and report submission are guarded on the second phone.',
      proof: 'The second phone shows "Your account is open on another phone" instead of locking both residents out.',
    },
  ],
  metrics: [
    {
      id: 'brands-configured',
      value: '8',
      label: 'brands configured in one white-label codebase',
      source: 'Counted in the white-label brand registry',
      asOf: AS_OF,
    },
    {
      id: 'store-listings',
      value: '6 + 2',
      label: 'store listings: Google Play + App Store',
      source: 'Google Play and App Store listings',
      asOf: AS_OF,
    },
    {
      id: 'taytay-installs',
      value: '5K+',
      label: 'Google Play installs of Smile SAFE Taytay',
      source: 'Google Play listing',
      asOf: AS_OF,
      confirm: V1_HISTORY,
    },
    {
      id: 'taytay-rating',
      value: '4.2',
      label: 'Google Play rating of Smile SAFE Taytay, from 27 ratings',
      source: 'Google Play listing',
      asOf: AS_OF,
      confirm: V1_HISTORY,
    },
    {
      id: 'feature-flags',
      value: '11',
      label: 'server-controlled feature flags, switched live',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'eas-workflows',
      value: '17',
      label: 'EAS workflow files for per-brand releases',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'contract-assertions',
      value: '~750',
      label: 'assertions in a dependency-free contract-test harness',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    { id: 'routed-screens', value: '24', label: 'routed screens', source: 'Counted in the app repository', asOf: AS_OF },
  ],
  gaps: [
    'SAFE ICB and AERO App still use the default Defensys palette, and their release workflows are not wired up yet.',
    "Public alerts from the command center aren't in the citizen app yet; responders already see them.",
  ],
  sections: ['overview', 'problem', 'built', 'brands', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
