import type { Figure, FigureId } from '@/content/types';

/**
 * The 21 coded replica screens (design §5.2), each mapped to the research `signatureScreens`
 * entry it is built from. Captions follow design §5.3; the UI prefixes "FIG <id>".
 *
 * states[0] is the default (static) state. Replica screens type their `state` prop with
 * `FigureState<'2.3'>` so a renamed state fails the type check. All data shown is fictional.
 */
export const figures = [
  // ── SME Panindio (personal) ───────────────────────────────────────────────────────────
  {
    id: '1.1',
    app: 'sme',
    key: 'owner-dashboard',
    title: 'Owner dashboard',
    caption: 'Owner dashboard: real profit after COGS, waste and overhead',
    summary:
      'SME Panindio owner dashboard for one month: gross income, products sold, gross profit and cost-of-goods cards, in-store versus online sales, and a profit-and-loss summary that ends in net profit. Fictional data.',
    purpose:
      "The owner's daily command center. Period-navigable KPIs, the in-store versus online split, a full profit-and-loss summary, today's sales target and ROI health answer one question at a glance: am I actually making money?",
    priority: 'P0',
    theme: 'light',
    statusBar: 'light',
    states: ['kpis', 'pnl'],
    brandable: false,
  },
  {
    id: '1.2',
    app: 'sme',
    key: 'pos-checkout',
    title: 'Point of sale',
    caption: 'Point of sale: cash, GCash, Maya, card or utang',
    summary:
      'SME Panindio point of sale: a product grid with three items in the cart, then a checkout sheet with payment methods, cash tendered and change due, and finally a confirmed sale. Fictional data.',
    purpose:
      'Thumb-first selling. The owner taps or continuously scans products into a cart, then settles by cash, GCash, Maya, card or utang (store credit), with discounts, 12% VAT and change worked out. It works fully offline.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'light',
    states: ['grid', 'checkout', 'confirmed'],
    brandable: false,
  },
  {
    id: '1.3',
    app: 'sme',
    key: 'credit-ledger',
    title: 'Credit ledger',
    caption: 'Credit ledger: the utang notebook, ranked by who owes the most',
    summary:
      'SME Panindio credit ledger: the total due and advances held, filters for due, advance and fully paid customers, and customers ranked by amount owed with payment progress bars. Fictional data.',
    purpose:
      "Digitizes the sari-sari store's utang (store credit) notebook: who owes what and who has paid ahead, ranked by amount due, with give-credit, receive-payment and advance flows for each customer.",
    priority: 'P1',
    theme: 'light',
    statusBar: 'light',
    states: ['ledger'],
    brandable: false,
  },
  {
    id: '1.4',
    app: 'sme',
    key: 'customer-storefront',
    title: 'Suki storefront',
    caption: "Suki storefront: the shop's live catalog in a regular customer's pocket",
    summary:
      'SME Panindio customer storefront: a greeting, a prompt to verify for Pay Later, category chips and a two-column product grid, with a floating View Cart button. Fictional data.',
    purpose:
      "The suki (regular customer) shopping screen: search and filter the shop's live catalog, save favorites, add to cart with stock-aware steppers, and see the verification prompt that unlocks Pay Later.",
    priority: 'P1',
    theme: 'light',
    statusBar: 'light',
    states: ['storefront'],
    brandable: false,
  },
  {
    id: '1.5',
    app: 'sme',
    key: 'live-order-tracking',
    title: 'Live delivery tracking',
    caption: 'Live delivery: a road-snapped rider that never guesses ahead',
    summary:
      'SME Panindio delivery tracking: a map with the rider on a routed road path and an ETA chip, a rider card with a call button, and an order status timeline at Out for delivery. Fictional data.',
    purpose:
      'Shows the customer where their rider is in real time, and the owner sees the same map: a road-snapped bike marker, a routed ETA, a call button, a status timeline and the receipt as it stood at order time.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'light',
    states: ['tracking', 'expanded'],
    brandable: false,
  },
  {
    id: '1.6',
    app: 'sme',
    key: 'ai-hub-insight-report',
    title: 'AI insight and report',
    caption: 'AI insight: the phone does the math, the model writes the words',
    summary:
      'SME Panindio AI assistant in dark mode: a business insight card that upgrades a computed summary to an AI-written paragraph, and a business report card with a Generate report button. Fictional data.',
    purpose:
      "The owner's first view of the AI hub: a computed summary line that always works offline and can be upgraded to an AI-written paragraph, plus an executive-summary report on demand.",
    priority: 'P0',
    theme: 'dark',
    statusBar: 'light',
    states: ['enhanced', 'idle', 'enhancing'],
    brandable: false,
  },
  {
    id: '1.7',
    app: 'sme',
    key: 'ai-hub-restock-forecast',
    title: 'Restock advisor and sales forecast',
    caption: 'Restock and forecast: on-device math drawn as data, narrated on demand',
    summary:
      'SME Panindio AI assistant in dark mode: low and out-of-stock items with suggested reorder amounts, and a sales chart whose dashed line projects the next two weeks, with average daily revenue and trend tiles. Fictional data.',
    purpose:
      'The hybrid pattern: deterministic math on the phone (reorder quantities, a least-squares projection) is drawn as data, and the model narrates the result only when asked.',
    priority: 'P1',
    theme: 'dark',
    statusBar: 'light',
    states: ['restock', 'forecast'],
    brandable: false,
  },
  {
    id: '1.8',
    app: 'sme',
    key: 'ai-chat-sheet',
    title: 'Ask about your business',
    caption: "Ask AI: grounded answers, and a plain no when the data isn't there",
    summary:
      "SME Panindio AI chat sheet in dark mode: suggested questions, then a short thread where the assistant answers from the shop's own figures and declines to guess a number it does not have. Fictional data.",
    purpose:
      'Conversational questions over a snapshot of the whole business: suggestion chips, grounded answers, and a rule that the AI declines when the data is missing.',
    priority: 'P1',
    theme: 'dark',
    statusBar: 'light',
    states: ['thread', 'empty', 'offline'],
    brandable: false,
  },
  {
    id: '1.9',
    app: 'sme',
    key: 'roi-ai-insight-risk',
    title: 'ROI insight with risk badge',
    caption: 'ROI insight: rule-based risk first, AI wording second',
    summary:
      'SME Panindio business ROI insight in dark mode: a Medium Risk badge, an insight sentence computed from ROI and payback, and an Ask AI about this button. Fictional data.',
    purpose:
      'Rule-based risk detection (low, medium or high) around an insight the model can rewrite on request, plus the way into a chat scoped to ROI.',
    priority: 'P1',
    theme: 'dark',
    statusBar: 'light',
    states: ['medium', 'low', 'high'],
    brandable: false,
  },

  // ── Defensys Citizen (company, DGSI) ──────────────────────────────────────────────────
  {
    id: '2.1',
    app: 'citizen',
    key: 'home-dashboard',
    title: 'Home dashboard',
    caption: "Home: the LGU's live weather station and AI safety brief",
    summary:
      'Defensys Citizen home screen: a live weather station card with temperature, humidity, wind and a heat index bar at Extreme Caution, then the Defensight safety brief with an English and Filipino toggle, above the floating tab bar with the SOS button. Fictional data.',
    purpose:
      "The citizen's situational-awareness dashboard: live readings from the LGU's sensors with the official PAGASA and DENR bands, plus an AI safety brief grounded in those bands.",
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['top', 'brief'],
    brandable: true,
  },
  {
    id: '2.2',
    app: 'citizen',
    key: 'home-feed',
    title: 'Home feed',
    caption: "Home feed: the LGU's announcements, today's hazards and recent quakes",
    summary:
      "Defensys Citizen home feed: brand-colored section headers for online services, an announcement carousel, today's hazard report, an earthquake monitor and news headlines. Fictional data.",
    purpose:
      "The LGU's content stream on Home: announcements and news from the command center, plus today's hazards and recent earthquakes.",
    priority: 'P1',
    theme: 'light',
    statusBar: 'dark',
    states: ['feed'],
    brandable: true,
  },
  {
    id: '2.3',
    app: 'citizen',
    key: 'sos-countdown',
    title: 'SOS countdown',
    caption: 'SOS: one tap, then a 5-second countdown you can cancel',
    summary:
      'Defensys Citizen SOS: the red SOS button docked in the floating tab bar, then an Emergency Call confirmation counting down from 5 seconds, with Cancel and Confirm Call buttons. Fictional data.',
    purpose:
      'The core emergency interaction: a large, always-reachable SOS control, and a short countdown that gives the citizen time to cancel an accidental tap before the call starts.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['idle', 'countdown', 'offline'],
    brandable: true,
  },
  {
    id: '2.4',
    app: 'citizen',
    key: 'live-call',
    title: 'Live video call',
    caption: 'Video call: queue position, then the dispatcher',
    summary:
      'Defensys Citizen emergency call: a status pill and a card showing the caller is number 2 in the dispatcher queue, then Connected to Dispatcher 07 with mute, speaker, camera and end-call controls over an abstract video background. Fictional data.',
    purpose:
      'The queue-to-connected journey of an SOS call: a live queue position, the assigned dispatcher, then two-way video with call controls.',
    priority: 'P0',
    theme: 'dark',
    statusBar: 'light',
    states: ['queue', 'calling', 'connected'],
    brandable: false,
  },
  {
    id: '2.5',
    app: 'citizen',
    key: 'hazard-map',
    title: 'Hazard map',
    caption: "Hazards: what's near you, pinned to your location",
    summary:
      "Defensys Citizen hazards: a list of nearby hazard reports with distance and time, and a map that pins a flood report next to the citizen's location with a 1.2 km distance chip. Fictional data.",
    purpose:
      "Hyper-local hazard awareness: a filterable hazard feed with distances, and a map that pins each hazard against the citizen's own location.",
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['map', 'list'],
    brandable: true,
  },
  {
    id: '2.6',
    app: 'citizen',
    key: 'report-incident',
    title: 'Report incident',
    caption: 'Report: location attached automatically, sent to the command center',
    summary:
      'Defensys Citizen incident report form: a live map with the current location and coordinates, case type, injury status, a description, evidence photo buttons and a Submit Report button. Fictional data.',
    purpose:
      "A non-emergency incident report: the citizen's location is attached automatically, then the case type, injury status, description and photos go to the command center.",
    priority: 'P1',
    theme: 'light',
    statusBar: 'dark',
    states: ['form'],
    brandable: true,
  },

  // ── Defensys Responder (company, DGSI) ────────────────────────────────────────────────
  {
    id: '3.1',
    app: 'responder',
    key: 'emergency-map-online',
    title: 'Emergency map, on duty',
    caption: 'On duty: one switch makes a responder dispatchable',
    summary:
      "Defensys Responder emergency map: a duty chip switched to You're Online, the responder's vehicle and seat, a heading puck on the map with fellow responders nearby, and Report, Offline Respond and Call shortcuts. Fictional data.",
    purpose:
      'The home screen for a shift: live position, fellow responders, and the duty switch that makes the responder dispatchable.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['online', 'offline', 'connecting'],
    brandable: true,
  },
  {
    id: '3.2',
    app: 'responder',
    key: 'incoming-dispatch',
    title: 'Incoming dispatch',
    caption: 'Dispatch: siren, auto-open map, accept or decline',
    summary:
      'Defensys Responder incoming dispatch: a New Emergency sheet for a fire with a live chip, map and chat shortcuts, the distance to the scene, the incident details and agent note, and Decline and Accept buttons. Fictional data.',
    purpose:
      'The moment the command center assigns an incident: a siren, an automatic jump to the map, and an accept or decline decision.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['sheet', 'toast'],
    brandable: false,
  },
  {
    id: '3.3',
    app: 'responder',
    key: 'navigate-to-incident',
    title: 'Navigate to incident',
    caption: 'En route: a road ETA and zones that count down to on-site',
    summary:
      'Defensys Responder navigation: a tilted map with the road route and an ETA of 6 minutes over 2.4 km, and a distance card that counts down from 1,240 m (far) to 18 m (on site) as the footer switches from Arrive to Resolve. Fictional data.',
    purpose:
      'Driving to the scene with a road route and ETA while dispatch watches. Arrival is recorded automatically near the scene, or by tapping Arrive.',
    priority: 'P0',
    theme: 'light',
    statusBar: 'dark',
    states: ['far', 'near', 'on-site'],
    brandable: true,
  },
  {
    id: '3.4',
    app: 'responder',
    key: 'video-call-command-center',
    title: 'Video call with the command center',
    caption: 'Video call: the command center can ring any on-duty responder',
    summary:
      'Defensys Responder incoming video call from a command center agent: a monogram avatar, the ticket the call is about, and Decline and Answer buttons on a dark call screen. Fictional data.',
    purpose:
      'Dispatch can ring any on-duty responder face to face, and the responder can call their department or the next available agent.',
    priority: 'P0',
    theme: 'dark',
    statusBar: 'light',
    states: ['incoming', 'connected', 'room'],
    brandable: false,
  },
  {
    id: '3.5',
    app: 'responder',
    key: 'ptt-channel',
    title: 'Channels: push-to-talk',
    caption: 'Channels: hold to talk, transcribed in English or Tagalog',
    summary:
      'Defensys Responder team channel: messages from teammates, an own voice note with its transcript and language chip, an urgent message and a mention, and a composer with a hold-to-talk mic. Fictional data.',
    purpose:
      'A radio replacement for departments and teams: tap to type, hold to talk, and see each clip transcribed. Urgent messages and mentions break through mute.',
    priority: 'P1',
    theme: 'light',
    statusBar: 'dark',
    states: ['thread', 'recording'],
    brandable: true,
    rollout: 'in-rollout',
  },
  {
    id: '3.6',
    app: 'responder',
    key: 'incident-report-form',
    title: 'Incident report form',
    caption: 'Field report: GPS location, type, injuries and photos in one form',
    summary:
      'Defensys Responder emergency ticket form: a live map with the current address and coordinates, emergency type, injury type and a description, above a Create button; the photo tiles follow below the fold. Fictional data.',
    purpose: 'Filing a new incident from the field with the GPS location, type, injury flag, description and photos.',
    priority: 'P1',
    theme: 'light',
    statusBar: 'dark',
    states: ['form'],
    brandable: true,
  },
] as const satisfies readonly Figure[];

export type FigureEntry = (typeof figures)[number];

/** The state union of one figure, e.g. FigureState<'2.3'> = 'idle' | 'countdown' | 'offline'. */
export type FigureState<Id extends FigureId> = Extract<FigureEntry, { readonly id: Id }>['states'][number];
