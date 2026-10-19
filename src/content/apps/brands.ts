import type { Brand, BrandPalette, CitizenBrand, ResponderBrand } from '@/content/types';

/**
 * White-label brands: the single source of brand palettes (design §5.5; research citizen.json /
 * responder.json, hex values exactly as configured in the apps).
 *
 * Public-safe: Citizen marks are the public store icons (downloaded by
 * scripts/prepare-assets.mjs), never logo or seal files from the repos. Responder builds are
 * privately distributed, so they get a monogram. Brands that are not published are excluded
 * entirely.
 */

/** The default Citizen palette (Defensys SAFE). Smile SAFE Taytay ships it unchanged. */
const CITIZEN_DEFAULT: BrandPalette = {
  primary: '#085499',
  secondary: '#248ff3',
  accent: '#085499',
  titleInk: '#085499',
  lightText: '#93c6f6',
};

/** The default Responder palette. Header titles use secondary in every brand. */
const RESPONDER_DEFAULT: BrandPalette = {
  primary: '#0766be',
  secondary: '#248ff3',
  accent: '#0766be',
  titleInk: '#248ff3',
  lightText: '#93c6f6',
};

const DEFAULT_PALETTE_NOTE =
  'Ships the default Defensys palette: its own brand colours are still marked TODO in the white-label config.';

/** Store order for switchers and the Live card; Smile SAFE Taytay is the default selection. */
export const citizenBrands: readonly CitizenBrand[] = [
  {
    id: 'smile-safe-taytay',
    app: 'citizen',
    name: 'Smile SAFE Taytay',
    locality: 'Municipality of Taytay, Rizal',
    palette: CITIZEN_DEFAULT,
    icon: '/store/citizen/smile-safe-taytay/play-icon.webp',
    headerMark: { kind: 'icon' },
    isDefault: true,
  },
  {
    id: '1hope',
    app: 'citizen',
    name: '1Hope',
    locality: 'Barangay Bagong Pag-asa, Quezon City',
    palette: { primary: '#DF9830', secondary: '#f2b862', accent: '#8F5E10', titleInk: '#DF9830', lightText: '#ebe79b' },
    icon: '/store/citizen/1hope/play-icon.webp',
    headerMark: { kind: 'icon' },
  },
  {
    id: 'sjdm-app',
    app: 'citizen',
    name: 'SJDM App',
    locality: 'City of San Jose del Monte, Bulacan',
    palette: { primary: '#FC4F8F', secondary: '#ee9ebb', accent: '#D81B60', titleInk: '#FC4F8F', lightText: '#eea7c1' },
    icon: '/store/citizen/sjdm-app/play-icon.webp',
    headerMark: { kind: 'icon' },
  },
  {
    id: 'defensys-safe',
    app: 'citizen',
    name: 'Defensys SAFE',
    locality: 'Any LGU on the Defensys platform',
    palette: CITIZEN_DEFAULT,
    icon: '/store/citizen/defensys-safe/play-icon.webp',
    headerMark: { kind: 'icon' },
  },
  {
    id: 'safe-icb',
    app: 'citizen',
    name: 'SAFE ICB',
    locality: 'City of Isabela, Basilan',
    palette: CITIZEN_DEFAULT,
    icon: '/store/citizen/safe-icb/play-icon.webp',
    headerMark: { kind: 'icon' },
    confirm: DEFAULT_PALETTE_NOTE,
  },
  {
    id: 'aero-app',
    app: 'citizen',
    name: 'AERO App',
    locality: 'Municipality of Abra de Ilog, Occidental Mindoro',
    palette: CITIZEN_DEFAULT,
    icon: '/store/citizen/aero-app/play-icon.webp',
    headerMark: { kind: 'icon' },
    confirm: DEFAULT_PALETTE_NOTE,
  },
];

/** "4 brands + demo build": the demo build is not listed. Defensys is the default selection. */
export const responderBrands: readonly ResponderBrand[] = [
  {
    id: 'defensys',
    app: 'responder',
    name: 'Defensys',
    locality: 'Defensys platform build',
    palette: RESPONDER_DEFAULT,
    icon: null,
    monogram: 'DR',
    status: 'platform',
    isDefault: true,
  },
  {
    id: 'smile-taytay',
    app: 'responder',
    name: 'Smile Taytay',
    locality: 'Municipality of Taytay, Rizal',
    palette: RESPONDER_DEFAULT,
    icon: null,
    monogram: 'ST',
    status: 'deployed',
    confirm: "Confirm the Smile Taytay responder build is deployed to the LGU's responder team.",
  },
  {
    id: 'sjdm',
    app: 'responder',
    name: 'SJDM',
    locality: 'City of San Jose del Monte, Bulacan',
    palette: { primary: '#2e7d32', secondary: '#f9a825', accent: '#2e7d32', titleInk: '#f9a825' },
    icon: null,
    monogram: 'SJ',
    status: 'deployed',
    confirm: 'Confirm the SJDM responder deployment: the published SJDM builds came from a separate codebase.',
  },
  {
    id: 'bagong-pag-asa',
    app: 'responder',
    name: 'Bagong Pag-asa',
    locality: 'Barangay Bagong Pag-asa, Quezon City',
    palette: { primary: '#28a745', secondary: '#6c757d', accent: '#1e7e34', titleInk: '#6c757d' },
    icon: null,
    monogram: 'BP',
    status: 'in-setup',
    tag: 'In setup',
  },
];

export const brands: readonly Brand[] = [...citizenBrands, ...responderBrands];
