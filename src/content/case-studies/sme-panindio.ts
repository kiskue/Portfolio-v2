import type { FigureState } from '@/content/apps/figures';
import type { CaseStudy, FlowDiagram, ReplicaSource, SmeFigureId } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * SME Panindio (personal product, private beta, no store links). The AI pipeline is public-safe:
 * no endpoints, hosts, ports, key or header names and no rate-limit values, and nothing that
 * places the product on anyone else's infrastructure. The fallback provider's wording waits for
 * the owner's confirmation (see `confirm`). Every number traces to the sme-app and sme-ai
 * research dossiers, counted on 2026-10-19.
 */

const AS_OF = '2026-10-19';

/** An SME replica (never re-skinned by brand). figures.ts type-checks the state. */
function replica<Id extends SmeFigureId>(figure: Id, state?: FigureState<Id>): ReplicaSource {
  return { kind: 'replica', figure, ...(state === undefined ? {} : { state }) };
}

const aiPipeline: FlowDiagram = {
  id: 'sme-ai-pipeline',
  title: 'SME AI pipeline',
  lanes: [
    {
      id: 'phone',
      title: 'Phone · SME Panindio app',
      owner: 'me',
      nodes: [
        { id: 'sqlite', label: 'On-device SQLite', owner: 'me', detail: 'Sales, stock, expenses and online orders.' },
        {
          id: 'math',
          label: 'Deterministic math',
          owner: 'me',
          detail: 'P&L, ROI and risk class, restock quantities and a least-squares forecast.',
        },
        { id: 'snapshot', label: 'Financial snapshot', owner: 'me', detail: 'Kind, coverage, metrics, series and caveat notes.' },
      ],
      note: 'Offline? A computed sentence always shows; AI only enhances it.',
    },
    {
      id: 'server',
      title: 'SME server · NestJS 10',
      owner: 'me',
      nodes: [
        { id: 'jwt-guard', label: 'JWT guard', owner: 'me', detail: 'Only the signed-in owner gets through.' },
        { id: 'rate-limiting', label: 'Rate limiting', owner: 'me' },
        { id: 'validation', label: 'Request validation', owner: 'me' },
        { id: 'forward', label: 'Forward to the AI service', owner: 'me', detail: 'Holds no model keys and stores nothing.' },
        { id: 'mysql', label: 'MySQL 8', owner: 'me', faded: true, detail: 'Off the AI path: no AI data is stored.' },
        {
          id: 'other-modules',
          label: 'Realtime and delivery modules',
          owner: 'me',
          faded: true,
          detail: 'Socket.IO events and OpenRouteService distances stay off the AI path.',
        },
      ],
    },
    {
      id: 'ai-service',
      title: 'AI service · FastAPI',
      owner: 'me',
      nodes: [
        { id: 'service-auth', label: 'Service authentication', owner: 'me', detail: 'Constant-time, and it fails closed.' },
        { id: 'size-caps', label: 'Validation and size caps', owner: 'me' },
        {
          id: 'prompt',
          label: 'Grounded prompt by kind',
          owner: 'me',
          detail: 'Sanitize the question, pick the prompt, render the snapshot.',
        },
        {
          id: 'fallback',
          label: 'Fallback provider',
          owner: 'me',
          detail: 'Switches only on quota, billing or provider errors, inside one shared time budget.',
        },
      ],
    },
    {
      id: 'providers',
      title: 'Model providers',
      owner: 'external',
      nodes: [
        { id: 'gemini', label: 'Google Gemini', owner: 'external', detail: 'Primary model.' },
        {
          id: 'ollama',
          label: 'Open-weights fallback via Ollama',
          owner: 'external',
          detail: 'Answers when the primary is out of quota or failing.',
        },
        {
          id: 'other-providers',
          label: 'OpenAI · Anthropic · OpenRouter',
          owner: 'external',
          faded: true,
          detail: 'Swappable with one setting; business logic never changes.',
        },
      ],
    },
  ],
  connectors: [
    { label: 'Signed in as the owner', mono: 'HTTPS · JWT' },
    { label: 'Private, authenticated link' },
    { label: 'Primary first; fallback on quota or provider errors' },
  ],
  returnStrip:
    'Back to the phone: the answer and the provider that wrote it. Failures map to offline, unavailable or server errors, and the computed sentence stays on screen.',
};

