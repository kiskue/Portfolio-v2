import type { FigureState } from '@/content/apps/figures';
import type { CaseStudy, FlowDiagram, ReplicaSource, ResponderBrandId, ResponderFigureId } from '@/content/types';
import { ph } from '@/lib/placeholder';
import { defensysEcosystem } from './defensys-citizen';

/**
 * Defensys Responder (company work, DGSI). Privately distributed, so there are no store links
 * anywhere. Per-brand status lives in apps/brands.ts (Defensys platform build; Smile Taytay and
 * SJDM to confirm; Bagong Pag-asa in setup); the deployment line here is product level only.
 */

const AS_OF = '2026-10-19';

/** A Responder replica. figures.ts and brands.ts type-check the state and the brand. */
function replica<Id extends ResponderFigureId>(figure: Id, state?: FigureState<Id>, brand?: ResponderBrandId): ReplicaSource {
  return { kind: 'replica', figure, ...(state === undefined ? {} : { state }), ...(brand === undefined ? {} : { brand }) };
}

const locationPipeline: FlowDiagram = {
  id: 'responder-location',
  title: 'Location pipeline',
  lanes: [
    {
      id: 'phone',
      title: 'Phone',
      owner: 'me',
      nodes: [
        {
          id: 'location-manager',
          label: 'One location manager',
          owner: 'me',
          detail: 'Owns GPS for the whole app, replacing three separate watchers.',
        },
        { id: 'capture', label: 'Capture every 5 s or 10 m', owner: 'me', detail: 'Feeds the map and the 20 m auto-arrive.' },
        { id: 'upload', label: 'Upload every 60 s or after 100 m', owner: 'me', detail: 'A heartbeat keeps a parked iPhone fresh.' },
        { id: 'backlog', label: 'Durable offline backlog', owner: 'me', detail: 'Up to 1,000 fixes, with a drop counter.' },
        { id: 'background', label: 'Background task', owner: 'me', detail: 'Runs as an Android foreground service.' },
      ],
      note: 'Live positions go out as volatile events, so a stale packet is never replayed as current.',
    },
    {
      id: 'api',
      title: 'Defensys API',
      owner: 'team',
      nodes: [{ id: 'presence', label: 'Presence and location', owner: 'team', detail: 'Built by the DGSI team.' }],
    },
    {
      id: 'command-center',
      title: 'Command Center',
      owner: 'team',
      nodes: [{ id: 'live-map', label: 'Live responder map', owner: 'team', detail: 'Built by the DGSI team.' }],
    },
  ],
  connectors: [
    { label: 'Online: live position · offline: batch flush on reconnect', mono: 'Socket.IO · REST' },
    { label: 'Live responder positions', mono: 'Socket.IO' },
  ],
  sideNote:
    'A connection banner names the state (stable, unstable or no connection) and what is queued: "Saving your location offline", then "Syncing location history…".',
};

