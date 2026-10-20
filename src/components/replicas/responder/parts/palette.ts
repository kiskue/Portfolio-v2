/*
 * Defensys Responder colours that never follow the brand (research responder.json
 * `designTokens`; hex as shipped). Brand colours come only through the --app-* bridge
 * (rBrand.primary / secondary / accent / titleInk); these are the fixed surfaces: the dispatch
 * sheet, proximity zones, duty states, map chrome, alert severity and the dark call palette.
 * responder.css repeats the few that its rules need.
 */

/** The dispatch sheet and map controls (hard-coded navy and signal cyan in every brand). */
export const DISPATCH = {
  navy: '#085499',
  cyan: '#33CCFF',
  live: '#f87171',
  danger: '#ef4444',
  /** Toolbar tiles: the Chat and Call glyphs once a ticket is accepted. */
  chat: '#5685b0',
  call: '#2e6f40',
  disabled: '#9ca3af',
} as const;

/** Proximity zones by straight-line distance to the scene (FAR > 500 m ≥ CLOSE > 100 m ≥ NEAR > 20 m ≥ ON SITE). */
export const ZONES = {
  far: { label: 'FAR', sublabel: 'Distance critical', color: '#f87171' },
  close: { label: 'CLOSE', sublabel: 'En route', color: '#fb923c' },
  near: { label: 'NEAR', sublabel: 'Approaching scene', color: '#fbbf24' },
  onSite: { label: 'ON SITE', sublabel: 'You have arrived', color: '#34d399' },
} as const;

export type ZoneKey = keyof typeof ZONES;

/** The zone for a straight-line distance in metres (the app's getZone thresholds). */
export function zoneFor(distance: number): ZoneKey {
  if (distance <= 20) return 'onSite';
  if (distance <= 100) return 'near';
  if (distance <= 500) return 'close';
  return 'far';
}

/** Duty chip: the dot shows the live connection, the switch shows the responder's intent. */
export const DUTY = {
  online: { label: "You're Online", dot: '#22c55e', on: true },
  connecting: { label: 'Connecting…', dot: '#fbbf24', on: true },
  offline: { label: "You're Offline", dot: '#9ca3af', on: false },
} as const;

export type DutyStatus = keyof typeof DUTY;

/** Map chrome: the location-sharing warning ink, muted glyphs and the fellow-responder pins. */
export const MAP_CHROME = {
  meta: '#475569',
  warn: '#b45309',
  peer: '#16a34a',
} as const;

/** Public alert severity fills (shared with the Citizen apps). */
export const ALERT_SEVERITY = {
  Warning: { fill: '#FBBF24', ink: '#1C1917' },
} as const;

/**
 * The fixed dark palette of calls and the incident room (the same for every brand). The
 * surfaces, glass and text tints are in responder.css; these feed component props.
 */
export const CALL = {
  live: '#34D399',
  /** The Agent role colour (Department callers use #FBBF24, responders #A78BFA). */
  accent: '#60A5FA',
  danger: '#F43F5E',
  text2: 'rgba(255,255,255,0.72)',
  /** Incident-room participant avatars. */
  participants: ['#3B82F6', '#10B981'],
} as const;

/** Channels: the live-call chip and the recording dot. */
export const CHANNEL = {
  live: '#166534',
  danger: '#c62828',
} as const;