const system: FlowDiagram = {
  id: 'sme-system',
  title: 'One binary, one server',
  lanes: [
    {
      id: 'phone',
      title: 'Phone · one binary',
      owner: 'me',
      nodes: [
        { id: 'owner', label: 'Owner', owner: 'me', detail: 'POS, stock, utang and P&L in on-device SQLite.' },
        { id: 'customer', label: 'Suki customer', owner: 'me', detail: 'Storefront, orders and live tracking.' },
        {
          id: 'rider',
          label: 'Rider',
          owner: 'me',
          detail: 'Deliveries and 3D navigation, with location from a foreground service.',
        },
      ],
      note: "The owner's POS and books work fully offline.",
    },
    {
      id: 'server',
      title: 'SME server · NestJS 10 + MySQL 8',
      owner: 'me',
      nodes: [
        { id: 'auth', label: 'Sign-in for three personas', owner: 'me', detail: 'Owner JWTs, plus customer and rider sessions.' },
        { id: 'orders', label: 'Orders and delivery fees', owner: 'me', detail: 'Priced on the server in integer centavos.' },
        { id: 'gateway', label: 'Realtime gateway', owner: 'me', detail: 'Riders only ever join their own room.' },
        { id: 'backup', label: 'Backup and restore', owner: 'me', detail: 'Staged, then committed in one transaction.' },
        { id: 'ai-proxy', label: 'AI proxy', owner: 'me', detail: 'Forwards AI requests to the AI service.' },
      ],
    },
    {
      id: 'routing',
      title: 'Routing',
      owner: 'external',
      nodes: [
        {
          id: 'openrouteservice',
          label: 'OpenRouteService',
          owner: 'external',
          detail: 'Road distances for fees, cached, with a haversine estimate when it is unavailable.',
        },
      ],
    },
  ],
  connectors: [
    { label: 'Each persona has its own session and realtime connection', mono: 'HTTPS · Socket.IO' },
    { label: 'Road distances for delivery fees, from the server only', mono: 'HTTPS' },
  ],
  sideNote: 'Route lines (OSRM) and the navigation basemap (OpenFreeMap) load straight from the phone, with no keys.',
};

const backup: FlowDiagram = {
  id: 'sme-backup',
  title: 'Backup and restore',
  lanes: [
    {
      id: 'phone-backup',
      title: 'Phone · backup',
      owner: 'me',
      nodes: [
        { id: 'outbox', label: 'Change capture', owner: 'me', detail: 'SQLite triggers write every change to an outbox.' },
        { id: 'wal-snapshot', label: 'WAL snapshot with a watermark', owner: 'me', detail: 'The POS keeps selling during a backup.' },
        {
          id: 'chunks',
          label: 'Chunk planner',
          owner: 'me',
          detail: 'At most 1 MiB or 2,000 rows a chunk, halved when the server says it is too large.',
        },
      ],
    },
    {
      id: 'server',
      title: 'SME server · NestJS 10 + MySQL 8',
      owner: 'me',
      nodes: [
        { id: 'staging', label: 'Staged upload', owner: 'me', detail: 'Resumable and idempotent.' },
        {
          id: 'commit',
          label: 'One generation-checked transaction',
          owner: 'me',
          detail: 'Row counts are verified afterward, with one resync batch if they differ.',
        },
      ],
    },
    {
      id: 'phone-restore',
      title: 'Phone · restore',
      owner: 'me',
      nodes: [
        { id: 'restore-staging', label: 'Resumable staging database', owner: 'me', detail: 'Restore downloads page by page.' },
        {
          id: 'apply',
          label: 'One SQLite transaction',
          owner: 'me',
          detail: 'Local writers pause, so a failed restore leaves the phone untouched.',
        },
      ],
    },
  ],
  connectors: [
    { label: 'Idempotent chunks, one in flight, with backoff', mono: 'HTTPS' },
    { label: 'Restore pages', mono: 'HTTPS' },
  ],
  sideNote:
    'The app and the server pin the protocol to the same fixtures, and a model-based property test proves the server converges to the device state.',
};

