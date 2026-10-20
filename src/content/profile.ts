import { education } from '@/content/credentials';
import type { Profile, Segments } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Who the site is about. Identity facts are from the V1 site (name, handle, location, email,
 * links, degree). Years of experience, the CV and a verified-credential link stay null until
 * supplied: label mode shows them as marked placeholders, hide mode omits them.
 */
export const profile: Profile = {
  name: 'Gerric Measco',
  handle: '@kiskue',
  title: 'Mobile & full-stack engineer',
  confirm:
    'Positioning title. V1 said "Frontend Developer"; the newer work (NestJS and FastAPI services, a native module, white-label release pipelines) supports "Mobile & full-stack engineer". Confirm it.',
  location: 'Taguig City, PH',
  timezone: 'GMT+8',
  email: 'gerricmeasco360@gmail.com',
  links: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/kiskue', glyph: { kind: 'si', icon: 'siGithub' } },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/gerric-measco-39a0a722a/',
      glyph: { kind: 'official', icon: 'linkedin' },
    },
    { id: 'email', label: 'Email Gerric', href: 'mailto:gerricmeasco360@gmail.com', glyph: { kind: 'icon', icon: 'mail' } },
  ],
  availability: {
    status: 'open',
    label: ph('Open to roles & projects'),
    confirm: 'Availability wording. V1 said "Open to frontend roles · Remote or Metro Manila".',
  },
  replyTime: ph('I reply within 1–2 business days'),
  yearsOfExperience: null,
  cvUrl: null,
  verifiedCredentialUrl: null,
  education,
  bio: [
    'I’m Gerric, a React Native and full-stack engineer in Taguig City, Metro Manila. I build mobile apps for moments when the connection can’t be trusted: a resident calling their local command center, a responder driving to a call on patchy signal, a shop owner closing the day’s books on one phone.',
    'At Dynamic Global Soft Inc. (DGSI) I build and maintain the Defensys Citizen mobile app, one white-label codebase published under several local-government brands. I also built the white-label Defensys Responder app for local-government emergency responders in the field.',
    'On my own time I build SME Panindio end to end: an offline-first business app for Filipino micro-businesses, the NestJS and FastAPI services behind it, and an AI layer that explains the owner’s real numbers instead of inventing them.',
  ],
  portraitAlt: 'Black-and-white portrait of Gerric Measco in a dark suit and tie, looking to one side against blurred city lights',
};

/*
 * Meta lines as segments (rendered joined by " · "), so hide mode drops a placeholder segment
 * without leaving a dangling separator.
 */

/** The Home meta row below 1280px (design §1): availability · location · time zone. */
export const availabilityLine: Segments = [profile.availability.label, profile.location, profile.timezone];

/** The contact card line (design §8): location · time zone · reply-time promise. */
export const contactLine: Segments = [profile.location, profile.timezone, profile.replyTime];