export const defensysResponder: CaseStudy = {
  slug: 'defensys-responder',
  app: 'responder',
  projectSlug: 'defensys-responder',
  eyebrow: ['Company', 'DGSI', 'Private distribution'],
  title: 'Defensys Responder',
  summary:
    'The field app for LGU emergency responders: live dispatch, road navigation, push-to-talk and video with the command center, built to keep working on patchy signal.',
  factLine:
    "The Smile Taytay build keeps the legacy Taytay responder app's Android app ID, so it can update v1.4.0 installs in place to v2.5.17.",
  heroStats: ['realtime-events', 'notification-channels', 'offline-fixes'],
  hero: {
    glimpse: 'hero.defensys-responder',
    flanks: [replica('3.4'), replica('3.6')],
    caption: 'Dispatch, navigation and comms on one phone.',
  },
  glance: {
    role: [
      ph('Your title at DGSI'),
      'I built the white-label app',
      'Integrates with the Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints',
    ],
    context: ['Company work', 'Dynamic Global Soft Inc. (DGSI)'],
    platforms: ['iOS and Android', 'Expo SDK 55', 'React Native 0.83 (New Architecture)', 'TypeScript'],
    stack: ['TypeScript', 'Expo Router', 'NativeWind', 'Socket.IO', 'WebRTC', 'expo-location', 'expo-sqlite', 'TanStack Query', 'Zustand', 'zod'],
    status: ['Private distribution', 'deployed to LGU responder teams'],
    timeline: ph('YYYY – present'),
    links: [],
  },
  confirm:
    'Confirm before launch: your DGSI title and start date; whether the legacy Taytay responder app (v1.4.0) has actually been replaced in place on responders\' phones by the Smile Taytay build (v2.5.17), because the fact line only says the build can do it (if it has, it can say "upgraded in place"); the product-level line "deployed to LGU responder teams"; that Channels is live for at least one LGU before it is featured (it stays labelled "in rollout"); and DGSI approval to show the replicas and diagrams.',
  problem: {
    paragraphs: [
      'LGU (local government unit) command centers need every on-duty responder visible on a live map, reachable at once, and moving each incident through a clear lifecycle: accept, arrive, resolve.',
      'Before this app, each locality ran its own forked build on PeerJS and Firebase. Responders work from vehicles, in direct sun and often with gloves, on mobile data that drops in and out.',
    ],
    constraints: [
      'Readable in sunlight, usable with gloves',
      'Keeps working on patchy signal and offline',
      'One codebase for every LGU brand',
    ],
  },
  features: [
    {
      id: 'duty',
      title: 'Duty switch and live presence',
      body: 'One switch in the header makes a responder dispatchable: it opens the authenticated realtime session and starts sharing location. The map shows a heading-aware puck, fellow responders and the boarded vehicle, and public alerts from the command center run as a strip under the header.',
      screen: replica('3.1', 'online'),
    },
    {
      id: 'dispatch',
      title: 'Dispatch that cuts through',
      body: "An assignment arrives over the socket and by push with a siren, and the app jumps to the map from any screen. A sheet that can't be dismissed drives the ticket from accept or decline (with remarks) to arrive and resolve, with up to 5 photos.",
      screen: replica('3.2', 'sheet'),
    },
    {
      id: 'navigation',
      title: 'Road navigation with proximity zones',
      body: 'A road route and ETA, colored by proximity zone (far, close, near, on site) as a distance card counts down. The position snaps onto the road, a new route is requested only after straying more than 100 m, and arrival records itself within 20 m.',
      screen: replica('3.3', 'near'),
    },
    {
      id: 'dead-zones',
      title: 'Built for dead zones',
      body: 'Location keeps flowing from a background task, and when the connection drops, fixes queue in a durable backlog that flushes in batches on reconnect. Offline Respond stamps response, arrival and resolve times into on-device SQLite to sync later.',
      screen: replica('3.1', 'offline'),
    },
    {
      id: 'calls',
      title: 'Video calls and the incident room',
      body: "Dispatch can ring any on-duty responder on any screen, and responders can call their department or the next available agent. Joining an accepted ticket's room adds live video, hold-to-speak push-to-talk and an activity log of on-device transcripts.",
      screen: replica('3.4', 'room'),
    },
    {
      id: 'channels',
      title: 'Channels: hold to talk, transcribed',
      body: 'Department and team channels carry text, photos and hold-to-talk voice notes, which the server transcribes in English or Tagalog. Urgent messages and mentions break through mute with their own sound. Channels is in rollout: screen sharing, drawing and reactions are not yet verified on devices.',
      screen: replica('3.5', 'recording'),
      rollout: 'in-rollout',
    },
    {
      id: 'facility-referral',
      title: 'Facility referral, AI-ranked',
      body: "Once a responder arrives, nearby facilities are ranked by road time and then reordered by what the patient needs, through the facility-suggestion endpoint I added to the API. Each offers Call to confirm, Ask dispatch and Directions. The app side is still in progress.",
      screen: replica('3.3', 'on-site'),
      rollout: 'in-progress',
    },
  ],
  specials: [
    {
      kind: 'brands',
      app: 'responder',
      caption:
        'One codebase builds four brands, plus a demo build. Brand colors re-skin headers, buttons, own chat bubbles and the map puck; the dispatch sheet, call screens and emergency colors never change, by design. Every build is distributed privately, with no public store listing.',
    },
  ],
  screens: [replica('3.1'), replica('3.2'), replica('3.3'), replica('3.4'), replica('3.5'), replica('3.6')],
  architecture: [defensysEcosystem, locationPipeline],
  challenges: [
    {
      id: 'chat-vs-dispatch',
      title: 'A chat ping must never sound like a dispatch',
      problem:
        "Once an Android notification channel exists, its sound and vibration can't be changed, and background pushes for unknown channels fall back to the app's default channel, which was the dispatch siren.",
      did: 'I set up six purpose-built channels with bundled alert sounds and vibration patterns, and moved the default to chat. Each channel is created in its own try/catch so one failure cannot cost the push token, and a development check flags channels stuck on the system tone.',
      proof: 'Six notification channels: the dispatch siren, chat, vehicle, urgent, mention and public alerts.',
      flagship: true,
    },
    {
      id: 'calls-one-screen',
      title: 'Calls that only rang on one screen',
      problem:
        'The call engine lived inside a dialog mounted only on the map. A dispatcher calling a responder who was in Chats or Tickets got a silent timeout, and a reflexive Back press while ringing hung up on dispatch.',
      did: 'I moved the engine into a call host mounted beside the drawer, so calls ring on every screen in their own native window. Ringtones follow the call state, Back no longer hangs up, Answer and Decline ignore taps for the first 500 ms, and Answer (80 dp) is deliberately larger than Decline (68 dp).',
      proof: 'The same always-mounted pattern now carries ticket auto-navigation, closeouts and channel alerts.',
    },
    {
      id: 'live-position',
      title: 'Accurate live position without stale ghosts',
      problem:
        'Three screens ran their own GPS watchers, iOS ignores the time interval, uploads went out every 5 seconds, packets queued on a half-open socket were later replayed as current positions, and fixes taken offline were lost.',
      did: 'One location manager now owns GPS. It captures every 5 s or 10 m for the UI but uploads every 60 s or after 100 m, sends live positions as volatile events, and drains a durable backlog in batches from both the app and the background task.',
      proof: 'One GPS owner instead of three watchers, and up to 1,000 offline fixes kept instead of lost.',
    },
    {
      id: 'routing-budget',
      title: 'Road routing on a free, rate-limited service',
      problem:
        'Requesting a route on every GPS fix would break the limits of the free public routing service and redraw the whole native route line each time.',
      did: "The route request is tied to a snapshot of the starting position that only moves when the responder strays more than 100 m from the drawn line. A separate HTTP client never sends the responder's token, responses are validated with zod, and any failure falls back to a straight geodesic line.",
      proof: 'A whole fleet stays inside the free tier, and positions snap onto the road within 15–40 m depending on GPS accuracy.',
    },
    {
      id: 'heading-puck',
      title: "A heading-aware puck on a map whose markers can't rotate",
      problem:
        'The native map markers cannot rotate, and one combined marker array re-sent up to 50 other-responder pins to the native map on every GPS fix.',
      did: 'I draw the responder as an SVG layer over the map: projected to its screen position in the flat view, or pinned at a fixed screen point in tilted 3D navigation. Incident and peer markers are cached separately, and a peer drops off after 150 s without an update.',
      proof: 'The puck turns with the heading and takes the shape of a person, motorcycle or van to match the boarded vehicle, and a GPS fix no longer re-sends every marker to the native map.',
    },
    {
      id: 'sunlight-gloves',
      title: 'Readable in sunlight, usable with gloves',
      problem:
        'Muted theme text measured about 2.96:1, form labels about 1.9:1, one brand green fell below 3:1, and small targets were hard to hit with gloves.',
      did: 'I moved colors into bundles that record their measured contrast in the source, gave Bagong Pag-asa a darker text green, set a 12 px type floor in Channels and forms, and sized controls for gloved hands.',
      proof: 'Fields are 52 dp tall, buttons and list rows 56 dp, and animations have reduced-motion fallbacks.',
    },
  ],
  metrics: [
    {
      id: 'brands',
      value: '4',
      label: 'brands from one codebase, plus a demo build',
      source: 'Counted in the white-label brand registry',
      asOf: AS_OF,
    },
    {
      id: 'realtime-events',
      value: '48 + 28',
      label: 'realtime event types, inbound + outbound',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'notification-channels',
      value: '6',
      label: 'Android notification channels, with 5 bundled alert sounds',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'auto-arrive',
      value: '≤20 m',
      label: 'auto-arrive radius, when GPS accuracy is 35 m or better',
      source: 'Set in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'reroute',
      value: '>100 m',
      label: 'off the drawn route before a new route is requested',
      source: 'Set in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'offline-fixes',
      value: '≤1,000',
      label: 'location fixes buffered offline',
      source: 'Set in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'typescript-files',
      value: '527',
      label: 'TypeScript files, about 112k lines',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'contract-docs',
      value: '15',
      label: 'cross-repo contract docs',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
  ],
  gaps: [
    'Channels screen sharing, drawing, reactions and attachments are code complete but not yet run on a device, and channel calls are still unverified on two phones.',
    'Facility referral: the ranking endpoint exists on the server, and the app side is in progress.',
    'Live feature flags are code complete but not yet tested on a device.',
    'The Bagong Pag-asa brand is still in setup and shares the default artwork.',
    'Hardware push-to-talk on rugged radios is still an R&D prototype.',
  ],
  sections: ['overview', 'problem', 'built', 'brands', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