export const smePanindio: CaseStudy = {
  slug: 'sme-panindio',
  app: 'sme',
  projectSlug: 'sme-panindio',
  eyebrow: ['Personal product', 'Private beta'],
  title: 'SME Panindio',
  summary:
    'An offline-first business OS for Filipino micro-businesses: POS, inventory, an utang (store credit) ledger and real profit, with a suki storefront and a rider app in the same binary.',
  heroStats: ['route-screens', 'personas', 'ai-endpoints'],
  hero: {
    glimpse: 'hero.sme-panindio',
    flanks: [replica('1.4'), replica('1.5')],
    caption: 'One binary, three personas.',
  },
  glance: {
    role: ['Solo', 'product, design, mobile, backend and AI'],
    context: ['Personal product', 'for Filipino micro-businesses'],
    platforms: ['iOS and Android', 'Expo SDK 54', 'React Native 0.81 (New Architecture)', 'tablet POS layouts', 'English and Tagalog'],
    stack: [
      'TypeScript (strict)',
      'Expo Router',
      'Zustand',
      'expo-sqlite',
      'Socket.IO',
      'NestJS 10',
      'MySQL 8',
      'FastAPI',
      'MapLibre',
      'i18next',
    ],
    status: ['Private beta', 'not on public stores yet'],
    // From git (first commit Dec 2025), as on the Projects card and the About timeline; confirm below.
    timeline: 'Dec 2025 – present',
    links: [{ kind: 'repo', href: ph('Repo URL, if public'), label: 'Source code' }],
  },
  confirm:
    'Confirm before launch: the timeline (the git history starts in December 2025); whether the repository can be linked or stays private; the wording "open-weights fallback via Ollama" for the AI fallback provider; and whether the AI features already run for beta users (the AI service\'s production status was not verified).',
  problem: {
    paragraphs: [
      "Filipino micro-businesses, from sari-sari (neighborhood) stores to home bakeries and resellers, still run on paper notebooks: sales tallies, the utang (store credit) list, stock counts and ingredient costs. Owners can't see their true profit after cost of goods, waste and overhead.",
      "Orders from suki (regular customers) arrive over chat, deliveries are arranged by hand, and mobile data is patchy. SME Panindio puts the whole business on the owner's phone, offline first, and connects it to the customers and riders the shop already relies on.",
    ],
    constraints: [
      'Works fully offline: the books live on the phone',
      'One install for the owner, the suki and the rider',
      'English and Tagalog, with pesos and 12% VAT done right',
    ],
  },
  features: [
    {
      id: 'owner-dashboard',
      title: 'Owner dashboard and a real P&L',
      body: 'Gross income, products sold, gross profit and cost of goods for any day, week, month or year. In-store and online sales merge into one profit and loss that ends in net profit after waste, utilities and overhead, all computed on the phone.',
      screen: replica('1.1', 'pnl'),
    },
    {
      id: 'pos',
      title: 'Point of sale with continuous scanning',
      body: 'A thumb-first product grid and a camera scanner where every scan adds a unit. Checkout takes cash with change, GCash, Maya, card or utang, with discount chips and 12% VAT, inclusive or exclusive. It works fully offline.',
      screen: replica('1.2', 'checkout'),
    },
    {
      id: 'credit-ledger',
      title: 'The utang notebook, digitized',
      body: 'Every customer has a standing: due, advance, fully paid or new. Debtors rank by amount owed, and the owner can give credit (including back-dated notebook entries), take payments with any overpayment kept as an advance, and follow a running balance per customer.',
      screen: replica('1.3', 'ledger'),
    },
    {
      id: 'storefront',
      title: 'A suki storefront with on-device ID checks',
      body: "Regular customers browse the shop's live catalog, save favorites and order. To unlock Pay Later they scan a Philippine ID: on-device text recognition fills in the fields for five ID families, then a selfie liveness step and the owner's approval follow.",
      screen: replica('1.4', 'storefront'),
    },
    {
      id: 'rider',
      title: 'Riders with 3D navigation and live tracking',
      body: 'Riders get a delivery list, full-screen 3D navigation on MapLibre with controls sized for gloved thumbs, and a hand-off to Waze, Google Maps or Apple Maps. Customers and the owner watch the same live map, where a road-snapped marker never guesses ahead.',
      screen: replica('1.5', 'tracking'),
    },
    {
      id: 'grounded-ai',
      title: "Grounded AI on top of the phone's numbers",
      body: 'An AI hub with a business insight, an executive report, restock advice, a 30-day forecast and an Ask AI chat. The phone computes every figure, the model only explains them, and each card still works offline with a computed sentence.',
      screen: replica('1.6', 'enhanced'),
    },
  ],
  specials: [
    {
      kind: 'ai',
      title: 'Numbers on the phone, words in the cloud',
      figures: ['1.6', '1.7', '1.8'],
      guardrails: [
        'One grounding contract for every prompt: use only the numbers in the snapshot.',
        'When data is missing, the model names what is missing instead of guessing.',
        "The owner's question is treated as a question, never as an instruction.",
        'Temperature 0.2, with input size caps checked on both servers.',
        'Answers in English or Tagalog, with peso amounts kept verbatim.',
      ],
      diagram: aiPipeline,
    },
  ],
  screens: [
    replica('1.1'),
    replica('1.2'),
    replica('1.3'),
    replica('1.4'),
    replica('1.5'),
    replica('1.6'),
    replica('1.7'),
    replica('1.8'),
  ],
  architecture: [system, backup],
  challenges: [
    {
      id: 'offline-backup',
      title: 'Offline books that survive a lost phone',
      problem:
        'Every sale, stock count and utang record lived only in on-device SQLite, so a reinstall or a new phone wiped the business. The till also had to keep selling while a backup ran over flaky mobile data.',
      did: 'I designed a one-way, replace-all backup protocol. SQLite triggers capture changes into an outbox, pushes read from a WAL snapshot so sales continue, and rows go up in idempotent chunks with backoff. The server commits everything in one generation-checked MySQL transaction, and restore applies a staged copy in a single SQLite transaction.',
      proof: 'A model-based property test proves the server converges to the device state, a failed restore leaves the phone untouched by construction, and 34 test files cover the backup.',
      flagship: true,
    },
    {
      id: 'ai-cannot-invent',
      title: "AI that can't invent your numbers",
      problem:
        'Owners wanted plain answers to "How is my business doing?", but the real figures exist only on the phone, language models get arithmetic wrong, and connectivity is unreliable.',
      did: 'All math stays deterministic and on the device: the combined in-store and online P&L, restock quantities and a least-squares forecast that never returns NaN or a negative. The app ships them as a labeled snapshot, and the prompts may only explain those numbers and must say what is missing instead of guessing.',
      proof: 'Tests run against a fake provider that records the exact prompt, asserting that the snapshot and the decline rule reach the model.',
    },
    {
      id: 'fee-formula',
      title: 'One fee formula, two runtimes, no drift',
      problem:
        'The customer sees a delivery-fee quote in the app, but the server charges it, in a different number format (pesos against integer centavos) and with fallbacks for when the routing quota runs out.',
      did: 'I wrote one canonical pricing spec: vehicle cost profile, round trips, a free radius from the smaller of the budget and profit caps, 2 km paid bands, and 0.1 km rounding so GPS jitter cannot flip a customer between bands. Both implementations are pinned to one shared fixture set.',
      proof: 'Either test suite fails if the two drift apart, and the pricing screen names the binding constraint, such as "Your monthly budget is the limit".',
    },
    {
      id: 'rider-marker',
      title: 'A rider marker that follows the road, honestly',
      problem:
        'Rider positions arrive every 8 to 15 seconds, so the bike marker teleported and cut corners, a straight-line fallback drew roads that do not exist, and the sky-blue route failed contrast on pale basemaps.',
      did: 'A pure motion module glides the marker along the trimmed route and never extrapolates past the last known fix. Stale pins keep their distance but drop the minutes, the straight-line fallback became a "Live position only" notice, and routes draw as two strokes based on WCAG contrast measurements.',
      proof: '28 delivery test files, including tests for the motion module, cover the behavior.',
    },
    {
      id: 'three-personas',
      title: 'Three personas in one binary, without leaks',
      problem:
        'The owner, the suki customer and the rider can share one install. Sessions, sockets, biometric sign-in, themes and notification badges must never cross between them.',
      did: 'Each route group sits behind a declarative guard, each persona gets its own realtime connection that tears down when the identity changes, and keychain slots are keyed by a record over the persona union.',
      proof: "A missing persona is now a compile error; the old ternary would have silently overwritten the customer's keychain entry with the rider's.",
    },
  ],
  metrics: [
    {
      id: 'route-screens',
      value: '64',
      label: 'route screens for the owner, customer and rider, plus sign-in and root screens',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'personas',
      value: '3',
      label: 'personas in one binary: owner, suki customer and rider',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'sqlite-migrations',
      value: '30',
      label: 'versioned SQLite migrations',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'test-cases',
      value: '~2,600',
      label: 'test cases across 139 test files',
      source: 'Counted from source in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'storybook-stories',
      value: '44',
      label: 'on-device Storybook stories',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'locale-keys',
      value: '~1,140',
      label: 'translation keys, in English and in Tagalog',
      source: 'Counted in the app repository',
      asOf: AS_OF,
    },
    {
      id: 'ai-endpoints',
      value: '6',
      label: 'grounded AI endpoints',
      source: 'Counted in the AI service repository',
      asOf: AS_OF,
    },
    {
      id: 'llm-providers',
      value: '5',
      label: 'interchangeable model providers',
      source: 'Counted in the AI service repository',
      asOf: AS_OF,
    },
    {
      id: 'ai-tests',
      value: '96',
      label: 'AI-service test functions, no network or keys needed',
      source: 'Counted from source in the AI service repository',
      asOf: AS_OF,
    },
  ],
  gaps: [
    "There's no output-side check yet that every number in an AI reply matches the phone's figures; the grounding contract is the main defense.",
    "The app's shared request timeout is shorter than a slow fallback answer; a separate, longer AI timeout is the documented next step.",
    "The server's AI proxy module has no tests of its own yet.",
  ],
  sections: ['overview', 'problem', 'built', 'ai', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
