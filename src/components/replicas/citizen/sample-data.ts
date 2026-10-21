/**
 * Defensys Citizen replicas: the ONE fictional dataset behind figures 2.1–2.6 (research
 * citizen.json `signatureScreens[].sampleData`). Every name, place and number is fictional
 * ("Sample …", "Brgy. Example"); no real person, address, phone number or host appears.
 *
 * Screens copy data-bearing strings from here and never retype them. Layout chrome (titles,
 * button labels, captions) also lives here when the shipped app prints it verbatim, so a copy
 * change is one edit.
 *
 * Reconciled timeline (the research samples contradict each other, as the SME ones did): "now"
 * is Monday, October 19 2026, 12:40 PM. The Flood report is 10:42 AM ("2 hours ago") in the
 * Today's Report row, the hazard list AND the map strip, which the research printed once as
 * 14:30 PM. The Fire report keeps 09:15 AM, so it is "3 hours ago" (research: 5), and the
 * 09:30 AM news story is "3 hours ago" (research: 2). The extra hazards and earthquakes that
 * fill the lists ("See More (3 more)", "3 recent event(s)") are generic fictional rows.
 */

/** Today in the replicas. */
export const czToday = {
  /** ModuleHeader subtitle and card dates (moment "MMMM DD, YYYY"). */
  long: 'October 19, 2026',
  /** Map strip date (moment "MMM DD"). */
  short: 'Oct 19',
} as const;

/** Header titles exactly as the shipped stack screens set them. */
export const czTitles = {
  home: 'Your one-stop-app for situational awareness',
  hazards: 'Hazard Monitoring',
  hazardModal: 'Hazard Report',
  createReport: 'Create Report',
} as const;

/** The floating tab bar: four tabs around the SOS slot (tabMeta.ts labels). */
export const czTabs = ['Home', 'Hotlines', 'Hazards', 'Reports'] as const;
export type CzTab = (typeof czTabs)[number];

// ─── 2.1 Home dashboard: weather station and Defensight safety brief ───────────────────

export const czStation = {
  name: 'Sample Weather Station 01',
  address: 'Brgy. Example, Sample City',
  status: 'Live',
  temperature: '31.4',
  heatIndexLine: 'Heat Index 38.2°C (est.)',
  aqi: 'Good',
  humidity: '74%',
  wind: { speed: '12.6', unit: 'km/h', direction: 'NE' },
} as const;

/** PAGASA heat-index bands (27–60°C on the bar), as the app draws them. */
export const czHeatIndex = {
  value: 38.2,
  label: '38.2°C',
  min: 27,
  max: 60,
  segments: [
    { flex: 5, color: '#ffff00', tick: '27°C' },
    { flex: 9, color: '#f1c232', tick: '33°C' },
    { flex: 10, color: '#ff6d01', tick: '42°C' },
    { flex: 9, color: '#ff0000', tick: '52°C+' },
  ],
  level: {
    label: 'Extreme Caution',
    bar: '#f1c232',
    advisory: 'Heat cramps and heat exhaustion possible. Continuing activity could result in heat stroke.',
  },
} as const;

/** Where the heat-index marker sits on the bar, in percent (the app's linear 27–60 scale). */
export function heatIndexPercent(value: number = czHeatIndex.value): number {
  const share = (value - czHeatIndex.min) / (czHeatIndex.max - czHeatIndex.min);
  return Math.round(Math.min(Math.max(share, 0), 1) * 10000) / 100;
}

/** The Defensight AI safety brief at severity 2 (orange accent #f97316). */
export const czBrief = {
  severity: 2,
  title: 'Safety Brief',
  languages: ['EN', 'FIL'],
  headline: 'Hot and humid this afternoon: limit time outdoors',
  body: 'The heat index is in the Extreme Caution band. Drink water often and rest in the shade between 11 AM and 3 PM.',
  tips: ['Check on elderly neighbors', 'Avoid strenuous outdoor work'],
  ask: 'Ask about conditions',
  disclaimer: 'AI summary of live sensor data, based on DOST-PAGASA & DENR thresholds. Always follow official advisories.',
} as const;

// ─── 2.2 Home feed and 2.5 hazards ─────────────────────────────────────────────────────

export type CzHazardKind = 'flood' | 'fire' | 'obstruction' | 'outage' | 'landslide';

export interface CzHazard {
  readonly kind: CzHazardKind;
  readonly type: string;
  readonly note: string;
  readonly distance: string;
  readonly time: string;
  readonly ago: string;
  /** The severity hue of the report's case type (fixed: never a brand colour). */
  readonly hue: string;
}

/** Today's hazard reports, newest first (Today's Report shows two, then "See More (3 more)"). */
export const czHazards: readonly CzHazard[] = [
  {
    kind: 'flood',
    type: 'Flood',
    note: 'Knee-deep water near the sample overpass',
    distance: '1.2 km',
    time: '10:42 AM',
    ago: '2 hours ago',
    hue: '#3B82F6',
  },
  {
    kind: 'fire',
    type: 'Fire',
    note: 'Smoke reported at a sample warehouse',
    distance: '3.4 km',
    time: '09:15 AM',
    ago: '3 hours ago',
    hue: '#EF4444',
  },
  {
    kind: 'obstruction',
    type: 'Road Obstruction',
    note: 'Fallen tree blocking one lane of a sample road',
    distance: '2.1 km',
    time: '08:05 AM',
    ago: '5 hours ago',
    hue: '#F59E0B',
  },
  {
    kind: 'outage',
    type: 'Power Outage',
    note: 'Lines down after strong winds in a sample barangay',
    distance: '4.8 km',
    time: '07:20 AM',
    ago: '5 hours ago',
    hue: '#8B5CF6',
  },
  {
    kind: 'landslide',
    type: 'Landslide',
    note: 'Loose soil on a sample hillside road',
    distance: '6.5 km',
    time: '06:45 AM',
    ago: '6 hours ago',
    hue: '#DC2626',
  },
];

