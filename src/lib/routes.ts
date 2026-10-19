import type { Route } from 'next';
import type {
  CaseStudyPath,
  CaseStudySectionKey,
  CaseStudySlug,
  ContactTopic,
  ProjectContext,
  ProjectType,
  ServiceId,
} from '@/content/types';

/**
 * Typed internal links. Build hrefs here instead of concatenating strings in components, so a
 * renamed route or anchor fails the type check.
 */

/** /projects/<slug>, optionally at a section anchor. */
export function caseStudyHref(slug: CaseStudySlug, anchor?: CaseStudySectionKey): Route<CaseStudyPath> {
  return anchor ? `/projects/${slug}#${anchor}` : `/projects/${slug}`;
}

/** /contact, optionally preset to a topic (?topic=). */
export function contactHref(topic?: ContactTopic): Route {
  return topic ? `/contact?topic=${topic}` : '/contact';
}

export interface ProjectFilters {
  readonly type?: ProjectType;
  readonly context?: ProjectContext;
}

/** /projects with its URL-synced filters, always in the order type, then context. */
export function projectsHref(filters: ProjectFilters = {}): Route {
  const query = new URLSearchParams();
  if (filters.type) query.set('type', filters.type);
  if (filters.context) query.set('context', filters.context);
  const search = query.toString();
  return search ? `/projects?${search}` : '/projects';
}

/** /services, optionally at one service's block. */
export function servicesHref(service?: ServiceId): Route {
  return service ? `/services#${service}` : '/services';
}

export type AboutSection = 'experience' | 'skills' | 'credentials' | 'education';

/** /about, optionally at one of its sections. */
export function aboutHref(section?: AboutSection): Route {
  return section ? `/about#${section}` : '/about';
}
