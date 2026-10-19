// STUB — owned by W2, replaced in wave 1
import type { Profile } from '@/content/types';
import { ph } from '@/lib/placeholder';

/** Identity from V1 (D:/Projects/Profile/src/data/profile.ts). */
export const profile: Profile = {
  name: 'Gerric Measco',
  handle: '@kiskue',
  title: 'Mobile & full-stack engineer',
  confirm: 'Positioning title: V1 said "Frontend Developer". Confirm "Mobile & full-stack engineer".',
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
  availability: { status: 'open', label: ph('Open to roles & projects') },
  replyTime: ph('I reply within 1–2 business days'),
  yearsOfExperience: null,
  cvUrl: null,
  verifiedCredentialUrl: null,
  education: { degree: 'BS Computer Science', school: 'Taguig City University', short: 'TCU', year: ph('YYYY') },
  bio: ["I'm Gerric, a React Native and full-stack engineer in Metro Manila."],
  portraitAlt: 'Black-and-white portrait of Gerric Measco',
};
