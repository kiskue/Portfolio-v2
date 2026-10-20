import type { Project } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Every project card: the three case studies (their slugs are referenced by the case studies, so
 * never rename them), then the "More work" grid, then work that is not shown yet.
 *
 * - Company work names the company and my ownership; my job title and dates are placeholders.
 * - Unknown facts are whole-field placeholders with a confirm note; nothing is guessed.
 * - A `statusLabel` that is a placeholder (Citizen Web) means the status itself is unconfirmed:
 *   render that status line without its shape (label mode) or not at all (hide mode).
 * - V1's AI-generated images and its placeholder links are never reused. More-work cards use an
 *   icon tile instead.
 */

/** Shared note for the three V1 web projects, whose context, year and role are unknown. */
const V1_PROJECT_CONFIRM =
  'V1 project. V1 described ERP and video-consultation work as part of your current job, so it is filed as company work. Confirm the company or client, the year, your role and ownership, and that it shipped.';

const caseStudyProjects: readonly Project[] = [
  {
    slug: 'sme-panindio',
    title: 'SME Panindio',
    summary:
      'An offline-first business app for Filipino micro-businesses: point of sale, inventory, an utang (store credit) ledger and real profit, with a storefront for suki (regular customers) and a rider app built in.',
    context: 'personal',
    role: 'Solo: product, design, mobile, backend and AI',
    ownership: 'sole',
    types: ['mobile', 'ai'],
    status: 'beta',
    statusLabel: 'Private beta',
    stack: ['React Native', 'Expo', 'TypeScript', 'SQLite', 'Socket.IO', 'NestJS', 'FastAPI', 'MySQL'],
    icon: 'store',
    links: [{ kind: 'case-study', slug: 'sme-panindio' }],
    period: 'Dec 2025 – present',
    caseStudy: 'sme-panindio',
    app: 'sme',
    confirm: 'The timeline comes from git history (first commit Dec 2025). Confirm it.',
  },
  {
    slug: 'defensys-citizen',
    title: 'Defensys Citizen',
    summary:
      'A white-label public-safety app for Philippine local governments, published under each one’s own brand: one-tap SOS video calls to the command center, geotagged reports and live hazard alerts.',
    context: 'company',
    company: 'DGSI',
    role: ph('Your title at DGSI'),
    ownership: 'primary',
    types: ['mobile', 'ai'],
    status: 'live',
    statusLabel: 'Live on Google Play and the App Store',
    stack: ['React Native', 'Expo', 'WebRTC', 'Socket.IO', 'TypeScript', 'TanStack Query', 'Zustand', 'NativeWind'],
    icon: 'shield-check',
    links: [{ kind: 'case-study', slug: 'defensys-citizen' }],
    period: ph('YYYY – present'),
    caseStudy: 'defensys-citizen',
    app: 'citizen',
    confirm:
      'Your DGSI title and start date. Your earliest DGSI commits in the inspected repos are from Apr 2025 (Citizen Web); the white-label Citizen codebase starts in Sep 2025 and the v1 apps in Sep 2024. Did you work on the v1 apps (2024–25)?',
  },
  {
    slug: 'defensys-responder',
    title: 'Defensys Responder',
    summary:
      'The field app for local-government emergency responders: live dispatch, road navigation, push-to-talk and video with the command center, built to keep working on patchy signal.',
    context: 'company',
    company: 'DGSI',
    role: ph('Your title at DGSI'),
    ownership: 'primary',
    types: ['mobile'],
    status: 'live',
    statusLabel: 'Private distribution',
    stack: ['React Native', 'Expo', 'Socket.IO', 'WebRTC', 'SQLite', 'TypeScript', 'TanStack Query', 'Zustand'],
    icon: 'radio',
    links: [{ kind: 'case-study', slug: 'defensys-responder' }],
    period: ph('YYYY – present'),
    caseStudy: 'defensys-responder',
    app: 'responder',
    confirm:
      'Your DGSI title and start date, and that the app is deployed to at least one LGU responder team (the card shows it as live, in private distribution). You are the only committer in the white-label Responder codebase: if nobody else worked on the app, change ownership to "sole".',
  },
];