/** "See More (3 more)": the reports beyond the first two. */
export const czMoreHazards = `See More (${czHazards.length - 2} more)`;

/** The Flood report opened on the map (2.5). */
export const czHazardDetail = {
  address: '123 Sample St., Brgy. Example, Sample City',
  meta: `Flood • ${czToday.short}, 10:42 AM`,
  chips: { hazard: 'Hazard: Flood', ago: 'about 2 hours ago', distance: '1.2 km from you' },
  pins: { hazard: 'Flood', you: 'Your Location' },
} as const;

export const czOnlineServices = {
  title: 'Online Services',
  subtitle: 'Access e-services, permits & transactions online.',
  action: 'Open',
} as const;

export const czAnnouncement = {
  eyebrow: 'Announcement',
  date: czToday.long,
  title: 'Sample Water Service Advisory',
  excerpt: 'Service will pause 9 AM–3 PM in Sample Barangay.',
} as const;

export interface CzQuake {
  readonly magnitude: string;
  /** PHIVOLCS-style label from the magnitude (Minor < 3 ≤ Light < 5). */
  readonly label: 'Minor' | 'Light';
  readonly place: string;
  readonly depth: string;
  readonly ago: string;
  readonly distance: string;
  /** Under an hour old: the red "!" badge. */
  readonly recent: boolean;
}

export const czQuakes: readonly CzQuake[] = [
  {
    magnitude: '4.3',
    label: 'Light',
    place: '12 km N of Sample Town (Sample Province)',
    depth: 'Depth: 10km',
    ago: '12 minutes ago',
    distance: '35.2 km',
    recent: true,
  },
  {
    magnitude: '3.6',
    label: 'Light',
    place: '21 km W of Sample Island (Sample Province)',
    depth: 'Depth: 14km',
    ago: '2 hours ago',
    distance: '88.4 km',
    recent: false,
  },
  {
    magnitude: '2.8',
    label: 'Minor',
    place: '6 km S of Sample Bay (Sample Province)',
    depth: 'Depth: 5km',
    ago: '5 hours ago',
    distance: '51.7 km',
    recent: false,
  },
];

export const czNews = {
  headline: 'Sample LGU opens new evacuation center ahead of rainy season',
  stamp: `${czToday.long} at 09:30 AM`,
  ago: '3 hours ago',
  link: 'Read full story',
} as const;

/** ModuleHeader rows on the Home feed (title, subtitle, action). */
export const czModules = {
  today: { title: "Today's Report", subtitle: czToday.long, action: 'View More' },
  quakes: { title: 'Earthquake Monitor', subtitle: `${czQuakes.length} recent event(s)`, action: 'View More' },
  news: { title: 'News Headline', subtitle: 'Read news headline to stay updated', action: 'View More' },
} as const;

// ─── 2.3 SOS ───────────────────────────────────────────────────────────────────────────

export const czSos = {
  label: 'SOS',
  title: 'Emergency Call',
  subtitle: 'SOS call will be initiated',
  body: 'Are you sure you want to place an emergency call? This action will alert emergency services. If this was triggered by mistake, please cancel before the countdown ends.',
  timerLabel: 'Auto-confirming in',
  /** The countdown starts here and auto-confirms at 0. */
  seconds: 5,
  cancel: 'Cancel',
  confirm: 'Confirm Call',
  footer: 'Emergency services will be contacted if timer expires',
  offline: 'You are offline',
} as const;

// ─── 2.4 Live call ─────────────────────────────────────────────────────────────────────

/** The queue line the app prints for a 1-based server position (callHelpers getQueueLabel). */
export function czQueueLine(position: number): string {
  const ahead = Math.floor(position) - 1;
  return ahead < 1 ? 'Finding available agent…' : `You are now #${ahead} in queue`;
}

export const czCall = {
  title: 'Command Center Agent',
  agent: 'Dispatcher 07',
  /** The server's 1-based queue position. */
  queuePosition: 3,
  queueCaption: 'Queue Position',
  status: {
    queue: 'In queue',
    calling: 'Calling Dispatcher 07',
    connecting: 'Connecting… to Dispatcher 07',
    connected: 'Connected to Dispatcher 07',
  },
} as const;

// ─── 2.6 Report incident ───────────────────────────────────────────────────────────────

export const czReport = {
  title: 'Report Incident',
  subtitle: 'Help us respond quickly and effectively',
  submit: 'Submit Report',
  live: 'Live Location',
  /** The map marker's title. */
  pin: 'Current Location',
  locationLabel: 'INCIDENT LOCATION',
  address: 'Lot 1, Sample Road, Brgy. Example, Sample City',
  refresh: 'Refresh',
  latitude: '14.000000',
  longitude: '121.000000',
  details: 'Incident Details',
  caseType: { label: 'Case Type', value: 'Vehicular Accident' },
  injury: { label: 'Injury Status', value: 'Without Injury' },
  description: {
    label: 'Description',
    value: 'Two cars collided at the sample intersection; no injuries reported.',
    placeholder: 'Describe what happened, when, and any other relevant details...',
  },
  photos: { title: 'Evidence Photos', subtitle: 'Optional • Helps us assess the situation', gallery: 'Gallery', camera: 'Camera' },
  info: 'Your report helps emergency services respond faster. All information is treated confidentially.',
} as const;
