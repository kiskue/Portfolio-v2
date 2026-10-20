import type { Credential, Education } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * Education and credentials. The degree comes from V1; certifications are supplied later.
 *
 * Until real certifications exist, one Example item stands in. It comes first on purpose: the
 * Home credentials card shows the first visible credential (design §4.3), so label mode shows
 * the marked example and hide mode, which drops examples, falls back to the degree.
 */

/** BS Computer Science at Taguig City University (V1). profile.ts reuses this object. */
export const education: Education = {
  degree: 'BS Computer Science',
  school: 'Taguig City University',
  short: 'TCU',
  year: ph('YYYY'),
  confirm: 'Graduation year.',
};

export const credentials: readonly Credential[] = [
  {
    id: 'example-certification',
    example: true,
    kind: 'certification',
    title: ph('Certification name'),
    issuer: ph('Issuer'),
    year: ph('YYYY'),
    url: null,
    confirm: 'Add your real certifications (with a verification link where one exists), or delete this example.',
  },
  {
    id: 'bs-computer-science',
    kind: 'degree',
    title: education.degree,
    issuer: education.school,
    year: education.year,
    url: null,
  },
];