const moreWork: readonly Project[] = [
  {
    slug: 'defensys-citizen-web',
    title: 'Defensys Citizen Web',
    summary:
      'The browser version of the citizen app for Barangay Bagong Pag-asa in Quezon City: emergency calls to the command center, reports, Sumbong (citizen complaints), hazards and news.',
    context: 'company',
    company: 'DGSI',
    role: 'The rebrand, the Sumbong module and a UI rework',
    ownership: 'contributor',
    types: ['web'],
    status: 'live',
    statusLabel: ph('Status to confirm'),
    stack: ['React', 'Redux Toolkit', 'Ant Design', 'Tailwind CSS', 'Socket.IO', 'WebRTC (PeerJS)', 'Leaflet'],
    icon: 'globe',
    links: [{ kind: 'site', href: ph('Citizen Web URL'), label: 'Visit the site' }],
    period: 'Apr – May 2025',
    confirm:
      'Status and URL. Nothing public shows Citizen Web is live, so its status line is a placeholder: confirm the status (and add the URL), or hide the card. Dates are from git (Apr–May 2025).',
  },
  {
    slug: 'eventbook-exhibitors',
    title: 'Eventbook Exhibitors',
    summary:
      'A mobile app for event exhibitors: capture attendee details at the booth instead of business cards and paper logbooks, then track leads and booth traffic.',
    context: 'company',
    company: 'DGSI',
    role: ph('Your role on Eventbook Exhibitors'),
    ownership: 'collaborator',
    types: ['mobile'],
    status: 'live',
    statusLabel: 'Live on Google Play and the App Store',
    stack: ['React Native', 'Expo', 'SQLite', 'TanStack Query', 'Redux', 'NativeWind'],
    icon: 'calendar',
    links: [
      { kind: 'store-page', platform: 'play', href: 'https://play.google.com/store/apps/details?id=com.eventbook.exhibitor' },
      { kind: 'store-page', platform: 'appstore', href: 'https://apps.apple.com/ph/app/eventbook-exhibitors/id6736825449' },
    ],
    period: ph('YYYY'),
    confirm:
      'Published by DGSI on both stores (last updated Nov 2024); V1 listed you as a collaborator. Confirm your role and the year you worked on it.',
  },
  {
    slug: 'jp-live-subtitles',
    title: 'JP Live Subtitles',
    summary:
      'A Chrome extension that listens to a tab’s Japanese audio and shows live English or Tagalog subtitles over the video. It’s free, needs no API keys and works with Bluetooth earphones.',
    context: 'personal',
    role: 'Solo',
    ownership: 'sole',
    types: ['ai', 'web'],
    status: 'prototype',
    statusLabel: 'Prototype',
    stack: ['Chrome MV3', 'Web Speech API', 'JavaScript', 'node:test', 'Puppeteer'],
    icon: 'captions',
    links: [{ kind: 'repo', href: ph('Repo URL, once public'), label: 'Source on GitHub' }],
    period: 'Oct 2026',
    confirm: 'The repo has no remote yet: publish it and replace the placeholder link, or remove the link. Built in Oct 2026 (git).',
  },
  {
    slug: 'dynamic-data-analytics',
    title: 'Dynamic Data Analytics System',
    summary:
      'A Next.js app that reads CSV, Excel and ZIP uploads, infers each column’s type, compiles the analyses you define into a typed query and draws the results as charts.',
    context: 'personal',
    role: 'Solo',
    ownership: 'sole',
    types: ['web'],
    status: 'building',
    statusLabel: 'Building',
    stack: ['Next.js', 'TypeScript', 'Zod', 'TanStack Query', 'Recharts', 'Vitest'],
    icon: 'chart-column',
    links: [{ kind: 'repo', href: ph('Repo URL, once public'), label: 'Source on GitHub' }],
    period: 'Nov 2025 – present',
    confirm:
      'Make the repo public before it is linked, then replace the placeholder link. Started in Nov 2025 (git); most of the newer engine work is not committed yet.',
  },
  {
    slug: 'responder-ptt',
    title: 'Responder PTT native module',
    summary:
      'R&D for the Responder app: a Kotlin Expo Module that catches a handset’s hardware push-to-talk button, even with the app in the background.',
    context: 'company',
    company: 'DGSI',
    role: 'Native module R&D',
    ownership: 'rnd',
    types: ['mobile'],
    status: 'prototype',
    statusLabel: 'R&D prototype',
    stack: ['Kotlin', 'Expo Modules API', 'React Native', 'TypeScript'],
    icon: 'mic',
    links: [],
    period: 'May 2026',
    confirm: 'DGSI R&D: confirm it’s OK to show. Dates are from git (May 2026).',
  },
  {
    slug: 'brilliant-erp',
    title: 'Brilliant ERP',
    summary:
      'A web ERP for a skincare brand: role-based accounts, purchase orders with signatory approvals, and machine maintenance across several warehouses.',
    context: 'company',
    company: ph('Company or client'),
    role: ph('Your role'),
    ownership: 'contributor',
    types: ['web'],
    status: 'live',
    statusLabel: 'Shipped',
    stack: ['React', 'Node.js', 'Express', 'MySQL', 'Socket.IO', 'Zustand', 'TanStack Query', 'Ant Design'],
    icon: 'briefcase',
    links: [],
    period: ph('YYYY'),
    confirm: V1_PROJECT_CONFIRM,
  },
  {
    slug: 'brilliant-virtual-id',
    title: 'Brilliant Virtual ID',
    summary: 'A web system that issues dynamic digital ID cards to a skincare brand’s members, from distributors to resellers.',
    context: 'company',
    company: ph('Company or client'),
    role: ph('Your role'),
    ownership: 'contributor',
    types: ['web'],
    status: 'live',
    statusLabel: 'Shipped',
    stack: ['React', 'Node.js', 'Express', 'MySQL', 'Zustand', 'TanStack Query', 'Ant Design'],
    icon: 'id-card',
    links: [],
    period: ph('YYYY'),
    confirm: V1_PROJECT_CONFIRM,
  },
  {
    slug: 'telemedicine',
    title: 'Telemedicine',
    summary:
      'Online consultations over video: patients book a doctor, doctors can present built-in medical tests during the call, and patients receive their medical certificates on the platform.',
    context: 'company',
    company: ph('Company or client'),
    role: ph('Your role'),
    ownership: 'contributor',
    types: ['web'],
    status: 'live',
    statusLabel: 'Shipped',
    stack: ['React', 'WebRTC (PeerJS)', 'Socket.IO', 'Zustand', 'TanStack Query', 'Ant Design'],
    icon: 'stethoscope',
    links: [],
    period: ph('YYYY'),
    confirm: V1_PROJECT_CONFIRM,
  },
];

/** Never rendered (`hidden: true`) until confirmed or ready. */
const notShownYet: readonly Project[] = [
  {
    slug: 'command-center-room-video',
    hidden: true,
    title: 'Command Center room video conferencing',
    summary: 'Room video calls between command-center agents and field responders during an emergency.',
    context: 'company',
    company: 'DGSI',
    role: ph('Your role on the room video feature'),
    ownership: 'contributor',
    types: ['web'],
    status: 'live',
    statusLabel: ph('Status to confirm'),
    stack: ['React', 'WebRTC (PeerJS)', 'Socket.IO', 'Redux'],
    icon: 'video',
    links: [],
    period: ph('YYYY'),
    confirm:
      'V1 claim, hidden until you confirm where this work lives: the research found few of your commits in the command-center repositories.',
  },
  {
    slug: 'expo-boilerplate',
    hidden: true,
    title: 'Enterprise Expo RN Boilerplate',
    summary:
      'An MIT-licensed Expo and TypeScript starter with auth, onboarding, protected routes, notifications, atomic-design components and on-device Storybook.',
    context: 'personal',
    role: 'Solo',
    ownership: 'sole',
    types: ['tooling', 'mobile'],
    status: 'building',
    statusLabel: 'Starter',
    stack: ['Expo', 'TypeScript', 'Zustand', 'TanStack Query', 'Storybook', 'Jest'],
    icon: 'code',
    links: [],
    period: 'Dec 2025',
    confirm: 'Hidden: still thin (one story; the test and CI folders are empty). Show it in a starters row once it has more.',
  },
  {
    slug: 'taglish-transcriber',
    hidden: true,
    title: 'Taglish Transcriber',
    summary:
      'A Windows tool that turns Tagalog, English and Taglish recordings into clean-verbatim transcripts, with swappable speech-to-text engines picked by a measured accuracy test.',
    context: 'personal',
    role: 'Solo',
    ownership: 'sole',
    types: ['ai'],
    status: 'building',
    statusLabel: 'In design',
    stack: ['Python', 'Pydantic', 'SQLite', 'ffmpeg', 'pytest'],
    icon: 'file-text',
    links: [],
    period: 'Oct 2026',
    confirm: 'Hidden until milestone M1 ships (design docs and a plan so far, no code yet).',
  },
];

export const projects: readonly Project[] = [...caseStudyProjects, ...moreWork, ...notShownYet];
